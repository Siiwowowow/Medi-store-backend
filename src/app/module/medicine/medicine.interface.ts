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
  image?: string;
}

export interface IUpdateMedicinePayload extends Partial<ICreateMedicinePayload> {
  isActive?: boolean;
}

export interface IMedicineFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  manufacturer?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}