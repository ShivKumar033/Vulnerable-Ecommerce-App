import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Create the Prisma adapter
const adapter = new PrismaPg(pool)

const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'info', 'warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    console.error('⚠️  Server will start without database connectivity.')
    return false
  }
}

async function disconnectDB() {
  try {
    await prisma.$disconnect()
    await pool.end()
    console.log('📦 Database disconnected')
  } catch (err) {
    console.error('⚠️  Error disconnecting database:', err.message)
  }
}

export { prisma, connectDB, disconnectDB };
