// ============================================================
// MÓDULO PRINCIPAL DA APLICAÇÃO
// ============================================================

const App = {
    orders: [],
    currentItems: [],
    currentFilter: 'all',
    adminOrders: [],
    adminFilter: 'all',

    init() {
        this.setupNavigation();
        this.setupOrderForm();
        this.setupModal();
        this.setupFilters();
        this.loadOrders();

        // Inicializar admin se aplicável
        if (Auth.isAdmin) {
            this.setupAdminFilters();
            this.loadAdminOrders();
        }
    },

    // ============================================================
    // NAVEGAÇÃO
    // ============================================================
    setupNavigation() {
        // Desktop nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            });
        });

        // Mobile nav
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            });
        });
    },

    navigateTo(page) {
        // Atualizar links ativos
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.page === page);
        });

        // Mostrar página
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        // Recarregar dados se necessário
        if (page === 'dashboard' || page === 'my-orders') {
            this.loadOrders();
        }
        if (page === 'admin' && Auth.isAdmin) {
            this.loadAdminOrders();
        }
    },

    // ============================================================
    // FORMULÁRIO DE PEDIDO
    // ============================================================
    setupOrderForm() {
        const form = document.getElementById('order-form');
        const addItemBtn = document.getElementById('add-item-btn');

        addItemBtn.addEventListener('click', () => {
            this.addItemToList();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });
    },

    addItemToList() {
        const name = document.getElementById('item-name').value.trim();
        const qty = parseInt(document.getElementById('item-qty').value);
        const brand = document.getElementById('item-brand').value.trim();
        const urgency = document.getElementById('item-urgency').value;
        const notes = document.getElementById('item-notes').value.trim();
        const category = document.querySelector('input[name="category"]:checked');

        if (!name) {
            showToast('Informe o nome do material', 'error');
            return;
        }

        if (!category) {
            showToast('Selecione uma categoria', 'error');
            return;
        }

        const item = {
            id: Date.now(),
            name,
            quantity: qty || 1,
            brand: brand || null,
            urgency,
            notes: notes || null,
            category: category.value
        };

        this.currentItems.push(item);
        this.renderItemsList();
        this.clearItemFields();
        showToast('Item adicionado ao pedido', 'success');
    },

    removeItem(itemId) {
        this.currentItems = this.currentItems.filter(i => i.id !== itemId);
        this.renderItemsList();
    },

    renderItemsList() {
        const section = document.getElementById('items-list-section');
        const container = document.getElementById('items-list');

        if (this.currentItems.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        container.innerHTML = this.currentItems.map(item => `
            <div class="item-card">
                <div class="item-info">
                    <strong>${this.escapeHtml(item.name)}</strong>
                    <small>
                        ${this.getCategoryLabel(item.category)} · 
                        Qtd: ${item.quantity}
                        ${item.brand ? ' · ' + this.escapeHtml(item.brand) : ''}
                        <span class="urgency-badge urgency-${item.urgency}">
                            ${this.getUrgencyLabel(item.urgency)}
                        </span>
                    </small>
                </div>
                <button class="item-remove" onclick="App.removeItem(${item.id})" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    },

    clearItemFields() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-qty').value = '1';
        document.getElementById('item-brand').value = '';
        document.getElementById('item-urgency').value = 'normal';
        document.getElementById('item-notes').value = '';
    },

    async submitOrder() {
        // Validar campos atuais e tentar adicionar como item
        const currentName = document.getElementById('item-name').value.trim();
        const category = document.querySelector('input[name="category"]:checked');

        if (currentName && category) {
            this.addItemToList();
        }

        if (this.currentItems.length === 0) {
            showToast('Adicione pelo menos um item ao pedido', 'error');
            return;
        }

        try {
            showLoading();

            // Criar pedido
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: Auth.currentUser.id,
                    status: 'pendente',
                    total_items: this.currentItems.length,
                    notes: null
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Criar itens do pedido
            const orderItems = this.currentItems.map(item => ({
                order_id: order.id,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                brand: item.brand,
                urgency: item.urgency,
                notes: item.notes
            }));

            const { error: itemsError } = await supabaseClient
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Limpar formulário
            this.currentItems = [];
            this.renderItemsList();
            this.clearItemFields();
            document.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
            document.getElementById('order-form').reset();

            showToast('Pedido enviado com sucesso!', 'success');
            
            // Navegar para meus pedidos
            setTimeout(() => {
                this.navigateTo('my-orders');
            }, 1000);

        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            showToast('Erro ao enviar pedido. Tente novamente.', 'error');
        } finally {
            hideLoading();
        }
    },

    // ============================================================
    // LISTAGEM DE PEDIDOS
    // ============================================================
    setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderOrders();
            });
        });
    },

    async loadOrders() {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('user_id', Auth.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.orders = data || [];
            this.renderOrders();
            this.updateStats();
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        }
    },

    renderOrders() {
        const container = document.getElementById('orders-list');
        const recentContainer = document.getElementById('recent-orders-list');
        
        let filtered = this.orders;
        if (this.currentFilter !== 'all') {
            filtered = this.orders.filter(o => o.status === this.currentFilter);
        }

        if (filtered.length === 0) {
            const emptyHtml = `<p class="empty-state"><i class="fas fa-inbox"></i> Nenhum pedido encontrado</p>`;
            container.innerHTML = emptyHtml;
            if (recentContainer) recentContainer.innerHTML = emptyHtml;
            return;
        }

        const html = filtered.map(order => this.renderOrderCard(order)).join('');
        container.innerHTML = html;

        // Dashboard - mostrar apenas os 5 mais recentes
        if (recentContainer) {
            const recent = this.orders.slice(0, 5);
            if (recent.length > 0) {
                recentContainer.innerHTML = recent.map(o => this.renderOrderCard(o)).join('');
            }
        }
    },

    renderOrderCard(order) {
        const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const items = order.order_items || [];
        const firstItem = items[0];
        const preview = firstItem ? firstItem.name : 'Sem itens';
        const moreCount = items.length > 1 ? ` +${items.length - 1} item(ns)` : '';
        
        // Verificar urgência máxima
        const hasUrgent = items.some(i => i.urgency === 'muito_urgente' || i.urgency === 'urgente');

        return `
            <div class="order-card" onclick="App.showOrderDetails('${order.id}')">
                <div class="order-card-header">
                    <span class="order-id">#${order.id.substring(0, 8).toUpperCase()}</span>
                    <span class="order-date">${date}</span>
                </div>
                <div class="order-card-body">
                    <div>
                        <div class="order-items-preview">
                            ${this.escapeHtml(preview)}${moreCount}
                        </div>
                        <div class="order-items-count">
                            ${items.length} item(ns) no pedido
                            ${hasUrgent ? ' <span class="urgency-badge urgency-urgente">URGENTE</span>' : ''}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusLabel(order.status)}
                    </span>
                </div>
            </div>
        `;
    },

    updateStats() {
        const total = this.orders.length;
        const pending = this.orders.filter(o => o.status === 'pendente').length;
        const approved = this.orders.filter(o => o.status === 'aprovado').length;
        const delivered = this.orders.filter(o => o.status === 'entregue').length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-approved').textContent = approved;
        document.getElementById('stat-delivered').textContent = delivered;
    },

    // ============================================================
    // MODAL DE DETALHES
    // ============================================================
    setupModal() {
        const modal = document.getElementById('order-modal');
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        modal.querySelector('.modal-overlay').addEventListener('click', () => this.closeModal());
    },

    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const items = order.order_items || [];
        const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="modal-detail">
                <label>Pedido</label>
                <span>#${order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="modal-detail">
                <label>Data</label>
                <span>${date}</span>
            </div>
            <div class="modal-detail">
                <label>Status</label>
                <span class="status-badge status-${order.status}">
                    ${this.getStatusLabel(order.status)}
                </span>
            </div>
            <div class="modal-items-list">
                <label style="font-size: 12px; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">
                    Itens do Pedido (${items.length})
                </label>
                ${items.map(item => `
                    <div class="modal-item">
                        <strong>${this.escapeHtml(item.name)}</strong>
                        <p>
                            <i class="fas fa-tag"></i> ${this.getCategoryLabel(item.category)} · 
                            Qtd: ${item.quantity}
                            ${item.brand ? ' · ' + this.escapeHtml(item.brand) : ''}
                        </p>
                        <p>
                            <span class="urgency-badge urgency-${item.urgency}">
                                ${this.getUrgencyLabel(item.urgency)}
                            </span>
                        </p>
                        ${item.notes ? `<p style="margin-top: 4px; font-style: italic;">"${this.escapeHtml(item.notes)}"</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('order-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('order-modal').classList.add('hidden');
    },

    // ============================================================
    // HELPERS
    // ============================================================
    getCategoryLabel(cat) {
        const map = {
            'cordas': '🎸 Cordas',
            'palhetas': '🎵 Palhetas',
            'baquetas': '🥁 Baquetas',
            'cabos': '🔌 Cabos',
            'peles': '⭕ Peles',
            'acessorios': '🧰 Acessórios',
            'pecas': '⚙️ Peças',
            'outros': '📦 Outros'
        };
        return map[cat] || cat;
    },

    getStatusLabel(status) {
        const map = {
            'pendente': '⏳ Pendente',
            'aprovado': '✅ Aprovado',
            'entregue': '📦 Entregue',
            'cancelado': '❌ Cancelado'
        };
        return map[status] || status;
    },

    getUrgencyLabel(urgency) {
        const map = {
            'normal': 'Normal',
            'urgente': 'Urgente',
            'muito_urgente': 'Muito Urgente'
        };
        return map[urgency] || urgency;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================================
    // ADMIN - PAINEL DE ADMINISTRAÇÃO
    // ============================================================
    setupAdminFilters() {
        document.querySelectorAll('[data-admin-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-admin-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.adminFilter = btn.dataset.adminFilter;
                this.renderAdminOrders();
            });
        });
    },

    async loadAdminOrders() {
        if (!Auth.isAdmin) return;

        try {
            // Carregar todos os pedidos (RLS permite para admin)
            const { data: ordersData, error: ordersError } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // Carregar todos os perfis para mostrar nomes
            const { data: profilesData, error: profilesError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, email, instrument');

            if (profilesError) throw profilesError;

            // Mapear perfis por ID
            const profilesMap = {};
            (profilesData || []).forEach(p => {
                profilesMap[p.id] = p;
            });

            // Associar perfil a cada pedido
            this.adminOrders = (ordersData || []).map(order => ({
                ...order,
                profile: profilesMap[order.user_id] || { full_name: 'Usuário desconhecido', email: '-' }
            }));

            this.renderAdminOrders();
            this.updateAdminStats(profilesData || []);
        } catch (error) {
            console.error('Erro ao carregar pedidos (admin):', error);
        }
    },

    updateAdminStats(profiles) {
        const musicians = profiles.filter(p => p.id !== Auth.currentUser.id || true).length;
        const totalOrders = this.adminOrders.length;
        const pending = this.adminOrders.filter(o => o.status === 'pendente').length;
        const completed = this.adminOrders.filter(o => o.status === 'entregue' || o.status === 'aprovado').length;

        document.getElementById('admin-stat-users').textContent = musicians;
        document.getElementById('admin-stat-orders').textContent = totalOrders;
        document.getElementById('admin-stat-pending').textContent = pending;
        document.getElementById('admin-stat-completed').textContent = completed;
    },

    renderAdminOrders() {
        const container = document.getElementById('admin-orders-list');
        if (!container) return;

        let filtered = this.adminOrders;
        if (this.adminFilter !== 'all') {
            filtered = this.adminOrders.filter(o => o.status === this.adminFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Nenhum pedido encontrado</p>';
            return;
        }

        container.innerHTML = filtered.map(order => this.renderAdminOrderCard(order)).join('');
    },

    renderAdminOrderCard(order) {
        const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const items = order.order_items || [];
        const itemsList = items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        const profile = order.profile;
        const hasUrgent = items.some(i => i.urgency === 'muito_urgente' || i.urgency === 'urgente');

        return `
            <div class="admin-order-card">
                <div class="admin-order-header">
                    <div>
                        <span class="admin-order-user"><i class="fas fa-user"></i> ${this.escapeHtml(profile.full_name)}</span>
                        <span class="order-id" style="margin-left: 12px;">#${order.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <span class="order-date">${date}</span>
                </div>
                <div class="admin-order-body">
                    <div class="admin-order-info">
                        <div class="order-items-preview">${this.escapeHtml(itemsList || 'Sem itens')}</div>
                        <div class="order-items-count">
                            ${items.length} item(ns) · ${this.escapeHtml(profile.email)}
                            ${hasUrgent ? ' <span class="urgency-badge urgency-urgente">URGENTE</span>' : ''}
                        </div>
                    </div>
                    <div class="admin-order-actions">
                        <select id="status-${order.id}" onchange="">
                            <option value="pendente" ${order.status === 'pendente' ? 'selected' : ''}>\u23F3 Pendente</option>
                            <option value="aprovado" ${order.status === 'aprovado' ? 'selected' : ''}>\u2705 Aprovado</option>
                            <option value="entregue" ${order.status === 'entregue' ? 'selected' : ''}>\uD83D\uDCE6 Entregue</option>
                            <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>\u274C Cancelado</option>
                        </select>
                        <button class="btn-admin-action btn-admin-save" onclick="App.updateOrderStatus('${order.id}')">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button class="btn-admin-action btn-admin-details" onclick="App.showAdminOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async updateOrderStatus(orderId) {
        const select = document.getElementById(`status-${orderId}`);
        if (!select) return;

        const newStatus = select.value;

        try {
            showLoading();
            const { error } = await supabaseClient
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            showToast('Status atualizado com sucesso!', 'success');
            await this.loadAdminOrders();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            showToast('Erro ao atualizar status', 'error');
        } finally {
            hideLoading();
        }
    },

    showAdminOrderDetails(orderId) {
        const order = this.adminOrders.find(o => o.id === orderId);
        if (!order) return;

        const items = order.order_items || [];
        const profile = order.profile;
        const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="modal-detail">
                <label>Músico</label>
                <span><i class="fas fa-user" style="color:var(--primary-light)"></i> ${this.escapeHtml(profile.full_name)} (${this.escapeHtml(profile.email)})</span>
            </div>
            <div class="modal-detail">
                <label>Instrumento</label>
                <span>${Auth.getInstrumentLabel(profile.instrument)}</span>
            </div>
            <div class="modal-detail">
                <label>Pedido</label>
                <span>#${order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="modal-detail">
                <label>Data</label>
                <span>${date}</span>
            </div>
            <div class="modal-detail">
                <label>Status</label>
                <span class="status-badge status-${order.status}">
                    ${this.getStatusLabel(order.status)}
                </span>
            </div>
            <div class="modal-items-list">
                <label style="font-size: 12px; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">
                    Itens do Pedido (${items.length})
                </label>
                ${items.map(item => `
                    <div class="modal-item">
                        <strong>${this.escapeHtml(item.name)}</strong>
                        <p>
                            <i class="fas fa-tag"></i> ${this.getCategoryLabel(item.category)} \u00b7 
                            Qtd: ${item.quantity}
                            ${item.brand ? ' \u00b7 ' + this.escapeHtml(item.brand) : ''}
                        </p>
                        <p>
                            <span class="urgency-badge urgency-${item.urgency}">
                                ${this.getUrgencyLabel(item.urgency)}
                            </span>
                        </p>
                        ${item.notes ? `<p style="margin-top: 4px; font-style: italic;">"${this.escapeHtml(item.notes)}"</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('order-modal').classList.remove('hidden');
    }
};
