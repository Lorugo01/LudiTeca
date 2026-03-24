// Reexporta o singleton de lib/supabase (evita múltiplos GoTrueClient)
import supabase from '../lib/supabase';

export { supabase };
export default supabase;