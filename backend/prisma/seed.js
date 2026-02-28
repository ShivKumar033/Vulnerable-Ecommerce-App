
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create Admin User
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
    console.log('✅ Admin user created:', admin.email);

    // 2. Create Vendor User
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
    console.log('✅ Vendor user created:', vendor.email);

    // 3. Create Support User
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
    console.log('✅ Support user created:', support.email);

    // 4. Create Regular User
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
    console.log('✅ User created:', user.email);

    // 5. Create Categories
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
    console.log('✅ Categories created');

    // 6. Create Products
    const laptop = await prisma.product.upsert({
        where: { slug: 'pro-laptop-x1' },
        update: {},
        create: {
            title: 'Pro Laptop X1',
            slug: 'pro-laptop-x1',
            description: 'High-performance laptop for professionals with 16GB RAM, 512GB SSD.',
            price: 1999.99,
            stock: 50,
            sku: 'LAP-X1-001',
            vendorId: vendor.id,
            categoryId: electronics.id,
            isActive: true,
        },
    });
    console.log('✅ Product created:', laptop.title);

    const tshirt = await prisma.product.upsert({
        where: { slug: 'classic-white-tee' },
        update: {},
        create: {
            title: 'Classic White Tee',
            slug: 'classic-white-tee',
            description: 'Comfortable cotton t-shirt, perfect for everyday wear.',
            price: 29.99,
            stock: 100,
            sku: 'TEE-WHT-001',
            vendorId: vendor.id,
            categoryId: clothing.id,
            isActive: true,
        },
    });
    console.log('✅ Product created:', tshirt.title);

    const phone = await prisma.product.upsert({
        where: { slug: 'smartphone-pro' },
        update: {},
        create: {
            title: 'Smartphone Pro',
            slug: 'smartphone-pro',
            description: 'Latest smartphone with amazing camera and battery life.',
            price: 899.99,
            stock: 75,
            sku: 'PHN-PRO-001',
            vendorId: vendor.id,
            categoryId: electronics.id,
            isActive: true,
        },
    });
    console.log('✅ Product created:', phone.title);

    console.log('\n🌱 Seeding complete!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:    admin@example.com    / password123');
    console.log('   Vendor:   vendor@example.com   / password123');
    console.log('   Support:  support@example.com  / password123');
    console.log('   User:     user@example.com     / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

