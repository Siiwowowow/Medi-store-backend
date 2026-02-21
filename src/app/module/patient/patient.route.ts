import { Router } from "express";
import { PatientController } from "./patient.controller";

const router = Router();

router.post("/", PatientController.createPatients);
router.get("/", PatientController.getAllPatients);
router.patch("/:id", PatientController.updatePatient);
router.delete("/:id", PatientController.deletePatient);

export const PatientRoutes = router;