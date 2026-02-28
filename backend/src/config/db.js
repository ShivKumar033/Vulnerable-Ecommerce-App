import { PrismaClient } from '@prisma/client';

// Create Prisma client - for Prisma Cloud use standard client
const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['warn', 'error'],
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
    console.log('📦 Database disconnected')
  } catch (err) {
    console.error('⚠️  Error disconnecting database:', err.message)
  }
}

export { prisma, connectDB, disconnectDB };
