const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

const usuarios = [];
const barbeiros = [];
const disponibilidades = [];
const agendamentos = [];

app.use(cors());
app.use(express.json());

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

app.post("/barbeiro", async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Nome, email e senha são obrigatórios "
        });
    }

    //verifica se o email ja existe
    const emailExiste = usuarios.find(u => u.email === email);

    if (emailExiste){
        return res.status(409).json({
            erro: "Email ja cadastrado"
        });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const novoBarbeiro = {
        id: barbeiros.length + 1,
        nome,
        email,
        senha: senhaCriptografada,
        tipo: "barbeiro"
    };

    usuarios.push(novoBarbeiro);
    barbeiros.push(novoBarbeiro);

    return res.status(201).json({
        mensagem: "Barbeiro cadastrado com sucesso",
        barbeiro: {
            id: novoBarbeiro.id,
            nome: novoBarbeiro.nome
        }
    });

});

app.post("/barbeiro/disponibilidade", (req, res) => {
    const { barbeiroId, data, horarios } = req.body;

    if (!barbeiroId || !data || !horarios || !Array.isArray(horarios)){
        return res.status(400).json({
            erro: "barbeiroId, data e horarios são obrigatórios"
        });
    }

    const barbeiro = barbeiros.find(b => b.id === barbeiroId);

    if(!barbeiro){
        return res.status(404).json({
            erro: "Barbeiro não encontrado"
        });
    }

    const novaDisponibilidade = {
        id: disponibilidades.length + 1,
        barbeiroId,
        data,
        horarios
    };

    disponibilidades.push(novaDisponibilidade);

    return res.status(201).json({
        mensagem: "Horários cadastrados com sucesso"
    });
});

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});