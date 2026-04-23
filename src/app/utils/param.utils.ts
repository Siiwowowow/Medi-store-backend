// utils/param.utils.ts
export const getParamId = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};