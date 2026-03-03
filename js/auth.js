// ============================================================
// MÓDULO DE AUTENTICAÇÃO
// ============================================================

const Auth = {
    currentUser: null,
    currentProfile: null,
    isAdmin: false,
    _isHandlingAuth: false,

    init() {
        // Event listeners de formulário
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Alternar entre login e cadastro
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            this.hideMessage();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            this.hideMessage();
        });

        // Botões de logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('logout-btn-profile').addEventListener('click', () => this.logout());

        // Verificar sessão ativa
        this.checkSession();
    },

    async checkSession() {
        try {
            showLoading();
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadProfile();

                // Verificar se o membro está ativo
                if (!this.currentProfile || this.currentProfile.active !== true) {
                    await supabaseClient.auth.signOut();
                    this.currentUser = null;
                    this.currentProfile = null;
                    this.showAuth();
                    this.showMessage('Entre em contato com o administrador.', 'error');
                } else {
                    this.showApp();
                }
            } else {
                this.showAuth();
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            this.showAuth();
        } finally {
            hideLoading();
        }

        // Listener de mudança de auth
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            // Ignorar se o login() já está processando ou app já está visível
            if (this._isHandlingAuth) return;

            if (event === 'SIGNED_IN' && session) {
                // Se já está logado e app visível, ignorar evento duplicado
                if (this.currentUser && !document.getElementById('app-container').classList.contains('hidden')) {
                    return;
                }

                this.currentUser = session.user;
                await this.loadProfile();

                // Verificar se o membro está ativo
                if (!this.currentProfile || this.currentProfile.active !== true) {
                    await supabaseClient.auth.signOut();
                    this.currentUser = null;
                    this.currentProfile = null;
                    this.showAuth();
                    this.showMessage('Entre em contato com o administrador.', 'error');
                    return;
                }

                this.showApp();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.currentProfile = null;
                this.showAuth();
            }
        });
    },

    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showMessage('Preencha todos os campos', 'error');
            return;
        }

        try {
            showLoading();
            this._isHandlingAuth = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            await this.loadProfile();

            // Verificar se o membro está ativo
            if (!this.currentProfile || this.currentProfile.active !== true) {
                await supabaseClient.auth.signOut();
                this.currentUser = null;
                this.currentProfile = null;
                this.showMessage('Entre em contato com o administrador.', 'error');
                return;
            }

            this.showApp();
            showToast('Login realizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro no login:', error);
            let msg = 'Erro ao fazer login';
            if (error.message.includes('Invalid login')) {
                msg = 'E-mail ou senha incorretos';
            } else if (error.message.includes('Email not confirmed')) {
                msg = 'Confirme seu e-mail antes de fazer login';
            }
            this.showMessage(msg, 'error');
        } finally {
            this._isHandlingAuth = false;
            hideLoading();
        }
    },

    async register() {
        const name = document.getElementById('register-name').value.trim();
        // Sanitizar email: lowercase, remover espaços e caracteres invisíveis
        const email = document.getElementById('register-email').value
            .trim()
            .toLowerCase()
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ''); // remove zero-width e nbsp
        const password = document.getElementById('register-password').value;
        const instrument = document.getElementById('register-instrument').value;

        if (!name || !email || !password || !instrument) {
            this.showMessage('Preencha todos os campos', 'error');
            return;
        }

        // Validar formato do email antes de enviar
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showMessage('Digite um e-mail válido (ex: nome@email.com)', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        try {
            showLoading();

            // Criar usuário no Supabase Auth
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        instrument: instrument
                    }
                }
            });

            if (error) throw error;

            // Supabase retorna user sem identities quando o email já existe
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                this.showMessage('Este e-mail já está cadastrado. Faça login.', 'error');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                return;
            }

            // Verificar se precisa de confirmação por email
            if (data.session) {
                // Login automático (confirmação de email desabilitada)
                this.currentUser = data.user;

                // Criar perfil na tabela profiles (agora com sessão ativa)
                await this.createProfile(data.user.id, name, email, instrument);
                await this.loadProfile();
                this.showApp();
                showToast('Conta criada com sucesso!', 'success');
            } else {
                // Precisa confirmar email
                this.showMessage('Conta criada! Verifique seu e-mail para confirmar e depois faça login.', 'success');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            let msg = 'Erro ao criar conta';
            if (error.message) {
                if (error.message.includes('already registered')) {
                    msg = 'Este e-mail já está cadastrado';
                } else if (error.message.includes('invalid') || error.message.includes('valid email')) {
                    msg = 'E-mail considerado inválido pelo servidor. Tente outro e-mail ou verifique as configurações de autenticação no painel do Supabase.';
                } else if (error.message.includes('at least') || error.message.includes('weak')) {
                    msg = 'A senha deve ter pelo menos 6 caracteres';
                } else if (error.message.includes('rate') || error.message.includes('limit')) {
                    msg = 'Muitas tentativas. Aguarde alguns minutos.';
                } else {
                    msg = 'Erro: ' + error.message;
                }
            } else {
                msg = 'Erro ao criar conta: ' + JSON.stringify(error);
            }
            this.showMessage(msg, 'error');
        } finally {
            hideLoading();
        }
    },

    async createProfile(userId, name, email, instrument, role = 'musician') {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .insert({
                    id: userId,
                    full_name: name,
                    email: email,
                    instrument: instrument,
                    role: role,
                    active: true
                });

            if (error && !error.message.includes('duplicate')) {
                console.error('Erro ao criar perfil:', error);
            }
        } catch (err) {
            console.error('Erro ao criar perfil:', err);
        }
    },

    async loadProfile() {
        if (!this.currentUser) return;

        try {
            let { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            // Se o perfil não existe, criar a partir dos metadados do usuário
            if (error && error.code === 'PGRST116') {
                const meta = this.currentUser.user_metadata || {};
                await this.createProfile(
                    this.currentUser.id,
                    meta.full_name || 'Usuário',
                    this.currentUser.email,
                    meta.instrument || ''
                );

                // Tentar carregar novamente
                const result = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', this.currentUser.id)
                    .single();
                data = result.data;
                error = result.error;
            }

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao carregar perfil:', error);
            }

            this.currentProfile = data || {
                full_name: this.currentUser.user_metadata?.full_name || 'Usuário',
                email: this.currentUser.email,
                instrument: this.currentUser.user_metadata?.instrument || '-',
                role: 'musician',
                active: false
            };

            // Verificar se é admin
            this.isAdmin = this.currentProfile.role === 'admin';
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            this.currentProfile = {
                full_name: this.currentUser.user_metadata?.full_name || 'Usuário',
                email: this.currentUser.email,
                instrument: this.currentUser.user_metadata?.instrument || '-',
                role: 'musician',
                active: false
            };
            this.isAdmin = false;
        }
    },

    async logout() {
        try {
            showLoading();
            await supabaseClient.auth.signOut();
            this.currentUser = null;
            this.currentProfile = null;
            this.showAuth();
            showToast('Logout realizado', 'info');
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            hideLoading();
        }
    },

    showApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Atualizar nome do usuário na navbar
        const userName = this.currentProfile?.full_name || 'Usuário';
        document.getElementById('user-name').textContent = userName;

        // Mostrar/esconder elementos de admin
        document.querySelectorAll('.admin-only').forEach(el => {
            if (this.isAdmin) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        // Badge de admin no nome
        if (this.isAdmin) {
            document.getElementById('user-name').innerHTML = 
                userName + ' <span class="admin-badge"><i class="fas fa-shield-alt"></i> Admin</span>';
        }

        // Atualizar perfil
        document.getElementById('profile-name').textContent = userName;
        document.getElementById('profile-email').textContent = this.currentProfile?.email || '-';
        document.getElementById('profile-instrument').textContent = 
            this.getInstrumentLabel(this.currentProfile?.instrument);
        document.getElementById('profile-since').textContent = 
            new Date(this.currentUser.created_at).toLocaleDateString('pt-BR');

        // Mostrar role no perfil
        const roleLabel = this.isAdmin ? 'Administrador' : 'Músico';
        const profileRole = document.getElementById('profile-role');
        if (profileRole) profileRole.textContent = roleLabel;

        // Mostrar status ativo/inativo no perfil
        const profileActive = document.getElementById('profile-active');
        if (profileActive) {
            const isActive = this.currentProfile?.active !== false;
            profileActive.textContent = isActive ? 'Ativo' : 'Inativo';
            profileActive.style.color = isActive ? 'var(--success)' : 'var(--error)';
        }

        // Carregar dados da app
        App.init();
    },

    showAuth() {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        
        // Limpar formulários
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    },

    showMessage(text, type) {
        const el = document.getElementById('auth-message');
        el.textContent = text;
        el.className = `auth-message ${type}`;
    },

    hideMessage() {
        const el = document.getElementById('auth-message');
        el.className = 'auth-message hidden';
    },

    getInstrumentLabel(value) {
        const map = {
            'guitarra': 'Guitarra',
            'violao': 'Violão',
            'baixo': 'Baixo',
            'bateria': 'Bateria',
            'teclado': 'Teclado/Piano',
            'violino': 'Violino',
            'saxofone': 'Saxofone',
            'trompete': 'Trompete',
            'flauta': 'Flauta',
            'voz': 'Voz/Canto',
            'outro': 'Outro'
        };
        return map[value] || value || '-';
    }
};

// ============================================================
// FUNÇÕES UTILITÁRIAS GLOBAIS
// ============================================================
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

// Iniciar autenticação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
