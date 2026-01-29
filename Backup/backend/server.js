const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

const usuarios = [];
const barbeiros = [{
    id: 1,
    nome: "Mestre da Navalha",
    email: "barbeiro@email.com",
    senha: "123",
    tipo: "barbeiro"
}];
const disponibilidades = [
    {
        id: 1,
        barbeiroId: 1, // ID do Mestre da Navalha
        data: "2026-01-20", // Data que teremos que selecionar no calendário
        horarios: ["09:00", "10:00", "14:00", "15:30", "17:00"]
    }
];
const agendamentos = [];

app.use(cors());
app.use(express.json());

async function criarBarbeiroInicial() {

    const senhaCriptografada = await bcrypt.hash("123",10);

    usuarios.push ({
        id:1,
        nome: "Mestre da Navalha",
        email: "barbeiro@email.com",
        senha: senhaCriptografada,
        tipo: "barbeiro"
    });

    console.log("✂️ Barbeiro Mestre criado com sucesso!");
}

criarBarbeiroInicial();

// rota de teste
app.get("/", (req, res) => {
    res.send("Servidor da Barbearia rodando");
});

//Lista de barbeiros
app.get("/barbeiros", (req, res) => {
    return res.json(barbeiros.map(b => ({
        id: b.id,
        nome: b.nome
    })));
});

app.get("/disponibilidade/:barbeiroId/:data", (req,res) => {

    const { barbeiroId, data } = req.params;

    const disponibilidade = disponibilidades.find(
        d => d.barbeiroId == barbeiroId && d.data == data
    );

    if(!disponibilidade) {
        return res.json({ horarios: [] });
    }

    return res.json({ horarios: disponibilidade.horarios });
});

// Rota para o barbeiro ver seus agendamentos
app.get('/ver-agendamentos', (req, res) => {
    // Retorna a lista completa que está na memória
    res.status(200).json(agendamentos);
});

app.post("/register", async (req,res) => {
    const { nome, email, senha, tipo } = req.body;

    //Validacoes basicas
    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Preencha nome, email e senha"
        });
    }

    
    // verifica se o email ja existe
    const usuarioExiste = usuarios.find(u => u.email === email);

    // Se usuario existir exibe a mensagem a baixo
    if (usuarioExiste){
        return res.status(409).json({
            erro: "Email ja cadastrado"
        });
    }

    const senhaCriptografada = await bcrypt.hash(senha,10);

    //Variavel para criar um usuario
    const novoUsuario = {
        id: usuarios.length + 1,
        nome,
        email,
        senha: senhaCriptografada,
        tipo: tipo || "cliente"
    };

    usuarios.push(novoUsuario);


    return res.status(201).json({
        mensagem: "Usuario cadastrado com sucesso"
    });

})

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha ){
        return res.status(400).json({
            erro: "Email e senha sao obrigatórios"
        });
    }

    const usuario = usuarios.find(u => u.email === email);

    if (!usuario){
        return res.status(401).json({ erro: "Email ou senha invalidos "});
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if(!senhaValida){
        return res.status(401).json({ erro: "Email ou senha invalidos "})
    }

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

app.post("/agendar", (req, res) => {
    const { clienteId, barbeiroId, data, horario } = req.body;

    if(!clienteId || !barbeiroId || !data || !horario){
        return res.status(400).json({
            erro: "clienteId, barbeiroId, data e horario são obrigatórios"
        });
    }

    const cliente = usuarios.find(u => u.id === clienteId && u.tipo === "cliente");

    if(!cliente){
        return res.status(400).json({ erro: "Cliente não encontrado"});
    }

    const barbeiro = barbeiros.find(b => b.id ===  barbeiroId);

    if(!barbeiro){
        return res.status(400).json({ erro: "Barbeiro não encontrado"});
    }

    const disponibilidade = disponibilidades.find(d => d.barbeiroId === barbeiroId && d.data === data);

    if(!disponibilidade || !disponibilidade.horarios.includes(horario)){
        return res.status(400).json({ erro: "Horário indisponível"});
    }

    // remove o horario da lista
    disponibilidade.horarios = disponibilidade.horarios.filter(h => h !== horario);

    const novoAgendamento = {
        id: agendamentos.length + 1,
        clienteId,
        barbeiroId,
        data,
        horario
    };

    agendamentos.push(novoAgendamento);

    return res.status(201).json({
        mensagem: "Agendamento realizado com sucesso"
    });

})

// Rota EXCLUSIVA para cadastrar novos barbeiros (Área Admin)
app.post('/admin/cadastrar-barbeiro', async (req,res)=>{
    const { nome, email, senha } = req.body;

    // Verifica se já existe alguém com esse email
    const usuarioExiste = usuarios.find(u => u.email === email);
    if (usuarioExiste){
        return res.status(400).json({ erro: "E-mail já cadastrado!"});
    }

    // CRIPTOGRAFANDO A SENHA (Correção de Segurança)
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Cria o novo barbeiro
    const novoBarbeiro = {
        id: usuarios.length + 1,
        nome: nome,
        email: email,
        senha: senhaCriptografada,
        tipo: "barbeiro"
    };

    usuarios.push(novoBarbeiro);

    const dadosBarbeiro = {
        id: novoBarbeiro.id,
        nome: novoBarbeiro.nome,
        email: novoBarbeiro.email
    };

    barbeiros.push(dadosBarbeiro);

    res.status(200).json({
        mensagem: "Barbeiro cadastrado com sucesso!",
        barbeiros: dadosBarbeiro
    });
});

// Rota para o barbeiro definir seus horários livres
app.post("/barbeiros/disponibilidade", (req,res) => {
    const { barbeiroId, data, horarios } = req.body;

    // Validação básica
    if (!barbeiroId || !data || !horarios) {
        return res.status(400).json({ erro:"Dados incompletos." })
    }

    // Cria a nova disponibilidade
    const novaDisponibilidade = {
        id: disponibilidades.length + 1,
        barbeiroId: parseInt(barbeiroId), // Garante que e um numero
        data: data,
        horarios: horarios
    };

    disponibilidades.push(novaDisponibilidade);

    res.status(201).json({ mensagem: "Agenda criada com sucesso! "})
})

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});