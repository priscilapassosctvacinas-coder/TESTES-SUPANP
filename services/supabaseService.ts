import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
    AppState, 
    User, 
    Partnership, 
    LegalInstrument, 
    Task, 
    InternalProject, 
    Essay, 
    Study, 
    Proposal, 
    SystemSettings 
} from '../types';

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ytjhipjsigaalboztcdz.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_k2L5BEVW3R7eP7d2qRbl1g_Dcks_vFa';
export const SUPABASE_SECRET_KEY = (import.meta as any).env?.VITE_SUPABASE_SECRET_KEY || 'sb_secret_yqL3vKToavVMg6ssIx-DtQ_TMvDdTiv';

// Prefer secret key if available for administrative/metadata persistence without RLS restrictions, otherwise publishable key
export const SUPABASE_ANON_KEY = SUPABASE_SECRET_KEY || SUPABASE_PUBLISHABLE_KEY;

export const SCHEMA_NAME = 'negocios_parcerias';

// Criação do cliente Supabase configurado para o schema de negócios e parcerias
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
        schema: SCHEMA_NAME
    },
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Cliente alternativo apontando para o schema 'public' para fallback com prefixo 'np_' ou tabelas públicas
export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
        schema: 'public'
    },
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Cache do modo de acesso às tabelas ('schema' para negocios_parcerias.*, 'public_np' para np_*, 'public' para public.*)
let activeStorageMode: 'schema' | 'public_np' | 'public' | null = null;

export interface SupabaseHealthCheck {
    connected: boolean;
    storageMode: 'schema' | 'public' | 'none';
    tablesStatus: Record<string, boolean>;
    missingTables: string[];
    message: string;
}

const REQUIRED_TABLES = [
    'users',
    'partnerships',
    'legal_instruments',
    'tasks',
    'internal_projects',
    'essays',
    'studies',
    'proposals',
    'system_settings',
    'system_metadata'
];

/**
 * Testa a conectividade com o Supabase e detecta se o schema negocios_parcerias
 * ou as tabelas públicas (np_* ou sem prefixo) estão ativas.
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthCheck> {
    const result: SupabaseHealthCheck = {
        connected: false,
        storageMode: 'none',
        tablesStatus: {},
        missingTables: [],
        message: ''
    };

    let lastErrorMessage = '';

    try {
        // 1. Testa acesso ao schema dedicado 'negocios_parcerias'
        const schemaChecks = await Promise.all(
            REQUIRED_TABLES.map(async (table) => {
                try {
                    const { error } = await supabase.from(table).select('*').limit(1);
                    if (error) {
                        lastErrorMessage = error.message;
                        return { table, ok: false };
                    }
                    return { table, ok: true };
                } catch (e: any) {
                    lastErrorMessage = e.message || String(e);
                    return { table, ok: false };
                }
            })
        );

        const schemaWorking = schemaChecks.filter(c => c.ok).length;

        if (schemaWorking >= 2) {
            activeStorageMode = 'schema';
            result.connected = true;
            result.storageMode = 'schema';
            schemaChecks.forEach(c => {
                result.tablesStatus[c.table] = c.ok;
                if (!c.ok) result.missingTables.push(c.table);
            });
            result.message = `Conectado ao Supabase no schema '${SCHEMA_NAME}' (${schemaWorking}/${REQUIRED_TABLES.length} tabelas prontas).`;
            return result;
        }

        // 2. Fallback: Testa tabelas no schema 'public' com prefixo 'np_'
        const publicNpChecks = await Promise.all(
            REQUIRED_TABLES.map(async (table) => {
                try {
                    const publicTable = `np_${table}`;
                    const { error } = await supabasePublic.from(publicTable).select('*').limit(1);
                    if (error) {
                        lastErrorMessage = error.message;
                        return { table, ok: false };
                    }
                    return { table, ok: true };
                } catch (e: any) {
                    lastErrorMessage = e.message || String(e);
                    return { table, ok: false };
                }
            })
        );

        const publicNpWorking = publicNpChecks.filter(c => c.ok).length;

        if (publicNpWorking >= 2) {
            activeStorageMode = 'public_np';
            result.connected = true;
            result.storageMode = 'public';
            publicNpChecks.forEach(c => {
                result.tablesStatus[c.table] = c.ok;
                if (!c.ok) result.missingTables.push(`np_${c.table}`);
            });
            result.message = `Conectado ao Supabase no schema 'public' com prefixo 'np_' (${publicNpWorking}/${REQUIRED_TABLES.length} tabelas prontas).`;
            return result;
        }

        // 3. Fallback: Testa tabelas no schema 'public' SEM prefixo
        const publicDirectChecks = await Promise.all(
            REQUIRED_TABLES.map(async (table) => {
                try {
                    const { error } = await supabasePublic.from(table).select('*').limit(1);
                    return { table, ok: !error };
                } catch {
                    return { table, ok: false };
                }
            })
        );

        const publicDirectWorking = publicDirectChecks.filter(c => c.ok).length;

        if (publicDirectWorking >= 2) {
            activeStorageMode = 'public';
            result.connected = true;
            result.storageMode = 'public';
            publicDirectChecks.forEach(c => {
                result.tablesStatus[c.table] = c.ok;
                if (!c.ok) result.missingTables.push(c.table);
            });
            result.message = `Conectado ao Supabase no schema 'public' (${publicDirectWorking}/${REQUIRED_TABLES.length} tabelas prontas).`;
            return result;
        }

        // Se nenhuma das opções respondeu
        result.connected = true;
        result.storageMode = 'none';
        REQUIRED_TABLES.forEach(t => {
            result.tablesStatus[t] = false;
            result.missingTables.push(t);
        });
        result.message = lastErrorMessage 
            ? `Supabase acessível, mas respondeu: "${lastErrorMessage}". Execute o script SQL no Supabase Dashboard.`
            : 'Supabase acessível, mas as tabelas ainda não foram criadas. Execute o script SQL no Supabase Dashboard.';
        return result;

    } catch (e: any) {
        result.connected = false;
        result.message = `Erro ao comunicar com o Supabase: ${e.message || e}`;
        return result;
    }
}

/**
 * Retorna o query builder apontando para o schema correto
 */
export function getTableQuery(tableName: string) {
    if (activeStorageMode === 'public_np') {
        return supabasePublic.from(`np_${tableName}`);
    }
    if (activeStorageMode === 'public') {
        return supabasePublic.from(tableName);
    }
    return supabase.from(tableName);
}



// --- CONVERSÕES DE METADADOS (CamelCase <-> Snake_Case) ---

function mapPartnershipToRow(p: Partnership): any {
    return {
        id: p.id,
        reference: p.reference,
        status: p.status,
        title: p.title,
        funder: p.funder,
        funder_coordinator: p.funderCoordinator,
        partners: p.partners || [],
        ctv_coordinator: p.ctvCoordinator,
        ctv_researcher: p.ctvResearcher,
        ctv_business_partner: p.ctvBusinessPartner,
        entry_date: p.entryDate,
        execution_start_date: p.executionStartDate,
        approved_value: p.approvedValue || 0,
        project_type: p.projectType,
        folder_web_url: p.folderWebUrl || null,
        folder_id: p.folderId || null,
        linked_instrument_ids: p.linkedInstrumentIds || [],
        observations: p.observations || [],
        project_number: p.projectNumber || '',
        history: p.history || [],
        documents: p.documents || [],
        confidential: !!p.confidential,
        internal_project_id: p.internalProjectId || null,
        updated_at: new Date().toISOString()
    };
}

function mapRowToPartnership(row: any): Partnership {
    return {
        id: row.id,
        reference: row.reference || '',
        status: row.status,
        title: row.title || '',
        funder: row.funder || '',
        funderCoordinator: row.funder_coordinator || '',
        partners: row.partners || [],
        ctvCoordinator: row.ctv_coordinator,
        ctvResearcher: row.ctv_researcher,
        ctvBusinessPartner: row.ctv_business_partner,
        entryDate: row.entry_date || '',
        executionStartDate: row.execution_start_date || '',
        approvedValue: Number(row.approved_value) || 0,
        projectType: row.project_type,
        folderWebUrl: row.folder_web_url || undefined,
        folderId: row.folder_id || undefined,
        linkedInstrumentIds: row.linked_instrument_ids || [],
        observations: row.observations || [],
        projectNumber: row.project_number || '',
        history: row.history || [],
        documents: row.documents || [],
        confidential: !!row.confidential,
        internalProjectId: row.internal_project_id || undefined
    };
}

function mapLegalInstrumentToRow(inst: LegalInstrument): any {
    return {
        id: inst.id,
        signatories: inst.signatories || [],
        type: inst.type,
        linked_partnership_ids: inst.linkedPartnershipIds || [],
        object: inst.object || '',
        signature_date: inst.signatureDate,
        expiration_date: inst.expirationDate,
        document: inst.document || null,
        document_web_url: inst.documentWebUrl || null,
        folder_id: inst.folderId || null,
        folder_web_url: inst.folderWebUrl || null,
        observations: inst.observations || '',
        addendums: inst.addendums || [],
        updated_at: new Date().toISOString()
    };
}

function mapRowToLegalInstrument(row: any): LegalInstrument {
    return {
        id: Number(row.id),
        signatories: row.signatories || [],
        type: row.type,
        linkedPartnershipIds: row.linked_partnership_ids || [],
        object: row.object || '',
        signatureDate: row.signature_date || '',
        expirationDate: row.expiration_date || '',
        document: row.document || undefined,
        documentWebUrl: row.document_web_url || undefined,
        folderId: row.folder_id || undefined,
        folderWebUrl: row.folder_web_url || undefined,
        observations: row.observations || '',
        addendums: row.addendums || []
    };
}

function mapTaskToRow(t: Task): any {
    return {
        id: t.id,
        partnership_id: t.partnershipId,
        title: t.title,
        description: t.description || '',
        assigned_to: t.assignedTo || [],
        due_date: t.dueDate,
        completed: !!t.completed,
        completed_by: t.completedBy || null,
        completion_date: t.completionDate || null,
        created_by: t.createdBy,
        creation_date: t.creationDate,
        updated_at: new Date().toISOString()
    };
}

function mapRowToTask(row: any): Task {
    return {
        id: row.id,
        partnershipId: row.partnership_id,
        title: row.title,
        description: row.description || '',
        assignedTo: row.assigned_to || [],
        dueDate: row.due_date,
        completed: !!row.completed,
        completedBy: row.completed_by || undefined,
        completionDate: row.completion_date || undefined,
        createdBy: row.created_by,
        creationDate: row.creation_date
    };
}

function mapEssayToRow(e: Essay): any {
    return {
        id: e.id,
        name: e.name,
        responsible_user: e.responsibleUser || null,
        personnel_costs: e.personnelCosts || [],
        input_costs: e.inputCosts || [],
        calibration_costs: e.calibrationCosts || [],
        total_cost: e.totalCost || 0,
        external_quote_file: e.externalQuoteFile || null,
        history: e.history || [],
        created_at: e.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

function mapRowToEssay(row: any): Essay {
    return {
        id: row.id,
        name: row.name,
        responsibleUser: row.responsible_user || undefined,
        personnelCosts: row.personnel_costs || [],
        inputCosts: row.input_costs || [],
        calibrationCosts: row.calibration_costs || [],
        totalCost: Number(row.total_cost) || 0,
        externalQuoteFile: row.external_quote_file || undefined,
        history: row.history || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapStudyToRow(s: Study): any {
    return {
        id: s.id,
        name: s.name,
        essay_ids: s.essayIds || [],
        total_cost: s.totalCost || 0,
        updated_at: new Date().toISOString()
    };
}

function mapRowToStudy(row: any): Study {
    return {
        id: row.id,
        name: row.name,
        essayIds: row.essay_ids || [],
        totalCost: Number(row.total_cost) || 0
    };
}

function mapProposalToRow(p: Proposal): any {
    return {
        id: p.id,
        title: p.title,
        partnership_id: p.partnershipId,
        items: p.items || [],
        total_value: p.totalValue || 0,
        safety_margin_percentage: p.safetyMarginPercentage || 0,
        safety_margin_value: p.safetyMarginValue || 0,
        profit_margin_percentage: p.profitMarginPercentage || 0,
        profit_margin_value: p.profitMarginValue || 0,
        taxes_percentage: p.taxesPercentage || 0,
        taxes_value: p.taxesValue || 0,
        status: p.status,
        status_changed_at: p.statusChangedAt || null,
        revision_history: p.revisionHistory || [],
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

function mapRowToProposal(row: any): Proposal {
    return {
        id: row.id,
        title: row.title,
        partnershipId: row.partnership_id,
        items: row.items || [],
        totalValue: Number(row.total_value) || 0,
        safetyMarginPercentage: Number(row.safety_margin_percentage) || 0,
        safetyMarginValue: Number(row.safety_margin_value) || 0,
        profitMarginPercentage: Number(row.profit_margin_percentage) || 0,
        profitMarginValue: Number(row.profit_margin_value) || 0,
        taxesPercentage: Number(row.taxes_percentage) || 0,
        taxesValue: Number(row.taxes_value) || 0,
        status: row.status,
        statusChangedAt: row.status_changed_at || undefined,
        revisionHistory: row.revision_history || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// --- CARREGAMENTO TOTAL DE METADADOS DO SUPABASE ---

export async function loadAllMetadataFromSupabase(): Promise<Partial<AppState> | null> {
    const health = await testSupabaseConnection();
    if (!health.connected || health.storageMode === 'none') {
        console.warn("Supabase ainda não configurado com tabelas. Retornando null para manter fallback.");
        return null;
    }

    try {
        const [
            usersRes,
            partnershipsRes,
            legalInstrumentsRes,
            tasksRes,
            internalProjectsRes,
            essaysRes,
            studiesRes,
            proposalsRes,
            settingsRes,
            metadataRes
        ] = await Promise.all([
            getTableQuery('users').select('*'),
            getTableQuery('partnerships').select('*'),
            getTableQuery('legal_instruments').select('*'),
            getTableQuery('tasks').select('*'),
            getTableQuery('internal_projects').select('*'),
            getTableQuery('essays').select('*'),
            getTableQuery('studies').select('*'),
            getTableQuery('proposals').select('*'),
            getTableQuery('system_settings').select('*').limit(1),
            getTableQuery('system_metadata').select('*')
        ]);

        const users: User[] = (usersRes.data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: r.role,
            platform: r.platform || undefined
        }));

        const partnerships: Partnership[] = (partnershipsRes.data || []).map(mapRowToPartnership);
        const legalInstruments: LegalInstrument[] = (legalInstrumentsRes.data || []).map(mapRowToLegalInstrument);
        const tasks: Task[] = (tasksRes.data || []).map(mapRowToTask);
        const internalProjects: InternalProject[] = (internalProjectsRes.data || []).map((r: any) => ({
            id: r.id,
            name: r.name
        }));
        const essays: Essay[] = (essaysRes.data || []).map(mapRowToEssay);
        const studies: Study[] = (studiesRes.data || []).map(mapRowToStudy);
        const proposals: Proposal[] = (proposalsRes.data || []).map(mapRowToProposal);

        let systemSettings: SystemSettings | undefined = undefined;
        if (settingsRes.data && settingsRes.data.length > 0) {
            const s = settingsRes.data[0];
            systemSettings = {
                senderEmail: s.sender_email || '',
                bolsas: s.bolsas || [],
                logoLeft: s.logo_left || undefined,
                logoCenter: s.logo_center || undefined,
                logoRight: s.logo_right || undefined
            };
        }

        // Metadados adicionais
        let sentExpirationWarnings: Record<string, { sixty?: boolean, thirty?: boolean, seven?: boolean }> = {};
        let readHistoryIds: string[] = [];
        let systemAuditLogs: any[] = [];

        (metadataRes.data || []).forEach((m: any) => {
            if (m.key === 'sent_expiration_warnings' && m.value) {
                sentExpirationWarnings = m.value;
            } else if (m.key === 'read_history_ids' && Array.isArray(m.value)) {
                readHistoryIds = m.value;
            } else if (m.key === 'system_audit_logs' && Array.isArray(m.value)) {
                systemAuditLogs = m.value;
            }
        });

        return {
            users,
            partnerships,
            legalInstruments,
            tasks,
            internalProjects,
            essays,
            studies,
            proposals,
            systemSettings,
            sentExpirationWarnings,
            readHistoryIds,
            systemAuditLogs
        };

    } catch (error) {
        console.error("Erro ao carregar metadados do Supabase:", error);
        return null;
    }
}

// --- SALVAMENTO TOTAL / MIGRAÇÃO DOS DADOS NO SUPABASE ---

export async function saveAllMetadataToSupabase(state: AppState): Promise<{ success: boolean; error?: string }> {
    let health = await testSupabaseConnection();

    // Se o health check inicial falhou, tenta verificar diretamente se a tabela principal responde
    if (!health.connected || health.storageMode === 'none') {
        const directSchema = await supabase.from('users').select('*').limit(1);
        if (!directSchema.error) {
            activeStorageMode = 'schema';
            health.connected = true;
            health.storageMode = 'schema';
        } else {
            const directPublicNp = await supabasePublic.from('np_users').select('*').limit(1);
            if (!directPublicNp.error) {
                activeStorageMode = 'public_np';
                health.connected = true;
                health.storageMode = 'public';
            } else {
                const directPublic = await supabasePublic.from('users').select('*').limit(1);
                if (!directPublic.error) {
                    activeStorageMode = 'public';
                    health.connected = true;
                    health.storageMode = 'public';
                }
            }
        }
    }

    if (!health.connected || health.storageMode === 'none') {
        return { 
            success: false, 
            error: health.message || 'Tabelas do Supabase não encontradas. Execute o script SQL no dashboard.' 
        };
    }

    const syncErrors: string[] = [];

    try {
        // 1. Users
        if (state.users && state.users.length > 0) {
            const userRows = state.users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                platform: u.platform || null,
                updated_at: new Date().toISOString()
            }));
            const { error } = await getTableQuery('users').upsert(userRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar users:", error);
                syncErrors.push(`Usuários: ${error.message}`);
            }
        }

        // 2. Partnerships
        if (state.partnerships && state.partnerships.length > 0) {
            const partRows = state.partnerships.map(mapPartnershipToRow);
            const { error } = await getTableQuery('partnerships').upsert(partRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar partnerships:", error);
                syncErrors.push(`Parcerias: ${error.message}`);
            }
        }

        // 3. Legal Instruments
        if (state.legalInstruments && state.legalInstruments.length > 0) {
            const instRows = state.legalInstruments.map(mapLegalInstrumentToRow);
            const { error } = await getTableQuery('legal_instruments').upsert(instRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar legal_instruments:", error);
                syncErrors.push(`Instrumentos Jurídicos: ${error.message}`);
            }
        }

        // 4. Tasks
        if (state.tasks && state.tasks.length > 0) {
            const taskRows = state.tasks.map(mapTaskToRow);
            const { error } = await getTableQuery('tasks').upsert(taskRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar tasks:", error);
                syncErrors.push(`Tarefas: ${error.message}`);
            }
        }

        // 5. Internal Projects
        if (state.internalProjects && state.internalProjects.length > 0) {
            const projRows = state.internalProjects.map(p => ({
                id: p.id,
                name: p.name,
                updated_at: new Date().toISOString()
            }));
            const { error } = await getTableQuery('internal_projects').upsert(projRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar internal_projects:", error);
                syncErrors.push(`Projetos Internos: ${error.message}`);
            }
        }

        // 6. Essays
        if (state.essays && state.essays.length > 0) {
            const essayRows = state.essays.map(mapEssayToRow);
            const { error } = await getTableQuery('essays').upsert(essayRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar essays:", error);
                syncErrors.push(`Ensaios: ${error.message}`);
            }
        }

        // 7. Studies
        if (state.studies && state.studies.length > 0) {
            const studyRows = state.studies.map(mapStudyToRow);
            const { error } = await getTableQuery('studies').upsert(studyRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar studies:", error);
                syncErrors.push(`Estudos: ${error.message}`);
            }
        }

        // 8. Proposals
        if (state.proposals && state.proposals.length > 0) {
            const propRows = state.proposals.map(mapProposalToRow);
            const { error } = await getTableQuery('proposals').upsert(propRows, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar proposals:", error);
                syncErrors.push(`Propostas: ${error.message}`);
            }
        }

        // 9. System Settings
        if (state.systemSettings) {
            const settingRow = {
                id: 'default',
                sender_email: state.systemSettings.senderEmail || '',
                bolsas: state.systemSettings.bolsas || [],
                logo_left: state.systemSettings.logoLeft || null,
                logo_center: state.systemSettings.logoCenter || null,
                logo_right: state.systemSettings.logoRight || null,
                updated_at: new Date().toISOString()
            };
            const { error } = await getTableQuery('system_settings').upsert(settingRow, { onConflict: 'id' });
            if (error) {
                console.error("Erro ao sincronizar system_settings:", error);
                syncErrors.push(`Configurações: ${error.message}`);
            }
        }

        // 11. System Metadata
        const metadataItems = [
            { key: 'sent_expiration_warnings', value: state.sentExpirationWarnings || {} },
            { key: 'read_history_ids', value: state.readHistoryIds || [] },
            { key: 'system_audit_logs', value: state.systemAuditLogs || [] }
        ];

        for (const item of metadataItems) {
            const { error } = await getTableQuery('system_metadata').upsert({
                key: item.key,
                value: item.value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
            if (error) {
                console.error(`Erro ao sincronizar metadata ${item.key}:`, error);
                syncErrors.push(`Metadados (${item.key}): ${error.message}`);
            }
        }

        if (syncErrors.length > 0) {
            const joined = syncErrors.join(' | ');
            await logSyncEvent('supabase_save', 'error', { error: joined });
            return { success: false, error: joined };
        }


        await logSyncEvent('supabase_save', 'success', {
            totalPartnerships: state.partnerships?.length || 0,
            totalInstruments: state.legalInstruments?.length || 0,
            totalProposals: state.proposals?.length || 0
        });

        return { success: true };
    } catch (error: any) {
        console.error("Falha ao salvar metadados no Supabase:", error);
        await logSyncEvent('supabase_save', 'error', { error: error.message });
        return { success: false, error: error.message || 'Erro desconhecido' };
    }
}

// --- OPERAÇÕES ATÔMICAS PARA CADA MÓDULO ---

export async function upsertPartnershipInSupabase(p: Partnership): Promise<void> {
    const row = mapPartnershipToRow(p);
    const { error } = await getTableQuery('partnerships').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

export async function deletePartnershipInSupabase(id: string): Promise<void> {
    const { error } = await getTableQuery('partnerships').delete().eq('id', id);
    if (error) throw error;
}

export async function upsertLegalInstrumentInSupabase(inst: LegalInstrument): Promise<void> {
    const row = mapLegalInstrumentToRow(inst);
    const { error } = await getTableQuery('legal_instruments').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

export async function deleteLegalInstrumentInSupabase(id: number): Promise<void> {
    const { error } = await getTableQuery('legal_instruments').delete().eq('id', id);
    if (error) throw error;
}

export async function upsertProposalInSupabase(prop: Proposal): Promise<void> {
    const row = mapProposalToRow(prop);
    const { error } = await getTableQuery('proposals').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

export async function deleteProposalInSupabase(id: string): Promise<void> {
    const { error } = await getTableQuery('proposals').delete().eq('id', id);
    if (error) throw error;
}

export async function upsertTaskInSupabase(task: Task): Promise<void> {
    const row = mapTaskToRow(task);
    const { error } = await getTableQuery('tasks').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

export async function deleteTaskInSupabase(id: string): Promise<void> {
    const { error } = await getTableQuery('tasks').delete().eq('id', id);
    if (error) throw error;
}

// --- CONTROLE DE SINCRONIZAÇÃO DIÁRIA DE BACKUP NO SHAREPOINT ---

export async function getLastSharepointBackupDate(): Promise<string | null> {
    try {
        const { data } = await getTableQuery('system_metadata')
            .select('value')
            .eq('key', 'last_sharepoint_daily_backup')
            .single();
        return data?.value?.date || null;
    } catch {
        return localStorage.getItem('last_sharepoint_daily_backup_date');
    }
}

export async function setLastSharepointBackupDate(dateStr: string, details?: any): Promise<void> {
    try {
        localStorage.setItem('last_sharepoint_daily_backup_date', dateStr);
        await getTableQuery('system_metadata').upsert({
            key: 'last_sharepoint_daily_backup',
            value: {
                date: dateStr,
                timestamp: new Date().toISOString(),
                details
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } catch (e) {
        console.warn("Não foi possível salvar data do backup no Supabase metadata:", e);
    }
}

export async function logSyncEvent(syncType: string, status: string, details: any): Promise<void> {
    try {
        await getTableQuery('sync_logs').insert({
            sync_type: syncType,
            status,
            details
        });
    } catch {
        // Silently skip if sync_logs table is not yet ready
    }
}
