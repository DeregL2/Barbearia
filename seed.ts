import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Iniciando a semeadura do banco (Seed)...");

    // --- 1. CRIAR BARBEIRO ---
    const emailBarbeiro = "barbeiro@email.com";
    const senhaHash = await bcrypt.hash("123", 10);

    const barbeiro = await prisma.user.upsert({
        where: { email: emailBarbeiro },
        update: {},
        create: {
            nome: "Mestre da Navalha",
            email: emailBarbeiro,
            senha: senhaHash,
            tipo: "barbeiro",
            descricao: "Especialista em cortes clássicos e barba na toalha quente."
            // OBS: Removi o 'preco' daqui pois agora ele é Global!
        }
    });

    console.log(`✂️ Barbeiro garantido: ${barbeiro.nome} (ID: ${barbeiro.id})`);

    // --- 2. CRIAR AGENDA ---
    const dataDisponivel = "2026-02-11"; // Atualizei para a data de hoje/amanhã
    
    // Limpa agenda antiga desse dia para não duplicar
    await prisma.disponibilidade.deleteMany({
        where: { 
            barbeiroId: barbeiro.id,
            data: dataDisponivel
        }
    });

    await prisma.disponibilidade.create({
        data: {
            barbeiroId: barbeiro.id,
            data: dataDisponivel,
            horarios: "09:00,10:00,11:00,14:00,15:30,17:00"
        }
    });

    console.log(`📅 Agenda criada para o dia ${dataDisponivel} com sucesso!`);

    // --- 3. CRIAR ADMIN ---
    const emailAdmin = "admin@barbearia.com";
    const senhaAdminHash = await bcrypt.hash("admin123", 10);

    await prisma.user.upsert({
        where: { email: emailAdmin },
        update: {
            tipo: "admin", // Garante que se já existir, vira admin
            senha: senhaAdminHash
        },
        create: {
            nome: "Administrador Geral",
            email: emailAdmin,
            senha: senhaAdminHash,
            tipo: "admin"
        }
    });
    console.log("👑 Usuário Admin garantido: admin@barbearia.com / admin123");

    // --- 4. CONFIGURAÇÃO INICIAL DA LOJA (COM A CORREÇÃO MÁGICA) ---
    // Usamos (prisma as any) para o TypeScript parar de reclamar se estiver desatualizado
    await (prisma as any).configuracao.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1, // ID fixo para ser sempre a mesma configuração
            precoCorte: 40.00,
            precoSinal: 20.00
        }
    });
    console.log("⚙️ Configurações da Barbearia carregadas (R$ 40,00 / R$ 20,00).");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });