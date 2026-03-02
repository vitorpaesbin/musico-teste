// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais
// do Supabase. Encontre-as em: Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL = 'https://uxvtqnlkjkprxjclvbrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dnRxbmxramtwcnhqY2x2YnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODQ2MjQsImV4cCI6MjA4ODA2MDYyNH0.QHUV_F48KCpgGv_Fvc-Lfqkt4kz9gzefMS0Vyh0nSyM';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
