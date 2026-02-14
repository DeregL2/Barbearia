import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

// --- ROTAS DE CONFIGURAÇÃO ---
app.get("/configuracao", async (req, res) => {
    try {
        const config = await (prisma as any).configuracao.findUnique({ where: { id: 1 } });
        return res.json(config || { precoCorte: 40.00, precoSinal: 20.00 });
    } catch (error) { return res.json({ precoCorte: 40.00, precoSinal: 20.00 }); }
});

app.post("/admin/configuracao", async (req, res) => {
    const { novoPreco, novoSinal } = req.body;
    try {
        const config = await (prisma as any).configuracao.upsert({
            where: { id: 1 },
            update: { precoCorte: parseFloat(novoPreco), precoSinal: parseFloat(novoSinal) },
            create: { id: 1, precoCorte: parseFloat(novoPreco), precoSinal: parseFloat(novoSinal) }
        });
        return res.json({ mensagem: "Atualizado!", config });
    } catch (error) { return res.status(500).json({ erro: "Erro ao atualizar." }); }
});

// --- ROTAS DE USUÁRIO (LOGIN/REGISTER) ---
app.post('/register', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(409).json({ erro: "Email já existe." });
        
        const hash = await bcrypt.hash(senha, 10);
        const user = await prisma.user.create({ data: { nome, email, senha: hash, tipo: "cliente" } });
        return res.status(201).json(user);
    } catch (e) { return res.status(500).json({ erro: "Erro ao criar conta." }); }
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(senha, user.senha)) return res.status(401).json({ erro: "Credenciais inválidas." });
    
    return res.json({ 
        mensagem: "Logado", 
        usuario: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo } 
    });
});

app.post("/recuperar-senha", async (req, res) => {
    const { email, novaSenha } = req.body;
    try {
        const hash = await bcrypt.hash(novaSenha, 10);
        await prisma.user.update({ where: { email }, data: { senha: hash } });
        return res.json({ mensagem: "Senha atualizada." });
    } catch (e) { return res.status(500).json({ erro: "Erro ao atualizar senha." }); }
});

// --- GESTÃO DE BARBEIROS (ADMIN) ---
app.get("/barbeiros", async (req, res) => {
    const barbeiros = await prisma.user.findMany({ 
        where: { tipo: "barbeiro" }, 
        select: { id: true, nome: true, email: true, descricao: true, fotoUrl: true } 
    });
    return res.json(barbeiros);
});

app.post('/admin/register-barber', async (req, res) => {
    const { nome, email, senha, descricao, fotoUrl } = req.body;
    try {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(409).json({ erro: "Email já cadastrado." });
        
        const hash = await bcrypt.hash(senha, 10);
        await prisma.user.create({ 
            data: { nome, email, senha: hash, tipo: "barbeiro", descricao, fotoUrl } 
        });
        return res.status(201).json({ mensagem: "Barbeiro criado!" });
    } catch (e) { return res.status(500).json({ erro: "Erro ao criar barbeiro." }); }
});

// NOVO: Editar Barbeiro
app.put('/admin/barbeiros/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, fotoUrl } = req.body;
    try {
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { nome, descricao, fotoUrl }
        });
        return res.json({ mensagem: "Barbeiro atualizado!" });
    } catch (error) { return res.status(500).json({ erro: "Erro ao atualizar." }); }
});

// NOVO: Excluir Barbeiro
app.delete('/admin/barbeiros/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Primeiro apaga agendamentos e disponibilidade para não dar erro de vínculo
        await prisma.agendamento.deleteMany({ where: { barbeiroId: parseInt(id) } });
        await prisma.disponibilidade.deleteMany({ where: { barbeiroId: parseInt(id) } });
        
        await prisma.user.delete({ where: { id: parseInt(id) } });
        return res.json({ mensagem: "Barbeiro excluído!" });
    } catch (error) { return res.status(500).json({ erro: "Erro ao excluir." }); }
});


// --- AGENDAMENTOS E REGRAS ---

// Buscar horários livres
app.get("/disponibilidade/:barbeiroId/:data", async (req, res) => {
    const { barbeiroId, data } = req.params;
    const disp = await prisma.disponibilidade.findFirst({ where: { barbeiroId: parseInt(barbeiroId), data } });
    return res.json({ horarios: disp ? disp.horarios.split(",") : [] });
});

// Barbeiro define horários
app.post("/disponibilidade", async (req, res) => {
    const { barbeiroId, data, horarios } = req.body;
    try {
        const exists = await prisma.disponibilidade.findFirst({ where: { barbeiroId, data } });
        if (exists) {
            await prisma.disponibilidade.update({ where: { id: exists.id }, data: { horarios } });
        } else {
            await prisma.disponibilidade.create({ data: { barbeiroId, data, horarios } });
        }
        return res.json({ mensagem: "Agenda salva." });
    } catch (e) { return res.status(500).json({ erro: "Erro ao salvar." }); }
});

// NOVO: Regra de Agendamento Único por Dia
app.post("/agendar", async (req, res) => {
    const { clienteId, barbeiroId, data, horario } = req.body;
    
    try {
        // REGRA 2: Verifica se o cliente já tem QUALQUER agendamento neste dia
        const corteNoMesmoDia = await prisma.agendamento.findFirst({
            where: { clienteId: clienteId, data: data }
        });

        if (corteNoMesmoDia) {
            return res.status(400).json({ erro: "Você já tem um corte agendado para este dia!" });
        }

        // Verifica disponibilidade
        const disp = await prisma.disponibilidade.findFirst({ where: { barbeiroId, data } });
        if (!disp || !disp.horarios.includes(horario)) {
            return res.status(400).json({ erro: "Horário indisponível." });
        }

        // Transação para agendar e remover horário
        await prisma.$transaction(async (tx) => {
            await tx.agendamento.create({ data: { data, horario, clienteId, barbeiroId } });
            
            const novaLista = disp.horarios.split(',').filter(h => h !== horario).join(',');
            await tx.disponibilidade.update({ where: { id: disp.id }, data: { horarios: novaLista } });
        });

        return res.status(201).json({ mensagem: "Agendado com sucesso!" });
    } catch (e) { return res.status(500).json({ erro: "Erro ao processar." }); }
});

// Ver agendamentos (Geral)
app.get('/ver-agendamentos', async (req, res) => {
    const agendamentos = await prisma.agendamento.findMany({
        include: { 
            cliente: { select: { nome: true, email: true } },
            barbeiro: { select: { nome: true } } // Inclui nome do barbeiro também
        }
    });
    res.json(agendamentos);
});

// NOVO: Cancelar Agendamento (Com Regra de 24h)
app.delete('/agendar/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const agendamento = await prisma.agendamento.findUnique({ where: { id: parseInt(id) } });
        if (!agendamento) return res.status(404).json({ erro: "Agendamento não encontrado." });

        // REGRA 3: Cálculo de Horas
        const dataAgendamento = new Date(`${agendamento.data}T${agendamento.horario}`);
        const agora = new Date();
        
        // Diferença em milissegundos
        const diffMs = dataAgendamento.getTime() - agora.getTime();
        // Converte para horas (ms / 1000 / 60 / 60)
        const horasRestantes = diffMs / (1000 * 60 * 60);

        if (horasRestantes < 24) {
            return res.status(400).json({ erro: "Cancelamento só permitido com 24h de antecedência." });
        }

        // Devolve o horário para o barbeiro
        const disp = await prisma.disponibilidade.findFirst({ 
            where: { barbeiroId: agendamento.barbeiroId, data: agendamento.data } 
        });

        if (disp) {
            const listaAtual = disp.horarios ? disp.horarios.split(',') : [];
            listaAtual.push(agendamento.horario);
            listaAtual.sort(); // Organiza os horários
            
            await prisma.disponibilidade.update({
                where: { id: disp.id },
                data: { horarios: listaAtual.join(',') }
            });
        }

        // Apaga o agendamento
        await prisma.agendamento.delete({ where: { id: parseInt(id) } });

        return res.json({ mensagem: "Agendamento cancelado e horário liberado!" });

    } catch (e) { return res.status(500).json({ erro: "Erro ao cancelar." }); }
});

// Ligar Servidor
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API Rodando na porta ${PORT}`));