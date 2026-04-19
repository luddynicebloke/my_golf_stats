import { supabase } from "./client";

export type AccessiblePlayer = {
  id: string;
  email: string | null;
  user_name: string | null;
};

export type AvailablePro = {
  id: string;
  email: string | null;
  user_name: string | null;
};

type DirectoryRow = {
  id: string | null;
  email: string | null;
  user_name: string | null;
};

const normalizePersonRow = (row: DirectoryRow): AccessiblePlayer | null => {
  if (!row.id) {
    return null;
  }

  return {
    id: row.id,
    email: row.email ?? null,
    user_name: row.user_name ?? null,
  };
};

export const fetchAvailablePros = async (): Promise<AvailablePro[]> => {
  const { data, error } = await supabase.rpc("get_available_pros");

  if (error) {
    console.error("Failed to load available pros:", error);
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((row) => normalizePersonRow(row as DirectoryRow))
        .filter((row): row is AvailablePro => row !== null)
    : [];
};

export const fetchAssignedProIds = async (): Promise<string[]> => {
  const { data, error } = await supabase.rpc("get_my_pro_access");

  if (error) {
    console.error("Failed to load selected pros:", error);
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((row) =>
          typeof row === "object" && row !== null && "pro_user_id" in row
            ? String((row as { pro_user_id: string | null }).pro_user_id ?? "")
            : "",
        )
        .filter((id) => id.length > 0)
    : [];
};

export const fetchAccessiblePlayersForPro = async (): Promise<
  AccessiblePlayer[]
> => {
  const { data, error } = await supabase.rpc("get_players_for_pro");

  if (error) {
    console.error("Failed to load accessible players:", error);
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((row) => normalizePersonRow(row as DirectoryRow))
        .filter((row): row is AccessiblePlayer => row !== null)
    : [];
};

export const grantProAccess = async (proUserId: string): Promise<string | null> => {
  const { error } = await supabase.rpc("grant_pro_access", {
    p_pro_user_id: proUserId,
  });

  return error ? error.message : null;
};

export const revokeProAccess = async (
  proUserId: string,
): Promise<string | null> => {
  const { error } = await supabase.rpc("revoke_pro_access", {
    p_pro_user_id: proUserId,
  });

  return error ? error.message : null;
};
