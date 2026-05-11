// @ts-nocheck
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { CategoryController } from "./category.controller.js";
import { handleProductPhotoUpload } from "../../middleware/fileUpload.middleware.js";
import { Role } from "../../types/enums.js";

const router = Router();

// Public routes
router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.get("/:id", CategoryController.getCategoryById);

// Admin only routes
router.post("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), handleProductPhotoUpload, CategoryController.createCategory);
router.patch("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), handleProductPhotoUpload, CategoryController.updateCategory);
router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.deleteCategory);

export const CategoryRoutes = router;
