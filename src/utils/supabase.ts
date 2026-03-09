import { createClient } from '@supabase/supabase-js'

// Viteでは process.env ではなく import.meta.env を使用します
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
