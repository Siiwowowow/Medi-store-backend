import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { CategoryController } from "./category.controller";

const router = Router();

// Public routes
router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.get("/:id", CategoryController.getCategoryById);

// Admin only routes
router.post("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.createCategory);
router.patch("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.updateCategory);
router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.deleteCategory);

export const CategoryRoutes = router;