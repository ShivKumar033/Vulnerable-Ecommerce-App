const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // 1. Create Users
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: passwordHash,
            role: 'ADMIN',
            firstName: 'System',
            lastName: 'Admin',
            isEmailVerified: true,
        },
    });

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor@example.com' },
        update: {},
        create: {
            email: 'vendor@example.com',
            password: passwordHash,
            role: 'VENDOR',
            firstName: 'John',
            lastName: 'Vendor',
            isEmailVerified: true,
        },
    });

    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            password: passwordHash,
            role: 'USER',
            firstName: 'Jane',
            lastName: 'Doe',
            isEmailVerified: true,
        },
    });

    const support = await prisma.user.upsert({
        where: { email: 'support@example.com' },
        update: {},
        create: {
            email: 'support@example.com',
            password: passwordHash,
            role: 'SUPPORT',
            firstName: 'Support',
            lastName: 'Team',
            isEmailVerified: true,
        },
    });

    console.log('✅ Users seeded: Admin, Vendor, User, Support');

    // 2. Create Categories
    const electronics = await prisma.category.upsert({
        where: { slug: 'electronics' },
        update: {},
        create: {
            name: 'Electronics',
            slug: 'electronics',
        },
    });

    const clothing = await prisma.category.upsert({
        where: { slug: 'clothing' },
        update: {},
        create: {
            name: 'Clothing',
            slug: 'clothing',
        },
    });

    console.log('✅ Categories seeded');

    // 3. Create Products (linked to Vendor)
    // Check if products exist first to avoid duplicates or use upsert if needed (slug is unique)

    const laptop = await prisma.product.upsert({
        where: { slug: 'pro-laptop-x1' },
        update: {}, // no-op if exists
        create: {
            title: 'Pro Laptop X1',
            slug: 'pro-laptop-x1',
            description: 'High-performance laptop for professionals.',
            price: 1999.99,
            stock: 50,
            sku: 'LAP-X1-001',
            vendorId: vendor.id,
            categoryId: electronics.id,
            isActive: true,
            images: {
                create: [
                    { url: 'https://placehold.co/600x400?text=Laptop+Front', isPrimary: true },
                    { url: 'https://placehold.co/600x400?text=Laptop+Side', isPrimary: false },
                ]
            }
        },
    });

    const tshirt = await prisma.product.upsert({
        where: { slug: 'classic-white-tee' },
        update: {},
        create: {
            title: 'Classic White Tee',
            slug: 'classic-white-tee',
            description: 'Comfortable cotton t-shirt.',
            price: 29.99,
            stock: 100,
            sku: 'TEE-WHT-001',
            vendorId: vendor.id,
            categoryId: clothing.id,
            isActive: true,
            variants: {
                create: [
                    { name: 'Size', value: 'S', stock: 20 },
                    { name: 'Size', value: 'M', stock: 50 },
                    { name: 'Size', value: 'L', stock: 30 },
                ]
            },
            images: {
                create: [
                    { url: 'https://placehold.co/600x400?text=T-Shirt', isPrimary: true },
                ]
            }
        },
    });

    console.log('✅ Products seeded');
    console.log('🌱 Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
