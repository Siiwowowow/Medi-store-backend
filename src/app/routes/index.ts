import { Router } from "express";
import { AuthRouters } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { AdminRoutes } from "../module/admin/admin.route";
const router=Router();
 router.use("/auth", AuthRouters);
 router.use("/users", UserRoutes); 
 router.use("/admin", AdminRoutes);
export const IndexRoutes=router;