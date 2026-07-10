import { createClient } from '@supabase/supabase-js'

// Reemplazar con tus credenciales de Supabase al hacer el deploy
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://TU_URL.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
