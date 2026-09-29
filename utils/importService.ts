
import { 
    Partnership, 
    User, 
    PartnershipStatus, 
    ProjectType, 
    LegalInstrument, 
    LegalInstrumentType,
    AppState,
    Task,
    InternalProject,
    Study,
    Essay,
    Proposal,
    SystemSettings 
} from '../types';
import { v4 as uuidv4 } from 'uuid';


const getColumnIndexMap = (headers: string[]): Record<string, number> => {
    const map: Record<string, number> = {};
    headers.forEach((header, index) => {
        // Remove quotes if present
        const cleanHeader = header.trim().replace(/^"|"$/g, '');
        map[cleanHeader] = index;
    });
    return map;
};

const splitCSVLine = (line: string): string[] => {
    // Split by semicolon, handling quotes if necessary (basic implementation)
    // For robust CSV parsing, a library is better, but this suffices for the requirement
    return line.split(';'); 
};

export const parsePartnerships = (csvContent: string, users: User[]): Omit<Partnership, 'history' | 'documents' | 'linkedInstrumentIds' | 'folderWebUrl' | 'folderId'>[] => {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
    }

    const headers = splitCSVLine(lines[0]);
    const idxMap = getColumnIndexMap(headers);
    const requiredHeaders = ['reference', 'title', 'status', 'ctvCoordinatorEmail', 'ctvResearcherEmail', 'ctvBusinessPartnerEmail'];
    for (const header of requiredHeaders) {
        if (idxMap[header] === undefined) {
            throw new Error(`Coluna obrigatória ausente no arquivo de parcerias: ${header}`);
        }
    }

    const newPartnerships: Omit<Partnership, 'history' | 'documents' | 'linkedInstrumentIds' | 'folderWebUrl' | 'folderId'>[] = [];
    const newIdStart = Date.now();

    for (let i = 1; i < lines.length; i++) {
        const data = splitCSVLine(lines[i]);
        
        // Basic safety check for empty lines within file
        if (data.length <= 1 && data[0].trim() === '') continue;

        const getField = (key: string) => {
            const val = data[idxMap[key]];
            return val ? val.trim().replace(/^"|"$/g, '') : '';
        };

        const coordinatorEmail = getField('ctvCoordinatorEmail');
        const researcherEmail = getField('ctvResearcherEmail');
        const businessPartnerEmail = getField('ctvBusinessPartnerEmail');

        const coordinator = users.find(u => u.email.trim().toLowerCase() === coordinatorEmail.toLowerCase());
        const researcher = users.find(u => u.email.trim().toLowerCase() === researcherEmail.toLowerCase());
        const businessPartner = users.find(u => u.email.trim().toLowerCase() === businessPartnerEmail.toLowerCase());

        if (!coordinator) throw new Error(`Linha ${i + 1}: Coordenador com email "${coordinatorEmail}" não encontrado.`);
        if (!researcher) throw new Error(`Linha ${i + 1}: Pesquisador com email "${researcherEmail}" não encontrado.`);
        if (!businessPartner) throw new Error(`Linha ${i + 1}: Contato de Negócios e Parcerias com email "${businessPartnerEmail}" não encontrado.`);
        
        const localToday = new Date().toLocaleDateString('en-CA');

        const parseImportedDate = (val: string) => {
            if (!val) return '';
            const d = new Date(val + 'T00:00:00');
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
        };

        const partnership: Omit<Partnership, 'history' | 'documents' | 'linkedInstrumentIds' | 'folderWebUrl' | 'folderId'> = {
            id: `p-import-${newIdStart + i}`,
            reference: getField('reference'),
            title: getField('title'),
            status: (getField('status') as PartnershipStatus) || PartnershipStatus.Negotiating,
            projectType: (getField('projectType') as ProjectType) || ProjectType.CoDevelopment,
            funder: getField('funder'),
            funderCoordinator: getField('funderCoordinator'),
            ctvCoordinator: coordinator,
            ctvResearcher: researcher,
            ctvBusinessPartner: businessPartner,
            entryDate: parseImportedDate(getField('entryDate')) || localToday,
            executionStartDate: parseImportedDate(getField('executionStartDate')) || '',
            approvedValue: parseFloat(getField('approvedValue').replace(',', '.')) || 0, // Handle currency comma
            projectNumber: getField('projectNumber'),
            observations: [getField('observations')],
            partners: [], 
        };
        newPartnerships.push(partnership);
    }
    return newPartnerships;
};

export const parseLegalInstruments = (csvContent: string, partnerships: Partnership[]): Omit<LegalInstrument, 'addendums'>[] => {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
    }
    
    const headers = splitCSVLine(lines[0]);
    const idxMap = getColumnIndexMap(headers);
    const requiredHeaders = ['id', 'type', 'object', 'signatureDate', 'expirationDate', 'linkedPartnershipReferences'];
    for (const header of requiredHeaders) {
        if (idxMap[header] === undefined) {
            throw new Error(`Coluna obrigatória ausente no arquivo de instrumentos: ${header}`);
        }
    }

    const newInstruments: Omit<LegalInstrument, 'addendums'>[] = [];

    const parseImportedDate = (val: string) => {
        if (!val) return '';
        const d = new Date(val + 'T00:00:00');
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
    };

    for (let i = 1; i < lines.length; i++) {
        const data = splitCSVLine(lines[i]);
        if (data.length <= 1 && data[0].trim() === '') continue;

        const getField = (key: string) => {
            const val = data[idxMap[key]];
            return val ? val.trim().replace(/^"|"$/g, '') : '';
        };

        const partnershipRefs = getField('linkedPartnershipReferences').split('|').map(ref => ref.trim()); // Use | for list in CSV cell
        const linkedPartnershipIds: string[] = [];
        
        partnershipRefs.forEach(ref => {
            if (!ref) return;
            const p = partnerships.find(p => p.reference === ref);
            if(p) {
                linkedPartnershipIds.push(p.id);
            } else {
                 // Log warning but allow import? Enforcing strictly for now.
                 throw new Error(`Linha ${i + 1}: Parceria com referência "${ref}" não encontrada.`);
            }
        });

        const instrument: Omit<LegalInstrument, 'addendums'> = {
            id: parseInt(getField('id'), 10),
            type: (getField('type') as LegalInstrumentType) || LegalInstrumentType.Other,
            object: getField('object'),
            signatureDate: parseImportedDate(getField('signatureDate')),
            expirationDate: parseImportedDate(getField('expirationDate')),
            linkedPartnershipIds,
            signatories: getField('signatories').split('|') || [], // Use | for list in CSV cell
            observations: getField('observations'),
        };
        newInstruments.push(instrument);
    }
    return newInstruments;
};

export const parseUsers = (csvContent: string): Omit<User, 'id'>[] => {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
    }

    const headers = splitCSVLine(lines[0]);
    const idxMap = getColumnIndexMap(headers);
    const requiredHeaders = ['name', 'email', 'role'];
    for (const header of requiredHeaders) {
        if (idxMap[header] === undefined) {
            throw new Error(`Coluna obrigatória ausente no arquivo de usuários: ${header}`);
        }
    }

    const newUsers: Omit<User, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const data = splitCSVLine(lines[i]);
        if (data.length <= 1 && data[0].trim() === '') continue;

        const getField = (key: string) => {
            const val = data[idxMap[key]];
            return val ? val.trim().replace(/^"|"$/g, '') : '';
        };

        const user: Omit<User, 'id'> = {
            name: getField('name'),
            email: getField('email'),
            role: (getField('role') as any) || 'Pesquisador',
            platform: getField('platform'),
        };
        newUsers.push(user);
    }
    return newUsers;
};

export interface JsonImportSummary {
    partnerships: number;
    legalInstruments: number;
    tasks: number;
    users: number;
    internalProjects: number;
    proposals: number;
    studies: number;
    essays: number;
    hasSettings: boolean;
}

export interface JsonImportResult {
    success: boolean;
    data?: Partial<AppState>;
    error?: string;
    summary: JsonImportSummary;
}

/**
 * Analisa e valida um arquivo .JSON (como DatabaseSpabase.json ou backup completo)
 */
export const parseJsonDatabase = (jsonString: string): JsonImportResult => {
    const summary: JsonImportSummary = {
        partnerships: 0,
        legalInstruments: 0,
        tasks: 0,
        users: 0,
        internalProjects: 0,
        proposals: 0,
        studies: 0,
        essays: 0,
        hasSettings: false
    };

    try {
        if (!jsonString || !jsonString.trim()) {
            return {
                success: false,
                error: 'O arquivo JSON selecionado está completamente vazio.',
                summary
            };
        }

        const raw = JSON.parse(jsonString);

        if (!raw || typeof raw !== 'object') {
            return {
                success: false,
                error: 'Formato inválido: o conteúdo do arquivo não é um objeto ou lista JSON.',
                summary
            };
        }

        const parsedData: Partial<AppState> = {};

        // Caso 1: O arquivo seja um array direto de parcerias
        if (Array.isArray(raw)) {
            if (raw.length > 0 && ('reference' in raw[0] || 'title' in raw[0])) {
                parsedData.partnerships = raw.map((p, idx) => ({
                    ...p,
                    id: p.id || `p-import-${Date.now()}-${idx}`,
                    history: Array.isArray(p.history) ? p.history : [],
                    documents: Array.isArray(p.documents) ? p.documents : [],
                    linkedInstrumentIds: Array.isArray(p.linkedInstrumentIds) ? p.linkedInstrumentIds : []
                }));
                summary.partnerships = parsedData.partnerships.length;
                return {
                    success: true,
                    data: parsedData,
                    summary
                };
            } else {
                return {
                    success: false,
                    error: 'A lista JSON não contém entidades reconhecíveis (parcerias ou metadados).',
                    summary
                };
            }
        }

        // Caso 2: Objeto completo com coleções (AppState padrão ou prefixado com np_)
        const rawPartnerships = raw.partnerships || raw.np_partnerships;
        if (Array.isArray(rawPartnerships)) {
            parsedData.partnerships = rawPartnerships.map((p: any, idx: number) => ({
                ...p,
                id: p.id || `p-${Date.now()}-${idx}`,
                history: Array.isArray(p.history) ? p.history : [],
                documents: Array.isArray(p.documents) ? p.documents : [],
                linkedInstrumentIds: Array.isArray(p.linkedInstrumentIds) ? p.linkedInstrumentIds : []
            }));
            summary.partnerships = parsedData.partnerships.length;
        }

        const rawInstruments = raw.legalInstruments || raw.legal_instruments || raw.np_legal_instruments;
        if (Array.isArray(rawInstruments)) {
            parsedData.legalInstruments = rawInstruments.map((inst: any, idx: number) => ({
                ...inst,
                id: typeof inst.id === 'number' ? inst.id : parseInt(inst.id, 10) || (idx + 1),
                addendums: Array.isArray(inst.addendums) ? inst.addendums : [],
                linkedPartnershipIds: Array.isArray(inst.linkedPartnershipIds) ? inst.linkedPartnershipIds : []
            }));
            summary.legalInstruments = parsedData.legalInstruments.length;
        }

        const rawTasks = raw.tasks || raw.np_tasks;
        if (Array.isArray(rawTasks)) {
            parsedData.tasks = rawTasks.map((t: any, idx: number) => ({
                ...t,
                id: t.id || `task-${Date.now()}-${idx}`,
                assignedTo: Array.isArray(t.assignedTo) ? t.assignedTo : []
            }));
            summary.tasks = parsedData.tasks.length;
        }

        const rawUsers = raw.users || raw.np_users;
        if (Array.isArray(rawUsers)) {
            parsedData.users = rawUsers.map((u: any, idx: number) => ({
                ...u,
                id: u.id || `user-${idx + 1}`
            }));
            // Garantir que priscilapassos@ctvacinas.org permaneça Administrador Master
            const masterExists = parsedData.users.some(u => u.email?.toLowerCase() === 'priscilapassos@ctvacinas.org');
            if (!masterExists) {
                parsedData.users.unshift({
                    id: 'user-priscila-master',
                    name: 'Priscila Passos',
                    email: 'priscilapassos@ctvacinas.org',
                    role: 'Administrador Master',
                    platform: 'Microsoft'
                });
            }
            summary.users = parsedData.users.length;
        }

        const rawProjects = raw.internalProjects || raw.internal_projects || raw.np_internal_projects;
        if (Array.isArray(rawProjects)) {
            parsedData.internalProjects = rawProjects.map((proj: any, idx: number) => ({
                ...proj,
                id: proj.id || `proj-${Date.now()}-${idx}`
            }));
            summary.internalProjects = parsedData.internalProjects.length;
        }

        const rawProposals = raw.proposals || raw.np_proposals;
        if (Array.isArray(rawProposals)) {
            parsedData.proposals = rawProposals;
            summary.proposals = rawProposals.length;
        }

        const rawStudies = raw.studies || raw.np_studies;
        if (Array.isArray(rawStudies)) {
            parsedData.studies = rawStudies;
            summary.studies = rawStudies.length;
        }

        const rawEssays = raw.essays || raw.np_essays;
        if (Array.isArray(rawEssays)) {
            parsedData.essays = rawEssays;
            summary.essays = rawEssays.length;
        }

        const rawSettings = raw.systemSettings || raw.system_settings || raw.np_system_settings;
        if (rawSettings && typeof rawSettings === 'object') {
            parsedData.systemSettings = rawSettings;
            summary.hasSettings = true;
        }

        if (Array.isArray(raw.readHistoryIds)) {
            parsedData.readHistoryIds = raw.readHistoryIds;
        }

        if (raw.sentExpirationWarnings && typeof raw.sentExpirationWarnings === 'object') {
            parsedData.sentExpirationWarnings = raw.sentExpirationWarnings;
        }

        const totalItems = summary.partnerships + summary.legalInstruments + summary.tasks + 
                           summary.users + summary.internalProjects + summary.proposals + 
                           summary.studies + summary.essays + (summary.hasSettings ? 1 : 0);

        if (totalItems === 0) {
            return {
                success: false,
                error: 'Nenhum dado válido reconhecido no arquivo JSON (esperado chaves como partnerships, legalInstruments, users, etc.).',
                summary
            };
        }

        return {
            success: true,
            data: parsedData,
            summary
        };
    } catch (e: any) {
        return {
            success: false,
            error: `Erro ao processar sintaxe do JSON: ${e.message || 'Arquivo corrompido ou mal formatado'}`,
            summary
        };
    }
};

