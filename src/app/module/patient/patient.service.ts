import { Prisma, Patient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

// CREATE
const createPatients = async (
  payload: Prisma.PatientCreateManyInput[]
) => {
  const result = await prisma.patient.createMany({
    data: payload,
    skipDuplicates: true, // একই email থাকলে skip করবে
  });
  return result; // শুধু inserted count দিবে
};
// GET ALL
const getAllPatients = async (): Promise<Patient[]> => {
  return await prisma.patient.findMany();
};

// UPDATE
const updatePatient = async (
  id: string,
  payload: Partial<Prisma.PatientUpdateInput>
) => {
  const result = await prisma.patient.update({
    where: { id },
    data: payload,
  });

  return result;
};

// DELETE
const deletePatient = async (id: string): Promise<Patient> => {
  try {
    const result = await prisma.patient.delete({
      where: { id },
    });
    return result;
  } catch (error) {
    throw new Error("Patient not found or already deleted", { cause: error });
  }
};


export const PatientService = {
  createPatients,
  getAllPatients,
  updatePatient,
  deletePatient,
};