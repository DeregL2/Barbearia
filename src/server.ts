import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt, { hash } from 'bcrypt';
import { join } from '@prisma/client/runtime/library';

// 1. Iniciamos a conexao com o banco
const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// 2. Configuracoes padrao (JSON e CORS)
app.use(express.json());
app.use(cors());

// 3. Rota de Teste para ver se tudo funciona
app.get('/', (req, res) => {
    res.send('💈 API da Barbearia V2 (com Banco de Dados) está rodando!');
});

// 4. Ligar o servidor
async function main() {
    // Tenta conectar no banco antes de ligar o servidor
    try {
        await prisma.$connect();
        console.log('📦 Banco de Dados conectado com sucesso!');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });
    }

    catch (error) {
        console.error('Erro ao conectar no banco', error);
    }
}

app.post('/register', async (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    try {
        // 1. Verificar se usuario ja existe no banco
        const usuarioExiste = await prisma.user.findUnique({
            where: { email: email }
        });

        if (usuarioExiste) {
            return res.status(409).json({ erro: "Email ja cadastrado" });
        }

        // 2. Criptografar a senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // 3. Salvar no Banco de Dados
        const novoUsuario = await prisma.user.create({
            data: {
                nome: nome,
                email: email,
                senha: senhaCriptografada,
                tipo: "cliente"
            }
        });

        return res.status(201).json(novoUsuario);
    }

    catch (error) {
        return res.status(500).json({ erro: "Erro ao cadastrar usuário" });
    }
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    //1. Tenta achar o usuario no banco pelo email
    const usuario = await prisma.user.findUnique({
        where: { email: email }
    });

    //2. Se não achou ninguém com esse email, retorna erro
    if (!usuario) {
        return res.status(401).json({
            erro: "Email ou senha invalidos"
        });
    }

    //3. Verifica se a senha bate (compara a senha digitada com a criptografada)
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
        return res.status(401).json({ erro: "Email ou senha invalidos" });
    }

    // 4. Se chegou aqui, deu tudo certo! Devolve os dados do usuário
    return res.json({
        mensagem: "Login realizado com sucesso",
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        }
    });

});

// 1. Rota para Listar Barbeiros
app.get("/barbeiros", async (req, res) => {
    // Busca no banco todos os usuarios onde tipo e "barbeiro"
    const barbeiros = await prisma.user.findMany({
        where: { tipo: "barbeiro" },
        select: { id: true, nome: true, email: true }
    });

    return res.json(barbeiros);
});

// 2. Rota para ver disponibilidade (Lógica adaptada para o campo String do Schema)
app.get("/disponibilidade/:barbeiroId/:data", async (req, res) => {
    const { barbeiroId, data } = req.params;

    // Busca disponibilidade no banco
    const disponibilidade = await prisma.disponibilidade.findFirst({
        where: {
            barbeiroId: parseInt(barbeiroId),
            data: data
        }
    });

    // Se nao achar nada no banco, retorna array vazio
    if (!disponibilidade) {
        return res.json({ horarios: [] });
    }

    // O banco salva como String ("09:00,10:00"), mas o front espera Array ["09:00", "10:00"]
    // O split(',') transforma a string em array
    const listaHorarios = disponibilidade.horarios.split(",");

    return res.json({ horarios: listaHorarios });
});

// 3. Rota de Agendamento
app.post("/agendar", async (req, res) => {
    const { clienteId, barbeiroId, data, horario } = req.body;

    try {

        // Verifica se O CLIENTE já tem agendamento nesta data (independente do horário)
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: {
                clienteId: clienteId,
                data: data
            }
        });

        if (agendamentoExistente) {
            return res.status(400).json({
                erro: "Você já possui um corte agendado para este dia!"
            });
        }

        // A. Verifica se a disponibilidade existe
        const disponibilidade = await prisma.disponibilidade.findFirst({
            where: {
                barbeiroId: barbeiroId,
                data: data
            }
        });

        if (!disponibilidade) {
            return res.status(400).json({ erro: "Agenda não encontrada para este dia." });
        }

        // B. Verifica se o horário está na lista (convertendo a string do banco para array)
        let horariosArray = disponibilidade.horarios.split(',');

        if (!horariosArray.includes(horario)) {
            return res.status(400).json({ erro: "Horário indisponível ou já reservado." });
        }

        // C. Transação: Cria o agendamento E remove o horário da disponibilidade
        // Isso garante que ninguém marque o mesmo horário ao mesmo tempo
        await prisma.$transaction(async (tx) => {
            // 1. Cria o agendamento
            await tx.agendamento.create({
                data: {
                    data,
                    horario,
                    clienteId,
                    barbeiroId
                }
            });

            // 2. Remove o horário da lista
            const novosHorarios = horariosArray.filter(h => h !== horario);
            const novosHorariosString = novosHorarios.join(',');

            // 3. Atualiza a tabela de disponibilidade
            await tx.disponibilidade.update({
                where: { id: disponibilidade.id },
                data: { horarios: novosHorariosString }
            });
        });

        return res.status(201).json({ mensagem: "Agendamento realizado com sucesso!" })

    }

    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro ao realizar agendamento." });
    }

});

// 4. Rota para o Barbeiro ver seus agendamentos (Dashboard)
app.get('/ver-agendamentos', async (req, res) => {
    // O 'include' pede para o Prisma trazer também os dados da tabela User (cliente)
    const agendamentos = await prisma.agendamento.findMany({
        include: {
            cliente: {
                select: { nome: true, email: true } // Traz só o nome e email, não a senha!
            }
        }
    });

    res.json(agendamentos);
});

// 5. Rota para o Barbeiro cadastrar disponibilidade (Abrir Agenda)
app.post("/disponibilidade", async (req, res) => {
    const { barbeiroId, data, horarios } = req.body;

    // Validacao Basica
    if (!barbeiroId || !data || !horarios){
        return res.status(400).json({erro: "Dados Incompletos "});
    }

    try {
        // Verifica se já existe agenda para esse dia
        const disponibilidadeExistente = await prisma.disponibilidade.findFirst({
            where: {
                barbeiroId: parseInt(barbeiroId),
                data: data
            }
        });

        if (disponibilidadeExistente){
            // Se já existe, atualizamos os horários (sobrescreve)
            await prisma.disponibilidade.update({
                where: {id: disponibilidadeExistente.id},
                data: {horarios: horarios}
            });
            return res.json({ mensagem: "Agenda atualizada com sucesso!" })
        }

        // Se nao existe, cria do zero
        await prisma.disponibilidade.create({
            data: {
                barbeiroId: parseInt(barbeiroId),
                data: data,
                horarios: horarios
            }
        });

        return res.status(201).json({mensagem: "Agenda aberta com sucesso!"});
    }

    catch (error) {
        console.error(error);
        return res.status(500).json({erro: "Erro ao criar disponibilidade."})
    }
});

// server.ts - Atualização na rota de registro

app.post('/admin/register-barber', async (req, res) => {
    // Adicionamos descricao e preco na desestruturação
    const { nome, email, senha, tipo, descricao, preco } = req.body;

    try {
        const usuarioExiste = await prisma.user.findUnique({
            where: { email: email }
        });

        if (usuarioExiste) {
            return res.status(409).json({ erro: "Email já cadastrado" });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Define o tipo. Se o frontend mandar "barbeiro", aceita. 
        // OBS: Num app real, teríamos uma verificação se quem está pedindo é Admin.
        // Para o MVP, vamos confiar no envio do front.
        const tipoUsuario = tipo || "cliente"; 

        const novoUsuario = await prisma.user.create({
            data: {
                nome,
                email,
                senha: senhaCriptografada,
                tipo: tipoUsuario,
                // Salva os campos opcionais (se vierem nulos, o banco aceita pois pusemos 'String?')
                descricao: tipoUsuario === 'barbeiro' ? descricao : null,
                preco: tipoUsuario === 'barbeiro' ? parseFloat(preco) : null
            }
        });

        return res.status(201).json(novoUsuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro ao cadastrar usuário" });
    }
});

main()