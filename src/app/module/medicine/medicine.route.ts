import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { MedicineController } from "./medicine.controller";
import { handleProductPhotoUpload } from "../../middleware/fileUpload.middleware";

const router = Router();
const sellerRouter = Router();

router.get("/", MedicineController.getAllMedicines);

router.get("/manufacturers", MedicineController.getManufacturers);

router.get("/slug/:slug", MedicineController.getMedicineBySlug);


// 🔒 Apply auth once (no repetition)
sellerRouter.use(checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN));

// CRUD
sellerRouter.post(
  "/",
  handleProductPhotoUpload,
  MedicineController.createMedicine
);

sellerRouter.patch(
  "/:id",
  handleProductPhotoUpload,
  MedicineController.updateMedicine
);

sellerRouter.delete(
  "/:id",
  MedicineController.deleteMedicine
);

// seller specific
sellerRouter.get("/my-medicines", MedicineController.getSellerMedicines);
sellerRouter.get("/stats", MedicineController.getMedicineStats);

// mount seller routes
router.use("/seller", sellerRouter);


/**
 * ==================== DYNAMIC ROUTES (ALWAYS LAST) ====================
 */
router.get("/:id", MedicineController.getMedicineById);

export const MedicineRoutes = router;