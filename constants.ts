
import { User, Partnership, LegalInstrument, Task, PartnershipStatus, ProjectType, LegalInstrumentType, SystemSettings } from './types';
import { v4 as uuidv4 } from './utils/uuid';

export const MOCK_USERS: User[] = [
    { 
        id: 'user-1', 
        name: 'Priscila Passos', 
        email: 'priscilapassos@ctvacinas.org', 
        role: 'Administrador Master', 
    },
    { 
        id: 'user-2', 
        name: 'Priscila Passos (Gmail)', 
        email: 'priscilapassos.ctvacinas@gmail.com', 
        role: 'Administrador Master', 
    },
];

export const MOCK_PARTNERSHIPS: Partnership[] = [];

export const MOCK_LEGAL_INSTRUMENTS: LegalInstrument[] = [];

export const MOCK_TASKS: Task[] = [];

export const DEFAULT_SETTINGS: SystemSettings = {
    senderEmail: 'testes@ctvacinas.org',
    bolsas: [],
    maintenanceMode: {
        enabled: false,
        message: 'Estamos realizando melhorias programadas e manutenção técnica no sistema. O acesso será restabelecido em breve.',
    },
};
