// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais
// do Supabase. Encontre-as em: Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL = 'https://uxvtqnlkjkprxjclvbrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dnRxbmxramtwcnhqY2x2YnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODQ2MjQsImV4cCI6MjA4ODA2MDYyNH0.QHUV_F48KCpgGv_Fvc-Lfqkt4kz9gzefMS0Vyh0nSyM';

// Inicializar cliente Supabase com verificação de segurança
let supabaseClient = null;

try {
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase inicializado com sucesso');
    } else {
        throw new Error('SDK do Supabase não carregou');
    }
} catch (e) {
    console.error('ERRO ao inicializar Supabase:', e);
    document.addEventListener('DOMContentLoaded', function() {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;font-family:sans-serif;">' +
            '<h2>Erro ao carregar o sistema</h2>' +
            '<p>Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.</p>' +
            '<button onclick="location.reload()" style="padding:10px 20px;font-size:16px;cursor:pointer;">Recarregar</button>' +
            '</div>';
    });
}
