import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { SearchController } from "./search.controller";

const router = Router();

router.get("/popular", SearchController.getPopularSearches);
router.get("/history", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.getSearchHistory);
router.post("/save", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.saveSearch);
router.delete("/history", checkAuth(Role.CUSTOMER, Role.SELLER), SearchController.clearSearchHistory);

export const SearchRoutes = router;