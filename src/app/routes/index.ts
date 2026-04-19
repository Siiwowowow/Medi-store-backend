import { Router } from "express";
import { AuthRouters } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
const router=Router();
 router.use("/auth", AuthRouters);
 router.use("/users", UserRoutes); 
export const IndexRoutes=router;