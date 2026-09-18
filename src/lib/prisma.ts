import { PrismaClient } from '@prisma/client';

export const isDummyDbUrl =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('[YOUR-PASSWORD]') ||
  process.env.USE_SUPABASE_DIRECT_TCP !== 'true';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (isDummyDbUrl) {
      throw new Error('[Prisma] Direct TCP database port 5432 is restricted. Using instant Supabase REST API fallback.');
    }
    const client = getPrismaClient();
    return Reflect.get(client, prop, receiver);
  },
});

export default prisma;
