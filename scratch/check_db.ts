/* eslint-disable @typescript-eslint/no-explicit-any */
//scratch/check_db.ts
import { PrismaClient } from "@prisma/client/extension";

const prisma = new PrismaClient();

async function main() {
  const email = "[EMAIL_ADDRESS]";
  console.log(`Checking user: ${email}`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
      admin: true
    }
  });

  if (!user) {
    console.log("User not found");
  } else {
    console.log("User found:", JSON.stringify(user, null, 2));
    if (user.accounts.length === 0) {
      console.log("CRITICAL: No accounts found for this user!");
    } else {
      user.accounts.forEach((acc: { id: any; providerId: any; password: any; }) => {
        console.log(`Account ID: ${acc.id}, Provider: ${acc.providerId}, Has Password: ${!!acc.password}`);
      });
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
