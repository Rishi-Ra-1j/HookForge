import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL! 
})

export const prisma = new PrismaClient({ adapter })
export { PrismaClient, Prisma } from '../generated/prisma/client'