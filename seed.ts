import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Iniciando a semeadura do banco (Seed)...");

    // 1. Criar (ou garantir que existe) o Barbeiro Mestre
    const emailBarbeiro = "barbeiro@email.com";
    const senhaHash = await bcrypt.hash("123", 10);

    // O 'upsert' cria se não existir, ou atualiza se já existir
    const barbeiro = await prisma.user.upsert({
        where: { email: emailBarbeiro },
        update: {}, // Se já existe, não faz nada
        create: {
            nome: "Mestre da Navalha",
            email: emailBarbeiro,
            senha: senhaHash,
            tipo: "barbeiro"
        }
    });

    console.log(`✂️ Barbeiro garantido: ${barbeiro.nome} (ID: ${barbeiro.id})`);

    // 2. Criar disponibilidade para ele em uma data específica
    // IMPORTANTE: Ajuste esta data para uma data futura próxima quando for testar!
    const dataDisponivel = "2026-02-05"; 
    
    // Deleta disponibilidade anterior dessa data para não duplicar no teste
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
            horarios: "09:00,10:00,11:00,14:00,15:30,17:00" // Formato String, separado por vírgula
        }
    });

    console.log(`📅 Agenda criada para o dia ${dataDisponivel} com sucesso!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });