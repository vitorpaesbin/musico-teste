-- ============================================================
-- SQL PARA CONFIGURAR O SUPABASE
-- Execute este script no SQL Editor do Supabase Dashboard
-- Supabase > SQL Editor > New Query > Colar e Executar
-- ============================================================

-- 1. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    instrument TEXT,
    role TEXT NOT NULL DEFAULT 'musician' CHECK (role IN ('musician', 'admin')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna role se a tabela já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'musician' CHECK (role IN ('musician', 'admin'));
    END IF;
END $$;

-- Adicionar coluna active se a tabela já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'active'
    ) THEN
        ALTER TABLE profiles ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 2. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'entregue', 'cancelado')),
    total_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cordas', 'palhetas', 'baquetas', 'cabos', 'peles', 'acessorios', 'pecas', 'outros')),
    quantity INTEGER NOT NULL DEFAULT 1,
    brand TEXT,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgente', 'muito_urgente')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- ============================================================
-- FUNÇÃO AUXILIAR: verificar se o usuário é admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Segurança por Usuário
-- ============================================================

-- Habilitar RLS nas tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;

CREATE POLICY "Usuários podem ver próprio perfil"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Usuários podem inserir próprio perfil"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT role FROM profiles WHERE id = auth.uid())
        AND active = (SELECT active FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON profiles;
CREATE POLICY "Admins podem atualizar todos os perfis"
    ON profiles FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins podem excluir perfis" ON profiles;
CREATE POLICY "Admins podem excluir perfis"
    ON profiles FOR DELETE
    USING (is_admin());

-- Políticas para ORDERS
DROP POLICY IF EXISTS "Usuários podem ver próprios pedidos" ON orders;
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;
DROP POLICY IF EXISTS "Usuários podem criar pedidos" ON orders;
DROP POLICY IF EXISTS "Usuários podem atualizar próprios pedidos" ON orders;
DROP POLICY IF EXISTS "Admins podem atualizar todos os pedidos" ON orders;

CREATE POLICY "Usuários podem ver próprios pedidos"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os pedidos"
    ON orders FOR SELECT
    USING (is_admin());

CREATE POLICY "Usuários podem criar pedidos"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprios pedidos"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins podem atualizar todos os pedidos"
    ON orders FOR UPDATE
    USING (is_admin());

DROP POLICY IF EXISTS "Admins podem excluir pedidos" ON orders;
CREATE POLICY "Admins podem excluir pedidos"
    ON orders FOR DELETE
    USING (is_admin());

-- Políticas para ORDER_ITEMS
DROP POLICY IF EXISTS "Usuários podem ver itens dos próprios pedidos" ON order_items;
DROP POLICY IF EXISTS "Admins podem ver todos os itens" ON order_items;
DROP POLICY IF EXISTS "Usuários podem criar itens nos próprios pedidos" ON order_items;

CREATE POLICY "Usuários podem ver itens dos próprios pedidos"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins podem ver todos os itens"
    ON order_items FOR SELECT
    USING (is_admin());

CREATE POLICY "Usuários podem criar itens nos próprios pedidos"
    ON order_items FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins podem excluir itens de pedidos" ON order_items;
CREATE POLICY "Admins podem excluir itens de pedidos"
    ON order_items FOR DELETE
    USING (is_admin());

-- ============================================================
-- FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- COMO PROMOVER UM USUÁRIO A ADMINISTRADOR:
-- Execute no SQL Editor do Supabase:
-- 
-- UPDATE profiles SET role = 'admin' WHERE email = 'seu-email@exemplo.com';
--
-- ATIVAR/DESATIVAR MEMBRO MANUALMENTE:
-- UPDATE profiles SET active = false WHERE email = 'email@exemplo.com';
-- UPDATE profiles SET active = true WHERE email = 'email@exemplo.com';
-- ============================================================
