import { prisma } from "@/lib/db";

export async function listActiveBranches() {
  return prisma.branch.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, address: true },
    orderBy: { name: "asc" },
  });
}
