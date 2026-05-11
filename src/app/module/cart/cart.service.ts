// @ts-nocheck
import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { IAddToCartPayload, IUpdateCartPayload, ICartItemResponse } from "./cart.interface.js";

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
              category: {
                select: {
                  name: true
                }
              }
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
                category: {
                  select: {
                    name: true
                  }
                }
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
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
  }
  
  const cart = await getOrCreateCart(customer.id);
  
  const items: ICartItemResponse[] = cart.items.map(item => ({
    id: item.id,
    medicineId: item.medicineId,
    name: item.medicine.name,
    price: item.medicine.price.toNumber(),
    quantity: item.quantity,
    image: item.medicine.image,
    stock: item.medicine.stock,
    category: item.medicine.category?.name || "Medicine",
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
  
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
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
  
  // Validate quantity
  if (quantity < 0) {
    throw new AppError(status.BAD_REQUEST, "Quantity cannot be negative");
  }
  
  // Validate itemId is provided
  if (!itemId || itemId.trim() === '') {
    throw new AppError(status.BAD_REQUEST, "Invalid cart item ID");
  }
  
  // Get user and customer
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
  }
  
  // Get the user's cart
  const cart = await prisma.cart.findUnique({
    where: { customerId: customer.id }
  });
  
  if (!cart) {
    throw new AppError(status.NOT_FOUND, "Cart not found");
  }
  
  // Find the cart item by ID, ensuring it belongs to the user's cart
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    },
    include: {
      medicine: true,
      cart: true
    }
  });
  
  if (!cartItem) {
    console.error(`Cart item not found - itemId: ${itemId}, cartId: ${cart.id}, customerId: ${customer.id}`);
    throw new AppError(status.NOT_FOUND, "Cart item not found");
  }
  
  // If quantity is 0, remove the item
  if (quantity === 0) {
    await prisma.cartItem.delete({ 
      where: { id: cartItem.id } 
    });
  } else {
    // Validate stock
    if (cartItem.medicine.stock < quantity) {
      throw new AppError(status.BAD_REQUEST, `Only ${cartItem.medicine.stock} items available in stock`);
    }
    
    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity }
    });
  }
  
  return getCart(customerUserId);
};

const removeFromCart = async (customerUserId: string, itemId: string) => {
  // Validate itemId is provided
  if (!itemId || itemId.trim() === '') {
    throw new AppError(status.BAD_REQUEST, "Invalid cart item ID");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
  }
  
  // Get the cart first
  const cart = await prisma.cart.findUnique({
    where: { customerId: customer.id }
  });
  
  if (!cart) {
    throw new AppError(status.NOT_FOUND, "Cart not found");
  }
  
  // Find cart item by ID, ensuring it belongs to this cart
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    }
  });
  
  if (!cartItem) {
    console.error(`Cart item not found - itemId: ${itemId}, cartId: ${cart.id}, customerId: ${customer.id}`);
    throw new AppError(status.NOT_FOUND, "Cart item not found");
  }
  
  await prisma.cartItem.delete({ 
    where: { id: cartItem.id } 
  });
  
  return getCart(customerUserId);
};

const clearCart = async (customerUserId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
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
