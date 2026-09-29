
export enum PartnershipStatus {
    Negotiating = 'Em negociação',
    Executing = 'Em execução',
    Rejected = 'Indeferido',
    Finished = 'Finalizado',
    Edict = 'Edital',
}

export enum ProjectType {
    CoDevelopment = 'Codesenvolvimento',
    Service = 'Prestação de Serviços',
    Institutional = 'Institucional',
    Embrapii = 'Embrapii',
    Edicts = 'Editais',
    NDA = 'NDA',
}

export enum LegalInstrumentType {
    PartnershipAgreement = 'Acordo de Parceria',
    ServiceAgreement = 'Prestação de Serviços',
    ServiceContract = 'Contratação de Serviços',
    MOU = 'Memorando de Entendimento',
    StrategicAlliance = 'Aliança estratégica',
    NDA = 'NDA',
    ManagementSheet = 'Ficha de Gestão',
    SIEX = 'SIEX',
    PatentKnowHow = 'Patente/Know-how',
    ProtocolOfIntent = 'Protocolo de Intenções',
    Other = 'Outros',
}

export enum View {
    Dashboard = 'Dashboard',
    Partnerships = 'Parcerias',
    LegalInstruments = 'Instrumentos Jurídicos',
    Tasks = 'Tarefas',
    InternalProjects = 'Projetos Internos',
    Pricing = 'Precificação',
    Proposals = 'Propostas',
    Settings = 'Configurações',
}

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'error';

export interface MaintenanceModeConfig {
    enabled: boolean;
    message?: string;
    enabledAt?: string;
    enabledBy?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Coordenador' | 'Pesquisador' | 'Administrador' | 'Administrador Master' | 'Consulta';
    platform?: string;
}

export interface Partner {
    id: string;
    name:string;
    coordinator: string;
}

export interface HistoryEntry {
    id: string; // Added ID for read tracking
    date: string;
    description: string;
    user: string;
    link?: string;
}

export interface UploadedFile {
    id: string;
    file: { name: string; };
    observations: string;
    user: string;
    date: string;
    webUrl?: string;
}

export interface Partnership {
    id: string;
    reference: string;
    status: PartnershipStatus;
    title: string;
    funder: string;
    funderCoordinator: string;
    partners: Partner[];
    ctvCoordinator: User;
    ctvResearcher: User;
    ctvBusinessPartner: User;
    entryDate: string;
    executionStartDate: string;
    approvedValue: number;
    projectType: ProjectType;
    folderWebUrl?: string;
    folderId?: string;
    linkedInstrumentIds: number[];
    observations: string[];
    projectNumber: string;
    history: HistoryEntry[];
    documents: UploadedFile[];
    confidential?: boolean;
    internalProjectId?: string;
}

export interface LegalInstrumentAddendum {
    id: string;
    signatureDate: string;
    newExpirationDate: string;
    documentWebUrl?: string;
}

export interface LegalInstrument {
    id: number;
    signatories: string[];
    type: LegalInstrumentType;
    linkedPartnershipIds: string[];
    object: string;
    signatureDate: string;
    expirationDate: string;
    document?: { name: string };
    documentWebUrl?: string;
    folderId?: string;
    folderWebUrl?: string;
    observations: string;
    addendums: LegalInstrumentAddendum[];
}

export interface Task {
    id: string;
    partnershipId: string;
    title: string;
    description: string;
    assignedTo: User[];
    dueDate: string;
    completed: boolean;
    completedBy?: string;
    completionDate?: string;
    createdBy: string;
    creationDate: string;
}

export interface Notification {
    id: string;
    recipient: string;
    subject: string;
    body: string;
    timestamp: string;
    read: boolean;
    link?: {
        view: View;
        partnershipId: string;
        instrumentId?: number;
    };
}

export interface InternalProject {
    id: string;
    name: string;
}

export interface PersonnelCost {
    id: string;
    personName: string;
    monthlyValue: number;
    dedicationHours: number;
    totalValue: number;
}

export interface InputCost {
    id: string;
    description: string;
    unitValue: number;
    quantity: number;
    totalValue: number;
}

export interface CalibrationCost {
    id: string;
    equipmentName: string;
    value: number;
    quantity: number;
    totalValue: number;
}

export interface ExternalQuoteFile {
    id: string;
    fileName: string;
    webUrl: string;
    uploadedAt: string;
}

export interface PricingAuditEntry {
    id: string;
    date: string;
    userName: string;
    category: 'Recursos Humanos' | 'Insumos' | 'Calibração' | 'Geral' | 'Cotação Externa';
    action: string;
}

export interface Essay {
    id: string;
    name: string;
    responsibleUser?: User;
    personnelCosts: PersonnelCost[];
    inputCosts: InputCost[];
    calibrationCosts: CalibrationCost[];
    totalCost: number;
    externalQuoteFile?: ExternalQuoteFile;
    history?: PricingAuditEntry[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Study {
    id: string;
    name: string;
    essayIds: string[];
    totalCost: number;
}

export interface ProposalItemCostBreakdown {
    personnelCosts: PersonnelCost[];
    inputCosts: InputCost[];
    calibrationCosts: CalibrationCost[];
    subtotalPersonnel: number;
    subtotalInputs: number;
    subtotalCalibration: number;
    responsibleUserName?: string;
    studyName?: string;
    originalEssayName?: string;
    capturedAt: string;
}

export interface ProposalItem {
    id: string;
    type: 'essay' | 'study';
    itemId: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    breakdownSnapshot?: ProposalItemCostBreakdown;
}

export type ProposalStatus = 'Rascunho' | 'Em Elaboração' | 'Enviada' | 'Aprovada' | 'Não Aprovada';

export interface ProposalRevision {
    id: string;
    date: string;
    userName: string;
    action: string;
    previousStatus?: ProposalStatus;
    newStatus?: ProposalStatus;
}

export interface Proposal {
    id: string;
    title: string;
    partnershipId: string;
    items: ProposalItem[];
    totalValue: number;
    safetyMarginPercentage: number;
    safetyMarginValue: number;
    profitMarginPercentage: number;
    profitMarginValue: number;
    taxesPercentage: number;
    taxesValue: number;
    status: ProposalStatus;
    statusChangedAt?: string;
    revisionHistory?: ProposalRevision[];
    createdAt: string;
    updatedAt: string;
}

export interface SystemSettings {
    senderEmail: string;
    bolsas?: Bolsa[];
    logoLeft?: string;
    logoCenter?: string;
    logoRight?: string;
    maintenanceMode?: MaintenanceModeConfig;
}

export interface Bolsa {
    id: string;
    cargo: string;
    valorBolsa: number;
    cargaHoraria: number;
    dataAlteracao: string;
}

export interface AppState {
    users: User[];
    partnerships: Partnership[];
    legalInstruments: LegalInstrument[];
    tasks: Task[];
    sentExpirationWarnings: Record<string, { sixty?: boolean, thirty?: boolean, seven?: boolean }>;
    systemSettings: SystemSettings;
    readHistoryIds?: string[]; // Added to persist read history
    internalProjects?: InternalProject[];
    studies?: Study[];
    essays?: Essay[];
    proposals?: Proposal[];
}
