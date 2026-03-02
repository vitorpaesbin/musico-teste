// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais
// do Supabase. Encontre-as em: Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL = 'https://uxvtqnlkjkprxjclvbrm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NIke-WDjOGifO2BBGdujsg_WI7rk_ts';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
