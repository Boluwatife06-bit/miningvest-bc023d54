import { supabase } from "@/integrations/supabase/client";

export const formatNaira = (amount: number) => {
  return `₦${amount.toLocaleString("en-NG")}`;
};

export const formatPhone = (phone: string) => {
  // Normalize Nigerian phone: 08012345678 or +2348012345678
  let normalized = phone.trim();
  if (normalized.startsWith("+234")) {
    normalized = "0" + normalized.slice(4);
  } else if (normalized.startsWith("234")) {
    normalized = "0" + normalized.slice(3);
  }
  return normalized;
};

export const validateNigerianPhone = (phone: string): boolean => {
  const normalized = formatPhone(phone);
  return /^0[789]\d{9}$/.test(normalized);
};

// Phone-based auth: we use phone as email with a fake domain trick
export const phoneToEmail = (phone: string): string => {
  const normalized = formatPhone(phone);
  return `${normalized}@miningvest.ng`;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
};

export const isAdmin = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
};
