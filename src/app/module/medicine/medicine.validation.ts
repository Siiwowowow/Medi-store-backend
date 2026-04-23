import z from "zod";

export const createMedicineZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  manufacturer: z.string().min(2, "Manufacturer name required"),
  genericName: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  categoryId: z.string().optional(),
  image: z.string().url().optional(),
});

export const updateMedicineZodSchema = createMedicineZodSchema.partial().extend({
  isActive: z.boolean().optional(),
});