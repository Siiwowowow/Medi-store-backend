import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";

const getAdminDashboardStats = async () => {
  // Get all counts in parallel for better performance
  const [
    totalUsers,
    totalCustomers,
    totalSellers,
    totalAdmins,
    totalMedicines,
    totalOrders,
    totalRevenue,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    recentOrders,
    lowStockMedicines,
    topSellingMedicines,
  ] = await Promise.all([
    // User counts
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.CUSTOMER, isDeleted: false } }),
    prisma.user.count({ where: { role: Role.SELLER, isDeleted: false } }),
    prisma.user.count({ where: { role: Role.ADMIN, isDeleted: false } }),
    
    // Medicine count
    prisma.medicine.count({ where: { isActive: true } }),
    
    // Order stats
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: 'CANCELLED' } }
    }),
    
    // Order status breakdown
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.count({ where: { status: 'SHIPPED' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    
    // Recent orders
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    }),
    
    // Low stock medicines (stock < 10)
    prisma.medicine.findMany({
      where: { stock: { lt: 10 }, isActive: true },
      take: 10,
      select: { id: true, name: true, stock: true, manufacturer: true }
    }),
    
    // Top selling medicines
    prisma.orderItem.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }).then(async (items) => {
      const medicineIds = items.map(i => i.medicineId);
      const medicines = await prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, name: true, price: true, image: true }
      });
      return items.map(item => ({
        ...item,
        medicine: medicines.find(m => m.id === item.medicineId)
      }));
    }),
  ]);

  // Calculate monthly revenue for chart
  const monthlyRevenue = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      SUM("totalAmount") as revenue
    FROM "orders"
    WHERE "status" != 'CANCELLED'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
    LIMIT 6
  `;

  return {
    users: {
      total: totalUsers,
      customers: totalCustomers,
      sellers: totalSellers,
      admins: totalAdmins,
    },
    products: {
      total: totalMedicines,
      lowStock: lowStockMedicines.length,
      lowStockItems: lowStockMedicines,
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      recent: recentOrders,
    },
    revenue: {
      total: totalRevenue._sum.totalAmount || 0,
      monthly: monthlyRevenue,
    },
    topSelling: topSellingMedicines,
  };
};

const getSellerDashboardStats = async (sellerUserId: string) => {
  // Get seller profile
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });

  if (!seller) {
    throw new Error("Seller not found");
  }

  // Get seller's medicines
  const sellerMedicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    select: { id: true }
  });

  const medicineIds = sellerMedicines.map(m => m.id);

  if (medicineIds.length === 0) {
    return {
      products: { total: 0, active: 0, lowStock: 0 },
      orders: { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
      revenue: { total: 0, monthly: [] },
      recentOrders: [],
      lowStockProducts: [],
    };
  }

  // Get order items for seller's medicines
  const orderItems = await prisma.orderItem.findMany({
    where: { medicineId: { in: medicineIds } },
    include: { order: true, medicine: true }
  });

  // Calculate order stats
  const uniqueOrderIds = [...new Set(orderItems.map(item => item.orderId))];
  const orders = await prisma.order.findMany({
    where: { id: { in: uniqueOrderIds } },
    include: {
      customer: { include: { user: { select: { name: true, email: true } } } },
      items: { where: { medicineId: { in: medicineIds } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const totalRevenue = orderItems.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);

  // Get low stock products
  const lowStockProducts = await prisma.medicine.findMany({
    where: { sellerId: seller.id, stock: { lt: 10 }, isActive: true },
    select: { id: true, name: true, stock: true, price: true }
  });

  return {
    products: {
      total: sellerMedicines.length,
      active: await prisma.medicine.count({ where: { sellerId: seller.id, isActive: true } }),
      lowStock: lowStockProducts.length,
      lowStockProducts,
    },
    orders: {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      processing: orders.filter(o => o.status === 'PROCESSING').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      recent: orders.slice(0, 10),
    },
    revenue: {
      total: totalRevenue,
    },
  };
};

export const DashboardService = {
  getAdminDashboardStats,
  getSellerDashboardStats,
};