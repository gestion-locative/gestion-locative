import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://biaevdihbpryxhoclrtt.supabase.co";
const supabaseAnonKey = "sb_publishable_cVcLvVb3xESynJn3Xx-Tbg_hn3ckQ7u";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);