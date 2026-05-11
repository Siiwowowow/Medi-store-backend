// @ts-nocheck
export interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'SELLER';  // 👈 যোগ করুন
  shopName?: string;              // 👈 Seller এর জন্য
  shopAddress?: string;           // 👈 Seller এর জন্য
  phoneNumber?: string;           // 👈 উভয়ের জন্য
  shippingAddress?: string;       // 👈 Customer এর জন্য
}

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
