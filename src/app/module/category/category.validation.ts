import z from "zod";

export const createCategoryZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  description: z.string().optional(),
  image: z.string().url().optional(),
});

export const updateCategoryZodSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().optional(),
});