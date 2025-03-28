import { validate as uuidValidate, version as uuidVersion } from "uuid";

export const isValidUUID = (uuid: string): boolean => {
  return uuidValidate(uuid) && uuidVersion(uuid) === 4;
};

export const formatUUID = (id: string | null | undefined): string | null => {
  if (!id) return null;

  // If it's a number or numeric string, return as is
  if (!isNaN(Number(id))) {
    return id;
  }

  // If already a valid UUID, return as is
  if (isValidUUID(id)) return id;

  // Try to format as UUID
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, "");
  if (cleanId.length !== 32) return null;

  const uuid = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
  return isValidUUID(uuid) ? uuid : null;
};

export const ensureUUID = (id: any): string | null => {
  if (!id) return null;

  // If it's a number, return as string
  if (typeof id === "number") {
    return String(id);
  }

  const strId = String(id);

  // If it's a numeric string, return as is
  if (!isNaN(Number(strId))) {
    return strId;
  }

  return formatUUID(strId);
};
