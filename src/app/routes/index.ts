import { Router } from "express";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";
import { PatientRoutes } from "../module/patient/patient.route";

const router=Router();
router.use("/specialties",SpecialtyRoutes);
router.use("/patient", PatientRoutes);
export const IndexRoutes=router;