import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
    SUPABASE_URL, 
    SCHEMA_NAME, 
    testSupabaseConnection, 
    SupabaseHealthCheck,
    saveAllMetadataToSupabase,
    getLastSharepointBackupDate,
    setLastSharepointBackupDate
} from '../services/supabaseService';
import * as MicrosoftApi from '../utils/microsoftApi';
import { AppState } from '../types';

interface SupabaseMigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    appState: AppState;
    msalInstance: any;
    isMicrosoftSignedIn: boolean;
    onDataUpdatedFromSupabase?: () => void;
    onOpenJsonImportModal?: () => void;
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
    isOpen,
    onClose,
    appState,
    msalInstance,
    isMicrosoftSignedIn,
    onOpenJsonImportModal,
}) => {

    const [health, setHealth] = useState<SupabaseHealthCheck | null>(null);
    const [isLoadingHealth, setIsLoadingHealth] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isBackingUpSharePoint, setIsBackingUpSharePoint] = useState(false);
    const [sqlCopied, setSqlCopied] = useState(false);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const checkHealth = async () => {
        setIsLoadingHealth(true);
        try {
            const res = await testSupabaseConnection();
            setHealth(res);
            const backupDate = await getLastSharepointBackupDate();
            setLastBackupDate(backupDate);
        } catch (e: any) {
            console.error("Erro ao verificar status do Supabase:", e);
        } finally {
            setIsLoadingHealth(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            checkHealth();
        }
    }, [isOpen]);

    const handleCopySql = () => {
        const sql = `-- ==============================================================================
-- SCHEMA SUPABASE: Negócios e Parcerias CTVacinas
-- Projeto Supabase: ${SUPABASE_URL}
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS negocios_parcerias;

GRANT USAGE ON SCHEMA negocios_parcerias TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA negocios_parcerias GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS negocios_parcerias.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Coordenador', 'Pesquisador', 'Administrador', 'Administrador Master', 'Consulta')),
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    folder_web_url TEXT,
    folder_id TEXT,
    linked_instrument_ids JSONB DEFAULT '[]'::jsonb,
    observations JSONB DEFAULT '[]'::jsonb,
    project_number TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    confidential BOOLEAN DEFAULT FALSE,
    internal_project_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negocios_parcerias.legal_instruments (
    id BIGINT PRIMARY KEY,
    signatories JSONB DEFAULT '[]'::jsonb,
    type TEXT NOT NULL,
    linked_partnership_ids JSONB DEFAULT '[]'::jsonb,
    object TEXT NOT NULL,
    signature_date TEXT NOT NULL,
    expiration_date TEXT NOT NULL,
    document JSONB,
    document_web_url TEXT,
    folder_id TEXT,
    folder_web_url TEXT,
    observations TEXT,
    addendums JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS negocios_parcerias.internal_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negocios_parcerias.essays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    responsible_user JSONB,
    personnel_costs JSONB DEFAULT '[]'::jsonb,
    input_costs JSONB DEFAULT '[]'::jsonb,
    calibration_costs JSONB DEFAULT '[]'::jsonb,
    total_cost NUMERIC(15, 2) DEFAULT 0,
    external_quote_file JSONB,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negocios_parcerias.studies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    essay_ids JSONB DEFAULT '[]'::jsonb,
    total_cost NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS negocios_parcerias.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    sender_email TEXT,
    bolsas JSONB DEFAULT '[]'::jsonb,
    logo_left TEXT,
    logo_center TEXT,
    logo_right TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negocios_parcerias.system_metadata (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negocios_parcerias.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON ALL TABLES IN SCHEMA negocios_parcerias TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA negocios_parcerias TO anon, authenticated, service_role;

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

INSERT INTO negocios_parcerias.users (id, name, email, role, platform)
VALUES ('user-priscila-master', 'Priscila Passos', 'priscilapassos@ctvacinas.org', 'Administrador Master', 'Microsoft')
ON CONFLICT (id) DO UPDATE SET role = 'Administrador Master';

INSERT INTO public.np_users (id, name, email, role, platform)
VALUES ('user-priscila-master', 'Priscila Passos', 'priscilapassos@ctvacinas.org', 'Administrador Master', 'Microsoft')
ON CONFLICT (id) DO UPDATE SET role = 'Administrador Master';`;


        navigator.clipboard.writeText(sql);
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 3000);
    };

    const handleMigrateToSupabase = async () => {
        setIsMigrating(true);
        setStatusMessage(null);
        try {
            const res = await saveAllMetadataToSupabase(appState);
            if (res.success) {
                setStatusMessage("✅ Metadados sincronizados e salvos no Supabase com sucesso!");
                await checkHealth();
            } else {
                setStatusMessage(`❌ Erro ao salvar no Supabase: ${res.error}`);
            }
        } catch (e: any) {
            setStatusMessage(`❌ Erro: ${e.message || e}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleForceSharePointBackup = async () => {
        if (!isMicrosoftSignedIn || !msalInstance) {
            alert("Faça login na conta Microsoft/SharePoint antes de realizar o backup.");
            return;
        }
        setIsBackingUpSharePoint(true);
        setStatusMessage(null);
        try {
            await MicrosoftApi.uploadDatabase(msalInstance, appState);
            const todayStr = new Date().toISOString().split('T')[0];
            await setLastSharepointBackupDate(todayStr, { forced: true, time: new Date().toISOString() });
            setLastBackupDate(todayStr);
            setStatusMessage("✅ Backup completo no SharePoint (DatabaseSpabase.json) realizado com sucesso!");
        } catch (e: any) {
            console.error("Erro no backup do SharePoint:", e);
            setStatusMessage(`❌ Falha no backup do SharePoint: ${e.message || e}`);
        } finally {
            setIsBackingUpSharePoint(false);
        }
    };

    const isToday = (dateStr: string | null) => {
        if (!dateStr) return false;
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Painel de Migração & Armazenamento: Supabase">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {/* Status Geral */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
                    <div className="flex items-center gap-2 font-semibold text-base mb-1">
                        <span>⚠️ Sistema em Modo de Manutenção / Migração</span>
                    </div>
                    <p className="text-sm">
                        O sistema está migrando o armazenamento primário de metadados para o <strong>Supabase</strong>.
                        O SharePoint é mantido para armazenamento de arquivos/pastas e backup diário automático no primeiro acesso do dia.
                    </p>
                </div>

                {/* Conexão Supabase */}
                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-teal-500 animate-pulse"></span>
                            <h3 className="font-semibold text-gray-800">Conexão Supabase</h3>
                        </div>
                        <button
                            onClick={checkHealth}
                            disabled={isLoadingHealth}
                            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors"
                        >
                            {isLoadingHealth ? 'Verificando...' : 'Atualizar Status'}
                        </button>
                    </div>

                    <div className="text-xs font-mono bg-gray-50 p-2 rounded border text-gray-600 break-all space-y-1">
                        <div><strong>URL:</strong> {SUPABASE_URL}</div>
                        <div><strong>Schema Primário:</strong> {SCHEMA_NAME}</div>
                        <div><strong>Modo Atual:</strong> {health?.storageMode === 'schema' ? 'Schema Dedicado (negocios_parcerias)' : health?.storageMode === 'public' ? 'Schema Public (prefixo np_)' : 'Aguardando criação das tabelas'}</div>
                    </div>

                    {health && (
                        <div className="text-sm">
                            <p className={health.storageMode !== 'none' ? 'text-teal-700 font-medium' : 'text-amber-700 font-medium'}>
                                {health.message}
                            </p>

                            {health.missingTables.length > 0 && (
                                <div className="mt-2 text-xs bg-amber-50 border border-amber-200 p-2 rounded">
                                    <p className="font-semibold text-amber-800">Tabelas pendentes de criação ({health.missingTables.length}):</p>
                                    <p className="text-amber-700 mt-1">{health.missingTables.join(', ')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Ação 1: Script SQL para criação do Schema */}
                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-800">1. Script SQL do Schema & Tabelas</h4>
                            <p className="text-xs text-gray-500">
                                Copie o script SQL e execute-o no Supabase SQL Editor para criar o schema e todas as 10 tabelas.
                            </p>
                        </div>
                        <button
                            onClick={handleCopySql}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                                sqlCopied 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                        >
                            {sqlCopied ? '✓ Copiado!' : 'Copiar Script SQL'}
                        </button>
                    </div>
                </div>

                {/* Ação 2: Migração de Dados */}
                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-800">2. Migrar / Gravar Dados no Supabase</h4>
                            <p className="text-xs text-gray-500">
                                Grava todos os metadados atuais ({appState.partnerships?.length || 0} parcerias, {appState.legalInstruments?.length || 0} instrumentos, {appState.proposals?.length || 0} propostas) nas tabelas do Supabase.
                            </p>
                        </div>
                        <button
                            onClick={handleMigrateToSupabase}
                            disabled={isMigrating}
                            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 rounded transition-colors disabled:opacity-50"
                        >
                            {isMigrating ? 'Sincronizando...' : 'Gravar no Supabase'}
                        </button>
                    </div>
                </div>

                {/* Ação 3: Backup Diário no SharePoint */}
                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-800">3. Backup Diário no SharePoint</h4>
                            <p className="text-xs text-gray-500">
                                Mantido para contingência. Executa automaticamente no primeiro acesso do dia.
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isToday(lastBackupDate) ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                <span className="text-xs text-gray-600">
                                    Status hoje: <strong>{isToday(lastBackupDate) ? `Realizado (${lastBackupDate})` : 'Pendente para hoje'}</strong>
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleForceSharePointBackup}
                            disabled={isBackingUpSharePoint || !isMicrosoftSignedIn}
                            className="px-3 py-1.5 text-xs font-medium border border-teal-600 text-teal-700 hover:bg-teal-50 rounded transition-colors disabled:opacity-50"
                        >
                            {isBackingUpSharePoint ? 'Salvando...' : 'Forçar Backup SharePoint'}
                        </button>
                    </div>
                </div>

                {/* Ação 4: Importação via Arquivo .JSON */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-slate-800">4. Restaurar de Arquivo DatabaseSpabase.json</h4>
                            <p className="text-xs text-slate-500">
                                Importe um arquivo .JSON salvo no seu computador para carregar os dados no sistema e sincronizar no Supabase.
                            </p>
                        </div>
                        {onOpenJsonImportModal && (
                            <button
                                onClick={onOpenJsonImportModal}
                                className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors shadow-xs"
                            >
                                Importar .JSON
                            </button>
                        )}
                    </div>
                </div>

                {/* Mensagem de Feedback */}

                {statusMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                        statusMessage.startsWith('✅') 
                            ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {statusMessage}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-medium transition-colors"
                >
                    Fechar
                </button>
            </div>
        </Modal>
    );
};
