import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt, { hash } from 'bcrypt';

// 1. Iniciamos a conexao com o banco
const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// 2. Configuracoes padrao (JSON e CORS)
app.use(express.json());
app.use(cors());

// 3. Rota de Teste para ver se tudo funciona
app.get('/', (req,res) => {
    res.send('💈 API da Barbearia V2 (com Banco de Dados) está rodando!');
});

// 4. Ligar o servidor
async function main() {
    // Tenta conectar no banco antes de ligar o servidor
    try{
        await prisma.$connect();
        console.log('📦 Banco de Dados conectado com sucesso!');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });    
    }
    
    catch (error){
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
    if(!usuario) {
        return res.status(401).json({
            erro: "Email ou senha invalidos"
        });
    }

    //3. Verifica se a senha bate (compara a senha digitada com a criptografada)
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if(!senhaValida){
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

main()