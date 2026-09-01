import { PrismaClient } from '@prisma/client';

export const isDummyDbUrl =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('[YOUR-PASSWORD]') ||
  process.env.USE_SUPABASE_DIRECT_TCP !== 'true';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawPrisma;

export const prisma = new Proxy(rawPrisma, {
  get(target, prop, receiver) {
    if (isDummyDbUrl) {
      throw new Error('[Prisma] Direct TCP database port 5432 is restricted. Using instant Supabase REST API fallback.');
    }
    return Reflect.get(target, prop, receiver);
  },
});

export default prisma;
