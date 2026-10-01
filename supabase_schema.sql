-- ==============================================================================
-- SCHEMA SUPABASE: Negócios e Parcerias CTVacinas
-- Projeto Supabase: https://ytjhipjsigaalboztcdz.supabase.co (cadastro@ctvacinas.org)
-- ==============================================================================
-- ATENÇÃO - ISOLAMENTO CONTRA CONFLITOS COM OUTROS SISTEMAS:
-- Como este projeto Supabase já hospeda dados de outro sistema, todas as tabelas deste
-- sistema estão isoladas no schema dedicado 'negocios_parcerias'.
-- Além disso, as tabelas espelho de fallback no schema 'public' utilizam o prefixo 'np_'
-- (ex: 'np_users', 'np_partnerships'), garantindo que NUNCA haja conflito ou colisão
-- com tabelas de outros sistemas (como 'users', 'tasks', etc.).
--
-- ARMAZENAMENTO DE ARQUIVOS E BACKUP:
-- 1. Os metadados do sistema são armazenados no Supabase.
-- 2. Os arquivos binários continuam sendo armazenados no SharePoint. O Supabase
--    armazena apenas os links (URLs) e metadados para acesso a esses arquivos.
-- 3. Em todo primeiro login do dia, um backup completo dos dados é enviado para o
--    SharePoint no arquivo '/General/DatabaseSpabase.json'.
-- 4. O arquivo no SharePoint NUNCA sobrepõe os dados presentes no Supabase.
--
-- COMO EXECUTAR NO SUPABASE DASHBOARD:
-- 1. Acesse https://supabase.com/dashboard/project/ytjhipjsigaalboztcdz
-- 2. No menu lateral, clique em "SQL Editor" -> "New query"
-- 3. Cole este script completo e clique em "RUN"
-- 4. (Opcional recomendado) Vá em "Project Settings" -> "API" -> "Data API Settings"
--    No campo "Exposed schemas", certifique-se de incluir "negocios_parcerias".
-- ==============================================================================

-- 1. Criação do Schema Dedicado (Isolado de qualquer outro sistema)
CREATE SCHEMA IF NOT EXISTS negocios_parcerias;


-- Garantir privilégios para roles do Supabase
GRANT USAGE ON SCHEMA negocios_parcerias TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Tabela: Usuários do Sistema de Parcerias
CREATE TABLE IF NOT EXISTS negocios_parcerias.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Coordenador', 'Pesquisador', 'Administrador', 'Administrador Master', 'Consulta')),
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: Parcerias (Metadados principais e links de pastas/documentos do SharePoint)
CREATE TABLE IF NOT EXISTS negocios_parcerias.partnerships (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    funder TEXT NOT NULL,
    funder_coordinator TEXT NOT NULL,
    partners JSONB DEFAULT '[]'::jsonb,
    ctv_coordinator JSONB NOT NULL,
    ctv_researcher JSONB NOT NULL,
    ctv_business_partner JSONB NOT NULL,
    entry_date TEXT NOT NULL,
    execution_start_date TEXT NOT NULL,
    approved_value NUMERIC(15, 2) DEFAULT 0,
    project_type TEXT NOT NULL,
    folder_web_url TEXT,            -- Link direto para a pasta no SharePoint
    folder_id TEXT,                 -- ID da pasta no Microsoft Graph/SharePoint
    linked_instrument_ids JSONB DEFAULT '[]'::jsonb,
    observations JSONB DEFAULT '[]'::jsonb,
    project_number TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb, -- Metadados e links (webUrl) dos arquivos no SharePoint
    confidential BOOLEAN DEFAULT FALSE,
    internal_project_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: Instrumentos Jurídicos
CREATE TABLE IF NOT EXISTS negocios_parcerias.legal_instruments (
    id BIGINT PRIMARY KEY,
    signatories JSONB DEFAULT '[]'::jsonb,
    type TEXT NOT NULL,
    linked_partnership_ids JSONB DEFAULT '[]'::jsonb,
    object TEXT NOT NULL,
    signature_date TEXT NOT NULL,
    expiration_date TEXT NOT NULL,
    document JSONB,
    document_web_url TEXT,          -- Link para o documento no SharePoint
    folder_id TEXT,
    folder_web_url TEXT,            -- Link para a pasta no SharePoint
    observations TEXT,
    addendums JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: Tarefas (Workflow e Atividades)
CREATE TABLE IF NOT EXISTS negocios_parcerias.tasks (
    id TEXT PRIMARY KEY,
    partnership_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to JSONB DEFAULT '[]'::jsonb,
    due_date TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_by TEXT,
    completion_date TEXT,
    created_by TEXT NOT NULL,
    creation_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: Projetos Internos
CREATE TABLE IF NOT EXISTS negocios_parcerias.internal_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: Ensaios / Atividades de Precificação
CREATE TABLE IF NOT EXISTS negocios_parcerias.essays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    responsible_user JSONB,
    personnel_costs JSONB DEFAULT '[]'::jsonb,
    input_costs JSONB DEFAULT '[]'::jsonb,
    calibration_costs JSONB DEFAULT '[]'::jsonb,
    total_cost NUMERIC(15, 2) DEFAULT 0,
    external_quote_file JSONB,      -- Link e metadados da cotação no SharePoint
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela: Estudos de Precificação
CREATE TABLE IF NOT EXISTS negocios_parcerias.studies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    essay_ids JSONB DEFAULT '[]'::jsonb,
    total_cost NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela: Propostas Financeiras (com snapshot congelado)
CREATE TABLE IF NOT EXISTS negocios_parcerias.proposals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    partnership_id TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_value NUMERIC(15, 2) DEFAULT 0,
    safety_margin_percentage NUMERIC(10, 2) DEFAULT 0,
    safety_margin_value NUMERIC(15, 2) DEFAULT 0,
    profit_margin_percentage NUMERIC(10, 2) DEFAULT 0,
    profit_margin_value NUMERIC(15, 2) DEFAULT 0,
    taxes_percentage NUMERIC(10, 2) DEFAULT 0,
    taxes_value NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL,
    status_changed_at TEXT,
    revision_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela: Configurações do Sistema
CREATE TABLE IF NOT EXISTS negocios_parcerias.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    sender_email TEXT,
    bolsas JSONB DEFAULT '[]'::jsonb,
    logo_left TEXT,
    logo_center TEXT,
    logo_right TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela: Metadados do Sistema (Controle de sincronização diária e flags)
CREATE TABLE IF NOT EXISTS negocios_parcerias.system_metadata (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tabela: Logs de Auditoria e Sincronização
CREATE TABLE IF NOT EXISTS negocios_parcerias.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PERMISSÕES E POLÍTICAS DE ACESSO (RLS)
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA negocios_parcerias TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA negocios_parcerias TO anon, authenticated, service_role;

-- Desativar RLS para acesso direto da aplicação com a chave do projeto
ALTER TABLE negocios_parcerias.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.partnerships DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.legal_instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.internal_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.essays DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.studies DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.system_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE negocios_parcerias.sync_logs DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- TABELAS ESPELHO NO SCHEMA PUBLIC (Compatibilidade total com PostgREST padrão)
-- ==============================================================================
-- Caso a API REST padrão do Supabase esteja configurada apenas para expor o schema 'public',
-- criamos também as tabelas correspondentes com o prefixo 'np_' no schema 'public'.

CREATE TABLE IF NOT EXISTS public.np_users (LIKE negocios_parcerias.users INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_partnerships (LIKE negocios_parcerias.partnerships INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_legal_instruments (LIKE negocios_parcerias.legal_instruments INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_tasks (LIKE negocios_parcerias.tasks INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_internal_projects (LIKE negocios_parcerias.internal_projects INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_essays (LIKE negocios_parcerias.essays INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_studies (LIKE negocios_parcerias.studies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_proposals (LIKE negocios_parcerias.proposals INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_system_settings (LIKE negocios_parcerias.system_settings INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_system_metadata (LIKE negocios_parcerias.system_metadata INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.np_sync_logs (LIKE negocios_parcerias.sync_logs INCLUDING ALL);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER TABLE public.np_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_partnerships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_legal_instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_internal_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_essays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_studies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_system_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_sync_logs DISABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas irrestritas (para garantir que anon, authenticated e service_role nunca sejam bloqueados pelo gateway)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'negocios_parcerias'
    LOOP
        EXECUTE format('ALTER TABLE negocios_parcerias.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "permitir_tudo" ON negocios_parcerias.%I', tbl);
        EXECUTE format('CREATE POLICY "permitir_tudo" ON negocios_parcerias.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)', tbl);
    END LOOP;

    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'np_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "permitir_tudo" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "permitir_tudo" ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- ATUALIZAÇÃO DE CONSTRAINT DE ROLES (Garante aceitação de 'Administrador Master')
-- ==============================================================================
-- Caso a tabela já tenha sido criada anteriormente com a constraint antiga, atualizamos:
ALTER TABLE IF EXISTS negocios_parcerias.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS negocios_parcerias.users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE IF EXISTS negocios_parcerias.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('Coordenador', 'Pesquisador', 'Administrador', 'Administrador Master', 'Consulta'));

ALTER TABLE IF EXISTS public.np_users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.np_users DROP CONSTRAINT IF EXISTS np_users_role_check;
ALTER TABLE IF EXISTS public.np_users DROP CONSTRAINT IF EXISTS users_role_check1;
ALTER TABLE IF EXISTS public.np_users ADD CONSTRAINT np_users_role_check 
    CHECK (role IN ('Coordenador', 'Pesquisador', 'Administrador', 'Administrador Master', 'Consulta'));

-- ==============================================================================
-- USUÁRIO INICIAL: ADMINISTRADOR MASTER
-- ==============================================================================

INSERT INTO negocios_parcerias.users (id, name, email, role, platform)
VALUES ('user-priscila-master', 'Priscila Passos', 'priscilapassos@ctvacinas.org', 'Administrador Master', 'Microsoft')
ON CONFLICT (id) DO UPDATE SET role = 'Administrador Master';

INSERT INTO public.np_users (id, name, email, role, platform)
VALUES ('user-priscila-master', 'Priscila Passos', 'priscilapassos@ctvacinas.org', 'Administrador Master', 'Microsoft')
ON CONFLICT (id) DO UPDATE SET role = 'Administrador Master';

-- Notifica o PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';


