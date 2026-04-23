import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { MedicineController } from "./medicine.controller";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", MedicineController.getAllMedicines);
router.get("/manufacturers", MedicineController.getManufacturers);
router.get("/slug/:slug", MedicineController.getMedicineBySlug);
router.get("/:id", MedicineController.getMedicineById);

// ==================== SELLER ROUTES ====================
router.post("/", checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), MedicineController.createMedicine);
router.patch("/:id", checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), MedicineController.updateMedicine);
router.delete("/:id", checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), MedicineController.deleteMedicine);
router.get("/seller/my-medicines", checkAuth(Role.SELLER), MedicineController.getSellerMedicines);
router.get("/seller/stats", checkAuth(Role.SELLER), MedicineController.getMedicineStats);

export const MedicineRoutes = router;