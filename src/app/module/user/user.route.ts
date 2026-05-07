import { Router } from "express";
import { Role } from "../../types/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { updateMyProfileMiddleware } from "./user.middlewares";
import { multerUpload } from "../../config/multer.config";
import { UserValidation } from "./user.validation";

const router = Router();

router.patch(
  "/update-my-profile",
  checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), // ✅ এটা আগে ছিল না
  multerUpload.fields([{ name: "profilePhoto", maxCount: 1 }]),
  updateMyProfileMiddleware,
  validateRequest(UserValidation.updateUserProfileZodSchema),
  UserController.updateMyProfile
);

router.delete(
  "/remove-profile-photo",
  checkAuth(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN),
  UserController.removeProfilePhoto
);

export const UserRoutes = router;