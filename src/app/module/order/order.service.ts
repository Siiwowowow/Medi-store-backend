/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateOrderPayload, IUpdateOrderStatusPayload, IOrderFilters } from "./order.interface";

const generateOrderNumber = (): string => {
  const prefix = 'MED';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const createOrder = async (customerUserId: string, payload: ICreateOrderPayload) => {
  // Get customer profile
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId },
    include: { user: true }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can place orders");
  }
  
  if (!payload.items || payload.items.length === 0) {
    throw new AppError(status.BAD_REQUEST, "Order must contain at least one item");
  }
  
  let totalAmount = 0;
  const orderItemsData = [];
  
  // Validate each item and calculate total
  for (const item of payload.items) {
    const medicine = await prisma.medicine.findUnique({
      where: { id: item.medicineId }
    });
    
    if (!medicine) {
      throw new AppError(status.NOT_FOUND, `Medicine not found`);
    }
    
    if (!medicine.isActive) {
      throw new AppError(status.BAD_REQUEST, `${medicine.name} is currently unavailable`);
    }
    
    if (medicine.stock < item.quantity) {
      throw new AppError(status.BAD_REQUEST, `Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
    }
    
    const totalPrice = medicine.price.toNumber() * item.quantity;
    totalAmount += totalPrice;
    
    orderItemsData.push({
      medicineId: medicine.id,
      medicineName: medicine.name,
      medicineImage: medicine.image,
      quantity: item.quantity,
      unitPrice: medicine.price,
      totalPrice,
    });
    
    // Update stock
    await prisma.medicine.update({
      where: { id: medicine.id },
      data: { stock: { decrement: item.quantity } }
    });
  }
  
  // Create order
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customer.id,
      customerName: customer.user.name || 'Customer',
      customerEmail: customer.user.email,
      customerPhone: payload.phoneNumber,
      shippingAddress: payload.shippingAddress,
      totalAmount,
      notes: payload.notes,
      status: 'PENDING',
      items: {
        create: orderItemsData
      }
    },
    include: {
      items: true
    }
  });
  
  // Clear cart after order placement
  const cart = await prisma.cart.findUnique({
    where: { customerId: customer.id }
  });
  
  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });
  }
  
  return order;
};
// Add this new function to OrderService
const getAllOrders = async (filters: IOrderFilters = {}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            medicineName: true,
            medicineImage: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          }
        },
        customer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  
  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getCustomerOrders = async (customerUserId: string, filters: IOrderFilters = {}) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { customerId: customer.id };
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            medicineName: true,
            medicineImage: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  
  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getOrderById = async (orderId: string, customerUserId?: string, sellerUserId?: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              slug: true,
              sellerId: true,
            }
          }
        }
      }
    }
  });
  
  if (!order) {
    throw new AppError(status.NOT_FOUND, "Order not found");
  }
  
  // Check permission
  if (customerUserId) {
    const customer = await prisma.customer.findUnique({
      where: { userId: customerUserId }
    });
    
    if (!customer || order.customerId !== customer.id) {
      throw new AppError(status.FORBIDDEN, "You don't have permission to view this order");
    }
  }
  
  if (sellerUserId) {
    const seller = await prisma.seller.findUnique({
      where: { userId: sellerUserId }
    });
    
    if (!seller) {
      throw new AppError(status.FORBIDDEN, "Seller not found");
    }
    
    const hasSellerItems = order.items.some(item => item.medicine.sellerId === seller.id);
    if (!hasSellerItems) {
      throw new AppError(status.FORBIDDEN, "You don't have permission to view this order");
    }
  }
  
  return order;
};

const cancelOrder = async (orderId: string, customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: customer.id,
    },
    include: {
      items: true
    }
  });
  
  if (!order) {
    throw new AppError(status.NOT_FOUND, "Order not found");
  }
  
  if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
    throw new AppError(status.BAD_REQUEST, `Cannot cancel order with status: ${order.status}`);
  }
  
  // Restore stock
  for (const item of order.items) {
    await prisma.medicine.update({
      where: { id: item.medicineId },
      data: { stock: { increment: item.quantity } }
    });
  }
  
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    }
  });
};

const getSellerOrders = async (sellerUserId: string, filters: IOrderFilters = {}) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Seller not found");
  }
  
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;
  
  // Get all medicines belonging to this seller
  const sellerMedicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    select: { id: true }
  });
  
  const medicineIds = sellerMedicines.map(m => m.id);
  
  if (medicineIds.length === 0) {
    return { orders: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }
  
  // Find orders containing these medicines
  const orderItems = await prisma.orderItem.findMany({
    where: {
      medicineId: { in: medicineIds }
    },
    include: {
      order: {
        include: {
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  sellerId: true,
                }
              }
            }
          }
        }
      }
    },
    orderBy: { order: { createdAt: 'desc' } }
  });
  
  // Deduplicate orders and filter by status
  const uniqueOrders = new Map();
  for (const item of orderItems) {
    if (!uniqueOrders.has(item.order.id)) {
      if (!filters.status || item.order.status === filters.status) {
        uniqueOrders.set(item.order.id, item.order);
      }
    }
  }
  
  let orders = Array.from(uniqueOrders.values());
  const total = orders.length;
  
  // Paginate
  orders = orders.slice(skip, skip + limit);
  
  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const updateOrderStatus = async (orderId: string, sellerUserId: string, payload: IUpdateOrderStatusPayload) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Seller not found");
  }
  
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      items: {
        include: {
          medicine: true
        }
      }
    }
  });
  
  if (!order) {
    throw new AppError(status.NOT_FOUND, "Order not found");
  }
  
  const hasSellerItems = order.items.some(item => item.medicine.sellerId === seller.id);
  if (!hasSellerItems) {
    throw new AppError(status.FORBIDDEN, "You don't have permission to update this order");
  }
  
  // If order is being cancelled, restore stock
  if (payload.status === 'CANCELLED' && order.status !== 'CANCELLED') {
    for (const item of order.items) {
      await prisma.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } }
      });
    }
  }
  
  // If order is being delivered, set deliveredAt
  const updateData: any = { status: payload.status };
  if (payload.status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }
  
  return prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: { items: true }
  });
};

const getOrderStats = async (sellerUserId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Seller not found");
  }
  
  const sellerMedicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    select: { id: true }
  });
  
  const medicineIds = sellerMedicines.map(m => m.id);
  
  if (medicineIds.length === 0) {
    return {
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
  }
  
  const orderItems = await prisma.orderItem.findMany({
    where: {
      medicineId: { in: medicineIds }
    },
    include: {
      order: true
    }
  });
  
  const uniqueOrderIds = [...new Set(orderItems.map(item => item.orderId))];
  
  const orders = await prisma.order.findMany({
    where: {
      id: { in: uniqueOrderIds }
    }
  });
  
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  };
};


export const OrderService = {
  createOrder,
    getAllOrders,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  getSellerOrders,
  updateOrderStatus,
  getOrderStats,
};