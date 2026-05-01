// 👇 সঠিক import path

import { prisma } from "../app/lib/prisma";

async function updateOrderCounts() {
  console.log("🔄 Updating order counts...");
  
  const orderItems = await prisma.orderItem.groupBy({
    by: ['medicineId'],
    _sum: { 
      quantity: true 
    }
  });
  
  console.log(`📊 Found ${orderItems.length} medicines with orders`);
  
  for (const item of orderItems) {
    await prisma.medicine.update({
      where: { id: item.medicineId },
      data: { 
        orderCount: item._sum.quantity || 0 
      }
    });
  }
  
  console.log("✅ Order counts updated successfully!");
}

updateOrderCounts()
  .catch((error) => {
    console.error("❌ Error updating order counts:", error);
  })
  .finally(() => prisma.$disconnect());