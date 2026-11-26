import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient("https://bfkygoqjjuejvrksvtdy.supabase.co", "sb_publishable_MpZPRXqtW3q30kAPrsKS6A_L5vAA7jw", {
  auth: { storage: typeof window === "undefined" ? undefined : AsyncStorage, autoRefreshToken: typeof window !== "undefined", persistSession: typeof window !== "undefined", detectSessionInUrl: false },
});