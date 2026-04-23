import { Role, UserStatus } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma";

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

// Seed categories
export const seedCategories = async () => {
  try {
    const categories = [
      { name: "Pain Relief", slug: "pain-relief", description: "Medicines for pain relief" },
      { name: "Cold & Flu", slug: "cold-flu", description: "Medicines for cold and flu" },
      { name: "Vitamins", slug: "vitamins", description: "Vitamin and mineral supplements" },
      { name: "Digestive Health", slug: "digestive-health", description: "Medicines for digestive issues" },
      { name: "Skin Care", slug: "skin-care", description: "Skin care products and medicines" },
      { name: "First Aid", slug: "first-aid", description: "First aid supplies" },
      { name: "Allergy", slug: "allergy", description: "Allergy relief medicines" },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }
    console.log("✅ Categories seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
  }
};

// Run all seeds
export const seedAll = async () => {
  console.log("🌱 Starting database seeding...");
  await seedSuperAdmin();
  await seedAdmin();
  await seedSampleSeller();
  await seedSampleCustomer();
  await seedCategories();
  console.log("✅ Seeding completed!");
};