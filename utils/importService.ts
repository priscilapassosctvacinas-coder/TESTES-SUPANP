
import { Partnership, User, PartnershipStatus, ProjectType, LegalInstrument, LegalInstrumentType } from '../types';
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
