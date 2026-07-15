/**
 * Adiciona novos tipos de serviço ao catálogo, vinculando-os a todos os
 * barbeiros ativos já existentes no banco.
 *
 * Diferente de seed.ts, este script NÃO mexe em usuários nem em
 * disponibilidade — só em Service e BarberService, ambos via upsert.
 * Por isso é seguro rodar em produção (Neon), inclusive mais de uma vez.
 *
 * Rodar com: npx tsx prisma/add-services.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_SERVICES = [
  {
    id: "svc-sobrancelha",
    name: "Sobrancelha",
    description: "Design e alinhamento de sobrancelha na navalha ou pinça",
    durationMin: 15,
    price: 20.0,
  },
  {
    id: "svc-pezinho",
    name: "Pézinho / Acabamento",
    description: "Acabamento de contorno para manter o corte em dia",
    durationMin: 15,
    price: 15.0,
  },
  {
    id: "svc-hidratacao",
    name: "Hidratação Capilar",
    description: "Tratamento hidratante para cabelo e couro cabeludo",
    durationMin: 30,
    price: 35.0,
  },
  {
    id: "svc-coloracao",
    name: "Coloração / Pigmentação",
    description: "Aplicação de coloração ou pigmento para disfarçar fios brancos",
    durationMin: 45,
    price: 50.0,
  },
  {
    id: "svc-relaxamento",
    name: "Relaxamento",
    description: "Relaxamento capilar para alinhar a textura do cabelo",
    durationMin: 40,
    price: 45.0,
  },
  {
    id: "svc-desenho",
    name: "Desenho na Barba",
    description: "Desenho e acabamento artístico feito na navalha",
    durationMin: 20,
    price: 25.0,
  },
  {
    id: "svc-platinado",
    name: "Platinado",
    description: "Descoloração completa do cabelo",
    durationMin: 90,
    price: 120.0,
  },
];

async function main() {
  const barbers = await prisma.user.findMany({
    where: { role: "BARBER", active: true },
    select: { id: true, name: true },
  });

  if (barbers.length === 0) {
    console.warn("Nenhum barbeiro ativo encontrado — os serviços serão criados sem vínculo.");
  }

  for (const data of NEW_SERVICES) {
    const service = await prisma.service.upsert({
      where: { id: data.id },
      update: {},
      create: data,
    });

    for (const barber of barbers) {
      await prisma.barberService.upsert({
        where: { barberId_serviceId: { barberId: barber.id, serviceId: service.id } },
        update: {},
        create: { barberId: barber.id, serviceId: service.id },
      });
    }

    console.log(`✔ ${service.name} — vinculado a ${barbers.length} barbeiro(s)`);
  }

  console.log("Concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
