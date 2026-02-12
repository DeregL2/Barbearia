import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// --- ROTA DE TESTE ---
app.get('/', (req, res) => {
    res.send('💈 API da Barbearia V2 (Preço Global) está rodando!');
});

// --- ROTAS DE CONFIGURAÇÃO (PREÇO GLOBAL) ---
// 1. Pega o preço atual (COM A CORREÇÃO "ANY")
app.get("/configuracao", async (req, res) => {
    try {
        // Usamos (prisma as any) para ignorar o erro visual do TypeScript
        const config = await (prisma as any).configuracao.findUnique({
            where: { id: 1 }
        });
        // Retorna o do banco ou um padrão de segurança
        return res.json(config || { precoCorte: 40.00, precoSinal: 20.00 });
    } catch (error) {
        return res.json({ precoCorte: 40.00, precoSinal: 20.00 });
    }
});

// 2. Atualiza o preço (COM A CORREÇÃO "ANY")
app.post("/admin/configuracao", async (req, res) => {
    const { novoPreco, novoSinal } = req.body;

    try {
        const configAtualizada = await (prisma as any).configuracao.upsert({
            where: { id: 1 },
            update: {
                precoCorte: parseFloat(novoPreco),
                precoSinal: parseFloat(novoSinal)
            },
            create: {
                id: 1,
                precoCorte: parseFloat(novoPreco),
                precoSinal: parseFloat(novoSinal)
            }
        });
        return res.json({ mensagem: "Preços atualizados com sucesso!", config: configAtualizada });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro ao atualizar preços." });
    }
});

// --- ROTAS DE USUÁRIO ---

app.post('/register', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const usuarioExiste = await prisma.user.findUnique({ where: { email } });
        if (usuarioExiste) return res.status(409).json({ erro: "Email já cadastrado" });

        const senhaCriptografada = await bcrypt.hash(senha, 10);
        const novoUsuario = await prisma.user.create({
            data: {
                nome,
                email,
                senha: senhaCriptografada,
                tipo: "cliente"
            }
        });
        return res.status(201).json(novoUsuario);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao cadastrar usuário" });
    }
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    const usuario = await prisma.user.findUnique({ where: { email } });

    if (!usuario) return res.status(401).json({ erro: "Email ou senha invalidos" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ erro: "Email ou senha invalidos" });

    return res.json({
        mensagem: "Login realizado",
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        }
    });
});

// --- ROTA DE BARBEIROS ---
app.get("/barbeiros", async (req, res) => {
    const barbeiros = await prisma.user.findMany({
        where: { tipo: "barbeiro" },
        select: { 
            id: true, 
            nome: true, 
            email: true, 
            descricao: true, 
            fotoUrl: true
        }
    });
    return res.json(barbeiros);
});

// --- ROTA DE CADASTRO DE BARBEIRO (ADMIN) ---
app.post('/admin/register-barber', async (req, res) => {
    const { nome, email, senha, descricao } = req.body;

    try {
        const usuarioExiste = await prisma.user.findUnique({ where: { email } });
        if (usuarioExiste) return res.status(409).json({ erro: "Email já cadastrado" });

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const novoUsuario = await prisma.user.create({
            data: {
                nome,
                email,
                senha: senhaCriptografada,
                tipo: "barbeiro",
                descricao: descricao || null
            }
        });

        return res.status(201).json(novoUsuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro ao cadastrar barbeiro" });
    }
});

// --- ROTAS DE AGENDAMENTO ---

app.get("/disponibilidade/:barbeiroId/:data", async (req, res) => {
    const { barbeiroId, data } = req.params;
    const disponibilidade = await prisma.disponibilidade.findFirst({
        where: { barbeiroId: parseInt(barbeiroId), data }
    });
    if (!disponibilidade) return res.json({ horarios: [] });
    return res.json({ horarios: disponibilidade.horarios.split(",") });
});

app.post("/disponibilidade", async (req, res) => {
    const { barbeiroId, data, horarios } = req.body;
    try {
        const existente = await prisma.disponibilidade.findFirst({
            where: { barbeiroId: parseInt(barbeiroId), data }
        });

        if (existente) {
            await prisma.disponibilidade.update({
                where: { id: existente.id },
                data: { horarios }
            });
        } else {
            await prisma.disponibilidade.create({
                data: { barbeiroId: parseInt(barbeiroId), data, horarios }
            });
        }
        return res.status(201).json({ mensagem: "Agenda atualizada!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao salvar agenda." });
    }
});

app.post("/agendar", async (req, res) => {
    const { clienteId, barbeiroId, data, horario } = req.body;

    try {
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: { clienteId, data }
        });
        if (agendamentoExistente) {
            return res.status(400).json({ erro: "Você já tem um corte neste dia!" });
        }

        const disponibilidade = await prisma.disponibilidade.findFirst({
            where: { barbeiroId, data }
        });

        if (!disponibilidade) return res.status(400).json({ erro: "Agenda não encontrada." });

        let horariosArray = disponibilidade.horarios.split(',');
        if (!horariosArray.includes(horario)) {
            return res.status(400).json({ erro: "Horário indisponível." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.agendamento.create({
                data: { data, horario, clienteId, barbeiroId }
            });

            const novosHorarios = horariosArray.filter(h => h !== horario).join(',');
            await tx.disponibilidade.update({
                where: { id: disponibilidade.id },
                data: { horarios: novosHorarios }
            });
        });

        return res.status(201).json({ mensagem: "Agendamento confirmado!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao agendar." });
    }
});

app.get('/ver-agendamentos', async (req, res) => {
    const agendamentos = await prisma.agendamento.findMany({
        include: {
            cliente: { select: { nome: true, email: true } }
        }
    });
    res.json(agendamentos);
});

// --- ROTA DE RECUPERAR SENHA ---
app.post("/recuperar-senha", async (req, res) => {
    const { email, novaSenha } = req.body;
    try {
        const usuario = await prisma.user.findUnique({ where: { email } });
        if (!usuario) return res.status(404).json({ erro: "E-mail não encontrado." });

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await prisma.user.update({
            where: { email },
            data: { senha: novaSenhaHash }
        });
        return res.json({ mensagem: "Senha redefinida!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao redefinir senha." });
    }
});

// --- LIGAR SERVIDOR ---
async function main() {
    try {
        await prisma.$connect();
        console.log('📦 Banco conectado!');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao conectar no banco', error);
    }
}

main();