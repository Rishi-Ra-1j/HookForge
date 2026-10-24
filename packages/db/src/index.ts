import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

// Idle timeout is shorter than serverless Postgres' suspend time so stale connections are dropped first
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
})

export const prisma = new PrismaClient({ adapter })
export { PrismaClient, Prisma } from '../generated/prisma/client'