import { envVars } from "../config/env";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma";
import { Role, UserStatus } from "../types/enums";

// SUPER_ADMIN creation part - remove unused 'result' variable

export const seedSuperAdmin = async () => {
  try {
    const superAdminEmail = envVars.SUPER_ADMIN_EMAIL;
    const superAdminPassword = envVars.SUPER_ADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
      console.log("⚠️ SUPER_ADMIN credentials not provided in .env");
      return;
    }

    // ✅ Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: superAdminEmail },
      include: { admin: true }
    });

    if (existingUser) {
      console.log("✅ SUPER_ADMIN already exists");
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(superAdminPassword);

    // ✅ Create SUPER_ADMIN using transaction
    await prisma.$transaction(async (tx) => {  // 👈 removed 'const result ='
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: superAdminEmail,
          name: "Super Admin",
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          needPasswordChange: false,
          accounts: {
            create: {
              id: crypto.randomUUID(),
              accountId: superAdminEmail,
              providerId: "credential",
              password: hashedPassword,
            }
          }
        }
      });

      // 2. Create Admin profile
      await tx.admin.create({
        data: {
          userId: user.id,
          phoneNumber: "N/A",
        }
      });
    });

    console.log("🔥 SUPER_ADMIN Created Successfully!");
    console.log(`   Email: ${superAdminEmail}`);
  } catch (error) {
    console.error("❌ Error seeding super admin:", error);
  }
};

// Seed regular admin (optional)
export const seedAdmin = async () => {
  try {
    const adminEmail = "admin@medistore.com";
    const adminPassword = "Admin@123";

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { admin: true }
    });

    if (existingUser) {
      console.log("✅ Admin already exists");
      return;
    }

    const hashedPassword = await hashPassword(adminPassword);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          name: "Admin User",
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          accounts: {
            create: {
              id: crypto.randomUUID(),
              accountId: adminEmail,
              providerId: "credential",
              password: hashedPassword,
            }
          }
        }
      });

      await tx.admin.create({
        data: {
          userId: user.id,
          phoneNumber: "019XXXXXXXX",
        }
      });
    });

    console.log("✅ Admin created successfully");
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  }
};

// Seed sample seller (for testing)
export const seedSampleSeller = async () => {
  try {
    const sellerEmail = "seller@medistore.com";
    
    const existingUser = await prisma.user.findUnique({
      where: { email: sellerEmail },
      include: { seller: true }
    });

    if (existingUser) {
      console.log("✅ Sample seller already exists");
      return;
    }

    const hashedPassword = await hashPassword("Seller@123");

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: sellerEmail,
          name: "Sample Seller",
          role: Role.SELLER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          accounts: {
            create: {
              id: crypto.randomUUID(),
              accountId: sellerEmail,
              providerId: "credential",
              password: hashedPassword,
            }
          }
        }
      });

      await tx.seller.create({
        data: {
          userId: user.id,
          shopName: "Sample Pharmacy",
          shopAddress: "Dhaka, Bangladesh",
          phoneNumber: "019XXXXXXXX",
          isApproved: true,
        }
      });
    });

    console.log("✅ Sample seller created successfully");
  } catch (error) {
    console.error("❌ Error seeding seller:", error);
  }
};

// Seed sample customer (for testing)
export const seedSampleCustomer = async () => {
  try {
    const customerEmail = "customer@medistore.com";
    
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      include: { customer: true }
    });

    if (existingUser) {
      console.log("✅ Sample customer already exists");
      return;
    }

    const hashedPassword = await hashPassword("Customer@123");

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: customerEmail,
          name: "Sample Customer",
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          accounts: {
            create: {
              id: crypto.randomUUID(),
              accountId: customerEmail,
              providerId: "credential",
              password: hashedPassword,
            }
          }
        }
      });

      await tx.customer.create({
        data: {
          userId: user.id,
          phoneNumber: "018XXXXXXXX",
          shippingAddress: "Dhaka, Bangladesh",
        }
      });
    });

    console.log("✅ Sample customer created successfully");
  } catch (error) {
    console.error("❌ Error seeding customer:", error);
  }
};

// Run all seeds
export const seedAll = async () => {
  console.log("🌱 Starting database seeding...");
  await seedSuperAdmin();
  await seedAdmin();
  await seedSampleSeller();
  await seedSampleCustomer();
  console.log("✅ Seeding completed!");
};