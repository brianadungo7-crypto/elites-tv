import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient("https://bfkygoqjjuejvrksvtdy.supabase.co", "sb_publishable_MpZPRXqtW3q30kAPrsKS6A_L5vAA7jw", {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});