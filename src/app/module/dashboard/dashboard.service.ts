/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/module/dashboard/dashboard.service.ts

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

// ==================== ADMIN DASHBOARD STATS ====================

const getAdminDashboardStats = async () => {
  // Get all counts in parallel
  const [
    totalUsers,
    totalSellers,
    totalCustomers,
    totalAdmins,
    totalSuperAdmins,
    pendingSellers,
    totalMedicines,
    activeMedicines,
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { role: "SELLER", isDeleted: false } }),
    prisma.user.count({ where: { role: "CUSTOMER", isDeleted: false } }),
    prisma.user.count({ where: { role: "ADMIN", isDeleted: false } }),
    prisma.user.count({ where: { role: "SUPER_ADMIN", isDeleted: false } }),
    prisma.seller.count({ where: { isApproved: false } }),
    prisma.medicine.count(),
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "CANCELLED" } },
    }),
  ]);

  // Get recent orders (last 10)
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      items: {
        take: 3,
        select: {
          id: true,
          medicineName: true,
          quantity: true,
          totalPrice: true,
        },
      },
    },
  });

  // Get pending sellers (for approval queue)
  const pendingSellersList = await prisma.seller.findMany({
    where: { isApproved: false },
    take: 5,
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  // Calculate this month's revenue
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const thisMonthRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: firstDayOfMonth },
      status: { not: "CANCELLED" },
    },
  });

  // Calculate today's revenue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: today },
      status: { not: "CANCELLED" },
    },
  });

  // Calculate growth percentage
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);
  lastMonth.setHours(0, 0, 0, 0);

  const lastMonthRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: lastMonth, lt: firstDayOfMonth },
      status: { not: "CANCELLED" },
    },
  });

  const currentMonthTotal = thisMonthRevenue._sum.totalAmount?.toNumber() ?? 0;
  const lastMonthTotal = lastMonthRevenue._sum.totalAmount?.toNumber() ?? 0;
  const growth = lastMonthTotal === 0 ? 100 : Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);

  return {
    users: {
      total: totalUsers,
      sellers: totalSellers,
      customers: totalCustomers,
      admins: totalAdmins,
      superAdmins: totalSuperAdmins,
      pendingSellers: pendingSellers,
    },
    products: {
      total: totalMedicines,
      active: activeMedicines,
      inactive: totalMedicines - activeMedicines,
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      completionRate: Math.round((deliveredOrders / totalOrders) * 100) || 0,
    },
    revenue: {
      total: totalRevenue._sum.totalAmount || 0,
      thisMonth: currentMonthTotal,
      today: todayRevenue._sum.totalAmount || 0,
      growth: growth > 0 ? `+${growth}%` : `${growth}%`,
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalAmount: order.totalAmount.toNumber(),
      status: order.status,
      createdAt: order.createdAt,
      itemsCount: order.items.length,
    })),
    pendingSellers: pendingSellersList.map((seller) => ({
      id: seller.id,
      shopName: seller.shopName,
      user: {
        name: seller.user.name,
        email: seller.user.email,
        joinedAt: seller.user.createdAt,
      },
      createdAt: seller.createdAt,
    })),
    lastUpdated: new Date(),
  };
};

// ==================== SELLER DASHBOARD ====================

const getSellerDashboardStats = async (sellerUserId: string) => {
  // 1. Get seller profile
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        }
      }
    }
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }

  // 2. Get seller's medicines with category info
  const sellerMedicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const medicineIds = sellerMedicines.map(m => m.id);
  
  // 3. Product Statistics
  const productStats = {
    total: sellerMedicines.length,
    active: sellerMedicines.filter(m => m.isActive).length,
    inactive: sellerMedicines.filter(m => !m.isActive).length,
    lowStock: sellerMedicines.filter(m => m.stock < 10 && m.isActive).length,
    outOfStock: sellerMedicines.filter(m => m.stock === 0 && m.isActive).length,
    totalInventoryValue: sellerMedicines.reduce((sum, m) => sum + (m.price.toNumber() * m.stock), 0),
  };

  // 4. Category-wise product distribution
  const categoryDistribution = await getCategoryDistribution(seller.id);
  
  // 5. Category Performance (sales by category)
  const categoryPerformance = medicineIds.length > 0 
    ? await getCategoryPerformance(medicineIds)
    : [];

  if (medicineIds.length === 0) {
    return getEmptySellerDashboard(seller);
  }

  // 6. Get order items for seller's medicines
  const orderItems = await prisma.orderItem.findMany({
    where: { medicineId: { in: medicineIds } },
    include: {
      order: true,
      medicine: {
        include: {
          category: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  // 7. Order Statistics
  const orderStats = await getOrderStatistics(orderItems);
  
  // 8. Revenue Statistics
  const revenueStats = await getRevenueStatistics(orderItems);
  
  // 9. Monthly Revenue Chart (last 6 months)
  const monthlyRevenue = medicineIds.length > 0 
    ? await getMonthlyRevenue(medicineIds)
    : [];

  // 10. Order Status Distribution
  const orderStatusDistribution = getOrderStatusDistribution(orderStats);
  
  // 11. Top Selling Products
  const topProducts = medicineIds.length > 0
    ? await getTopSellingProducts(seller.id)
    : [];

  // 12. Recent Orders (last 10)
  const recentOrders = orderStats.recent.slice(0, 10);

  return {
    seller: {
      id: seller.id,
      shopName: seller.shopName,
      shopAddress: seller.shopAddress,
      phoneNumber: seller.phoneNumber,
      isApproved: seller.isApproved,
      user: seller.user,
      joinedDate: seller.createdAt,
    },
    products: productStats,
    categories: {
      distribution: categoryDistribution,
      performance: categoryPerformance,
      totalCategories: categoryDistribution.length,
    },
    orders: {
      total: orderStats.total,
      pending: orderStats.pending,
      processing: orderStats.processing,
      shipped: orderStats.shipped,
      delivered: orderStats.delivered,
      cancelled: orderStats.cancelled,
      recent: recentOrders,
    },
    revenue: revenueStats,
    charts: {
      monthlyRevenue,
      orderStatus: orderStatusDistribution,
      topProducts,
    },
    lastUpdated: new Date(),
  };
};

// ==================== HELPER FUNCTIONS ====================

// Get empty dashboard for sellers with no products
const getEmptySellerDashboard = (seller: any) => {
  return {
    seller: {
      id: seller.id,
      shopName: seller.shopName,
      shopAddress: seller.shopAddress,
      phoneNumber: seller.phoneNumber,
      isApproved: seller.isApproved,
      user: seller.user,
      joinedDate: seller.createdAt,
    },
    products: {
      total: 0,
      active: 0,
      inactive: 0,
      lowStock: 0,
      outOfStock: 0,
      totalInventoryValue: 0,
    },
    categories: {
      distribution: [],
      performance: [],
      totalCategories: 0,
    },
    orders: {
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      recent: [],
    },
    revenue: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      averageOrderValue: 0,
    },
    charts: {
      monthlyRevenue: [],
      orderStatus: {
        PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0
      },
      topProducts: [],
    },
    lastUpdated: new Date(),
  };
};

// Get category distribution for seller's products
const getCategoryDistribution = async (sellerId: string) => {
  const categories = await prisma.category.findMany({
    where: {
      medicines: {
        some: { sellerId }
      }
    },
    include: {
      _count: {
        select: {
          medicines: {
            where: { sellerId }
          }
        }
      }
    }
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count.medicines,
    percentage: 0,
  }));
};

// Get category performance (sales by category)
const getCategoryPerformance = async (medicineIds: string[]) => {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      medicineId: { in: medicineIds },
      order: { status: { not: 'CANCELLED' } }
    },
    include: {
      medicine: {
        include: {
          category: true
        }
      }
    }
  });

  const categoryMap = new Map();

  orderItems.forEach(item => {
    const category = item.medicine.category;
    if (!category) return;

    if (!categoryMap.has(category.id)) {
      categoryMap.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        totalSales: 0,
        totalQuantity: 0,
        orderCount: 0,
      });
    }

    const stats = categoryMap.get(category.id);
    stats.totalSales += item.totalPrice.toNumber();
    stats.totalQuantity += item.quantity;
    stats.orderCount += 1;
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => b.totalSales - a.totalSales);
};

// Get order statistics
const getOrderStatistics = async (orderItems: any[]) => {
  const uniqueOrderIds = [...new Set(orderItems.map(item => item.orderId))];
  
  const orders = await prisma.order.findMany({
    where: { id: { in: uniqueOrderIds } },
    include: {
      customer: {
        include: {
          user: { select: { name: true, email: true, image: true } }
        }
      },
      items: {
        where: { medicineId: { in: orderItems.map(i => i.medicineId) } },
        include: { medicine: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    recent: orders.slice(0, 10).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      sellerTotal: order.items.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0),
      createdAt: order.createdAt,
      customer: order.customer.user,
      itemCount: order.items.length,
    })),
  };
};

// Get revenue statistics
const getRevenueStatistics = async (orderItems: any[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const validItems = orderItems.filter(item => item.order.status !== 'CANCELLED');
  
  const total = validItems.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
  const todayRevenue = validItems
    .filter(item => item.order.createdAt >= today)
    .reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
  const weekRevenue = validItems
    .filter(item => item.order.createdAt >= weekAgo)
    .reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
  const monthRevenue = validItems
    .filter(item => item.order.createdAt >= monthAgo)
    .reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);

  const uniqueOrders = [...new Set(validItems.map(item => item.orderId))];
  const avgOrderValue = uniqueOrders.length > 0 ? total / uniqueOrders.length : 0;

  return {
    total,
    today: todayRevenue,
    thisWeek: weekRevenue,
    thisMonth: monthRevenue,
    averageOrderValue: avgOrderValue,
  };
};

// Get monthly revenue for chart
const getMonthlyRevenue = async (medicineIds: string[]) => {
  const result = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE_TRUNC('month', o."createdAt") as month,
      SUM(oi."totalPrice") as revenue,
      COUNT(DISTINCT o.id) as order_count
    FROM "order_items" oi
    JOIN "orders" o ON oi."orderId" = o.id
    WHERE oi."medicineId" = ANY(${medicineIds}::text[])
      AND o.status != 'CANCELLED'
    GROUP BY DATE_TRUNC('month', o."createdAt")
    ORDER BY month DESC
    LIMIT 6
  `;
  
  return result.map(item => ({
    month: new Date(item.month).toLocaleString('default', { month: 'short', year: 'numeric' }),
    revenue: Number(item.revenue),
    orderCount: Number(item.order_count),
  })).reverse();
};

// Get order status distribution
const getOrderStatusDistribution = (orderStats: any) => {
  return {
    PENDING: orderStats.pending,
    PROCESSING: orderStats.processing,
    SHIPPED: orderStats.shipped,
    DELIVERED: orderStats.delivered,
    CANCELLED: orderStats.cancelled,
  };
};

// Get top selling products
const getTopSellingProducts = async (sellerId: string, limit: number = 5) => {
  const result = await prisma.orderItem.groupBy({
    by: ['medicineId'],
    where: {
      medicine: { sellerId },
      order: { status: { not: 'CANCELLED' } }
    },
    _sum: {
      quantity: true,
      totalPrice: true
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: limit
  });

  const medicineIds = result.map(r => r.medicineId);
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: medicineIds } },
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });

  return result.map(item => {
    const medicine = medicines.find(m => m.id === item.medicineId);
    return {
      medicineId: item.medicineId,
      name: medicine?.name || 'Unknown',
      price: medicine?.price.toNumber() || 0,
      image: medicine?.image,
      category: medicine?.category,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: item._sum.totalPrice?.toNumber() || 0,
      currentStock: medicine?.stock || 0,
    };
  });
};

// ==================== SELLER ORDERS (Paginated) ====================

const getSellerOrders = async (
  sellerUserId: string, 
  page: number = 1, 
  limit: number = 10, 
  status?: string,
  startDate?: Date,
  endDate?: Date
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });

  if (!seller) {
    throw new AppError(404, "Seller not found");
  }

  const sellerMedicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    select: { id: true }
  });

  const medicineIds = sellerMedicines.map(m => m.id);

  if (medicineIds.length === 0) {
    return {
      orders: [],
      meta: { page, limit, total: 0, totalPages: 0 }
    };
  }

  const skip = (page - 1) * limit;
  
  const where: any = {
    items: {
      some: {
        medicineId: { in: medicineIds }
      }
    }
  };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          include: {
            user: { 
              select: { 
                id: true,
                name: true, 
                email: true, 
                image: true
              } 
            }
          }
        },
        items: {
          where: { medicineId: { in: medicineIds } },
          include: { 
            medicine: {
              include: { category: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.order.count({ where })
  ]);

  const formattedOrders = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount.toNumber(),
    sellerTotal: order.items.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0),
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    customer: {
      id: order.customer.user.id,
      name: order.customer.user.name,
      email: order.customer.user.email,
      image: order.customer.user.image,
      phoneNumber: order.customer.phoneNumber,
    },
    items: order.items.map(item => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      medicineImage: item.medicineImage,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      category: item.medicine.category,
    })),
  }));

  return {
    orders: formattedOrders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    }
  };
};

// ==================== LOW STOCK PRODUCTS ====================

const getLowStockProducts = async (sellerUserId: string, threshold: number = 10) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }

  const products = await prisma.medicine.findMany({
    where: {
      sellerId: seller.id,
      stock: { lt: threshold },
      isActive: true
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { stock: 'asc' }
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    price: p.price.toNumber(),
    image: p.image,
    manufacturer: p.manufacturer,
    category: p.category,
    isActive: p.isActive,
    status: p.stock === 0 ? 'OUT_OF_STOCK' : p.stock < 5 ? 'CRITICAL' : 'LOW',
  }));
};

// ==================== PRODUCT PERFORMANCE ====================

const getProductPerformance = async (sellerUserId: string, productId?: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }

  const whereCondition: any = { sellerId: seller.id };
  if (productId) {
    whereCondition.id = productId;
  }

  const products = await prisma.medicine.findMany({
    where: whereCondition,
    include: {
      category: true,
      orderItems: {
        include: { order: true }
      },
      reviews: true
    }
  });

  return products.map(product => {
    const salesData = product.orderItems.filter(item => item.order.status !== 'CANCELLED');
    const totalQuantity = salesData.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = salesData.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

    return {
      id: product.id,
      name: product.name,
      price: product.price.toNumber(),
      stock: product.stock,
      category: product.category,
      isActive: product.isActive,
      stats: {
        totalSales: totalQuantity,
        totalRevenue,
        orderCount: salesData.length,
        avgRating,
        reviewCount: product.reviews.length,
      },
      stockStatus: product.stock === 0 ? 'OUT_OF_STOCK' : product.stock < 10 ? 'LOW_STOCK' : 'IN_STOCK',
    };
  });
};

// ==================== EXPORT SERVICE ====================

export const DashboardService = {
  // Admin dashboard
  getAdminDashboardStats,
  
  // Seller dashboard functions
  getSellerDashboardStats,
  getSellerOrders,
  getLowStockProducts,
  getProductPerformance,
  getCategoryPerformance,
  getTopSellingProducts,
};