import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const fallbackSupabaseUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co";
const fallbackSupabaseKey = "sb_publishable_MARbgY52A-tYXaVqupaxqA_rMWAJZhu";
const expoEnv = process.env as Record<string, string | undefined>;

const supabaseUrl = expoEnv.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseKey = expoEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSupabaseKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === "web"
  }
});
