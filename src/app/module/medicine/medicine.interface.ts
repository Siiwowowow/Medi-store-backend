export interface ICreateMedicinePayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  manufacturer: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  categoryId?: string;

  // Cloudinary image URL
  image?: string;
}

export interface IUpdateMedicinePayload
  extends Partial<ICreateMedicinePayload> {
  isActive?: boolean;
}
export interface IMedicineFilters {
  search?: string;
  categoryId?: string;
  manufacturer?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}