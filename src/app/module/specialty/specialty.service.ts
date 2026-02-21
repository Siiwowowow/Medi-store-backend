import { Prisma, Specialty } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createSpecialty = async (
  payload: Prisma.SpecialtyCreateManyInput[]
) => {
  const result = await prisma.specialty.createMany({
    data: payload,
    skipDuplicates: true,
  });

  return result;
};

const getAllSpecialties = async (): Promise<Specialty[]> => {
  const specialties = await prisma.specialty.findMany();
  return specialties;
};

const deleteSpecialty = async (id: string) => {
  const result = await prisma.specialty.delete({
    where: { id },
  });
  return result;
};

const updateSpecialty = async (
  id: string,
  payload: Partial<Prisma.SpecialtyUpdateInput>
) => {
  const result = await prisma.specialty.update({
    where: { id },
    data: payload,
  });

  return result;
};


export const SpecialtyService = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty,
  updateSpecialty,
};