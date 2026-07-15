/**
 * Popula o banco com dados mínimos para desenvolvimento/teste manual:
 * 1 dono, 2 barbeiros, 1 cliente, 3 serviços, disponibilidade padrão.
 *
 * Rodar com: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "dono@barbearia.com" },
    update: {},
    create: {
      name: "Carlos Dono",
      email: "dono@barbearia.com",
      passwordHash,
      role: "OWNER",
      phone: "98999990000",
    },
  });

  const barber1 = await prisma.user.upsert({
    where: { email: "joao@barbearia.com" },
    update: {},
    create: {
      name: "João Barbeiro",
      email: "joao@barbearia.com",
      passwordHash,
      role: "BARBER",
      phone: "98999990001",
    },
  });

  const barber2 = await prisma.user.upsert({
    where: { email: "pedro@barbearia.com" },
    update: {},
    create: {
      name: "Pedro Barbeiro",
      email: "pedro@barbearia.com",
      passwordHash,
      role: "BARBER",
      phone: "98999990002",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "cliente@teste.com" },
    update: {},
    create: {
      name: "Maria Cliente",
      email: "cliente@teste.com",
      passwordHash,
      role: "CLIENT",
      phone: "98999990003",
    },
  });

  const corte = await prisma.service.upsert({
    where: { id: "svc-corte" },
    update: {},
    create: {
      id: "svc-corte",
      name: "Corte de Cabelo",
      description: "Corte tradicional na tesoura ou máquina",
      durationMin: 30,
      price: 40.0,
    },
  });

  const barba = await prisma.service.upsert({
    where: { id: "svc-barba" },
    update: {},
    create: {
      id: "svc-barba",
      name: "Barba",
      description: "Aparar e desenhar barba com navalha",
      durationMin: 20,
      price: 30.0,
    },
  });

  const combo = await prisma.service.upsert({
    where: { id: "svc-combo" },
    update: {},
    create: {
      id: "svc-combo",
      name: "Corte + Barba",
      description: "Combo completo",
      durationMin: 50,
      price: 65.0,
    },
  });

  const sobrancelha = await prisma.service.upsert({
    where: { id: "svc-sobrancelha" },
    update: {},
    create: {
      id: "svc-sobrancelha",
      name: "Sobrancelha",
      description: "Design e alinhamento de sobrancelha na navalha ou pinça",
      durationMin: 15,
      price: 20.0,
    },
  });

  const pezinho = await prisma.service.upsert({
    where: { id: "svc-pezinho" },
    update: {},
    create: {
      id: "svc-pezinho",
      name: "Pézinho / Acabamento",
      description: "Acabamento de contorno para manter o corte em dia",
      durationMin: 15,
      price: 15.0,
    },
  });

  const hidratacao = await prisma.service.upsert({
    where: { id: "svc-hidratacao" },
    update: {},
    create: {
      id: "svc-hidratacao",
      name: "Hidratação Capilar",
      description: "Tratamento hidratante para cabelo e couro cabeludo",
      durationMin: 30,
      price: 35.0,
    },
  });

  const coloracao = await prisma.service.upsert({
    where: { id: "svc-coloracao" },
    update: {},
    create: {
      id: "svc-coloracao",
      name: "Coloração / Pigmentação",
      description: "Aplicação de coloração ou pigmento para disfarçar fios brancos",
      durationMin: 45,
      price: 50.0,
    },
  });

  const relaxamento = await prisma.service.upsert({
    where: { id: "svc-relaxamento" },
    update: {},
    create: {
      id: "svc-relaxamento",
      name: "Relaxamento",
      description: "Relaxamento capilar para alinhar a textura do cabelo",
      durationMin: 40,
      price: 45.0,
    },
  });

  const desenho = await prisma.service.upsert({
    where: { id: "svc-desenho" },
    update: {},
    create: {
      id: "svc-desenho",
      name: "Desenho na Barba",
      description: "Desenho e acabamento artístico feito na navalha",
      durationMin: 20,
      price: 25.0,
    },
  });

  const platinado = await prisma.service.upsert({
    where: { id: "svc-platinado" },
    update: {},
    create: {
      id: "svc-platinado",
      name: "Platinado",
      description: "Descoloração completa do cabelo",
      durationMin: 90,
      price: 120.0,
    },
  });

  const allServices = [
    corte,
    barba,
    combo,
    sobrancelha,
    pezinho,
    hidratacao,
    coloracao,
    relaxamento,
    desenho,
    platinado,
  ];

  // Vincula os dois barbeiros a todos os serviços
  for (const barber of [barber1, barber2]) {
    for (const service of allServices) {
      await prisma.barberService.upsert({
        where: { barberId_serviceId: { barberId: barber.id, serviceId: service.id } },
        update: {},
        create: { barberId: barber.id, serviceId: service.id },
      });
    }

    // Disponibilidade: Segunda a Sábado, 09:00-18:00
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      await prisma.availability.create({
        data: { barberId: barber.id, weekday, startTime: "09:00", endTime: "18:00" },
      });
    }
  }

  console.log("Seed concluído:");
  console.log({ owner: owner.email, barber1: barber1.email, barber2: barber2.email, client: client.email });
  console.log("Senha para todos os usuários de teste: senha123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
