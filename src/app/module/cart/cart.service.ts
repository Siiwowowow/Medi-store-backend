import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IAddToCartPayload, IUpdateCartPayload, ICartItemResponse } from "./cart.interface";

const getOrCreateCart = async (customerId: string) => {
  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              stock: true,
            }
          }
        }
      }
    }
  });
  
  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
      include: {
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                stock: true,
              }
            }
          }
        }
      }
    });
  }
  
  return cart;
};

const getCart = async (customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can access cart");
  }
  
  const cart = await getOrCreateCart(customer.id);
  
  const items: ICartItemResponse[] = cart.items.map(item => ({
    id: item.id,
    medicineId: item.medicineId,
    name: item.medicine.name,
    price: item.medicine.price.toNumber(),
    quantity: item.quantity,
    image: item.medicine.image,  // 👈 Now allows null
    stock: item.medicine.stock,
    subtotal: item.medicine.price.toNumber() * item.quantity,
  }));
  
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    items,
    totalAmount,
    totalItems,
  };
};

const addToCart = async (customerUserId: string, payload: IAddToCartPayload) => {
  const { medicineId, quantity } = payload;
  
  if (quantity < 1) {
    throw new AppError(status.BAD_REQUEST, "Quantity must be at least 1");
  }
  
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can add to cart");
  }
  
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId, isActive: true }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }
  
  if (medicine.stock < quantity) {
    throw new AppError(status.BAD_REQUEST, `Only ${medicine.stock} items available in stock`);
  }
  
  const cart = await getOrCreateCart(customer.id);
  
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_medicineId: {
        cartId: cart.id,
        medicineId,
      }
    }
  });
  
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (medicine.stock < newQuantity) {
      throw new AppError(status.BAD_REQUEST, `Only ${medicine.stock} items available in stock`);
    }
    
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        medicineId,
        quantity,
      }
    });
  }
  
  return getCart(customerUserId);
};

const updateCartItem = async (customerUserId: string, itemId: string, payload: IUpdateCartPayload) => {
  const { quantity } = payload;
  
  if (quantity < 0) {
    throw new AppError(status.BAD_REQUEST, "Quantity cannot be negative");
  }
  
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      medicine: true
    }
  });
  
  if (!cartItem) {
    throw new AppError(status.NOT_FOUND, "Cart item not found");
  }
  
  if (cartItem.cart.customerId !== customer.id) {
    throw new AppError(status.FORBIDDEN, "You don't have permission to modify this cart");
  }
  
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    if (cartItem.medicine.stock < quantity) {
      throw new AppError(status.BAD_REQUEST, `Only ${cartItem.medicine.stock} items available in stock`);
    }
    
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });
  }
  
  return getCart(customerUserId);
};

const removeFromCart = async (customerUserId: string, itemId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true }
  });
  
  if (!cartItem) {
    throw new AppError(status.NOT_FOUND, "Cart item not found");
  }
  
  if (cartItem.cart.customerId !== customer.id) {
    throw new AppError(status.FORBIDDEN, "You don't have permission to modify this cart");
  }
  
  await prisma.cartItem.delete({ where: { id: itemId } });
  
  return getCart(customerUserId);
};

const clearCart = async (customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  await prisma.cartItem.deleteMany({
    where: { cart: { customerId: customer.id } }
  });
  
  return { items: [], totalAmount: 0, totalItems: 0 };
};

export const CartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};