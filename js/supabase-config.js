// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais
// do Supabase. Encontre-as em: Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL = 'sb_publishable_NIke-WDjOGifO2BBGdujsg_WI7rk_ts'; // Ex: https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'sb_secret_N9l0Rjez5th0dC4JEq5K2w_4olWzaF2'; // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
