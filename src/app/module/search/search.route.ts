// @ts-nocheck
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { SearchController } from "./search.controller.js";
import { Role } from "../../types/enums.js";

const router = Router();

router.get("/popular", SearchController.getPopularSearches);
router.get("/history", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.getSearchHistory);
router.post("/save", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.saveSearch);
router.delete("/history", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.clearSearchHistory);

export const SearchRoutes = router;
