import { Request, Response } from "express";
import { PatientService } from "./patient.service";

// CREATE
const createPatients = async (req: Request, res: Response) => {
  try {
    const payload = req.body; // expect array
    const result = await PatientService.createPatients(payload);

    res.status(201).json({
      success: true,
      message: "Patients created successfully",
      data: result,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error creating patients",
      error: error.message || "Internal Server Error",
    });
  }
};


// GET
const getAllPatients = async (req: Request, res: Response) => {
  const result = await PatientService.getAllPatients();

  res.status(200).json({
    success: true,
    data: result,
  });
};

const deletePatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await PatientService.deletePatient(id as string);

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: result,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
const updatePatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const result = await PatientService.updatePatient(
      id as string,
      payload
    );

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: result,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error updating specialty:", error);

    res.status(500).json({
      success: false,
      message: "Error updating specialty",
      error: error.message || "Internal Server Error",
    });
  }
};


export const PatientController = {
  createPatients,
  getAllPatients,
  updatePatient,
  deletePatient,
};