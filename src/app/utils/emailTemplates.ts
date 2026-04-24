/* eslint-disable @typescript-eslint/no-explicit-any */
export const emailTemplates = {
  orderConfirmation: (order: any) => ({
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your order!</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your order has been confirmed successfully.</p>
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
        <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
        <h3>Items:</h3>
        <ul>
          ${order.items.map((item: any) => `<li>${item.quantity}x ${item.medicineName} - $${item.totalPrice}</li>`).join('')}
        </ul>
        <p>We'll notify you once your order is shipped.</p>
        <p>Thank you for shopping with MediStore!</p>
      </div>
    `
  }),
  
  orderStatusUpdate: (order: any, newStatus: string) => ({
    subject: `Order ${newStatus} - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Status Update</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your order <strong>${order.orderNumber}</strong> is now <strong style="color: #4CAF50;">${newStatus}</strong>.</p>
        ${newStatus === 'SHIPPED' ? '<p>Your order has been shipped and will arrive soon.</p>' : ''}
        ${newStatus === 'DELIVERED' ? '<p>Your order has been delivered. We hope you enjoy your purchase!</p>' : ''}
        <p>Track your order status in your account dashboard.</p>
        <p>Thank you for shopping with MediStore!</p>
      </div>
    `
  }),
  
  sellerApproval: (seller: any) => ({
    subject: "Seller Account Approved - MediStore",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Congratulations! Your Seller Account is Approved</h2>
        <p>Dear ${seller.user.name},</p>
        <p>Your seller account for <strong>${seller.shopName}</strong> has been approved by the admin.</p>
        <p>You can now:</p>
        <ul>
          <li>Add medicines to your inventory</li>
          <li>Manage your orders</li>
          <li>Update stock levels</li>
        </ul>
        <p>Login to your seller dashboard to get started.</p>
        <p>Welcome to MediStore!</p>
      </div>
    `
  }),
  
  welcomeEmail: (user: any) => ({
    subject: "Welcome to MediStore!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MediStore!</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for joining MediStore - Your Trusted Online Medicine Shop.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse thousands of medicines</li>
          <li>Get medicines delivered to your doorstep</li>
          <li>Track your orders in real-time</li>
        </ul>
        <p>Start shopping now!</p>
        <p>Need help? Contact our support team.</p>
      </div>
    `
  }),
};