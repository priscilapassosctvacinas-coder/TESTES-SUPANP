
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from './utils/uuid';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PartnershipView from './components/PartnershipView';
import PartnershipDetailView from './components/PartnershipDetailView';
import LegalInstrumentView from './components/LegalInstrumentView';
import TaskView from './components/TaskView';
import InternalProjectView from './components/InternalProjectView';
import SettingsView from './components/SettingsView';
import PricingView from './components/PricingView';
import ProposalsView from './components/ProposalsView';
import NewPartnershipModal from './components/NewPartnershipModal';
import NewLegalInstrumentModal from './components/NewLegalInstrumentModal';
import LegalInstrumentDetailModal from './components/LegalInstrumentDetailModal';
import NewTaskModal from './components/NewTaskModal';
import UserManagementModal from './components/UserManagementModal';
import NotificationsPanel from './components/NotificationsPanel';
import HelpModal from './components/HelpModal';
import MaintenanceView from './components/MaintenanceView';
import MaintenanceModal from './components/MaintenanceModal';
import { SupabaseMigrationBanner } from './components/SupabaseMigrationBanner';
import { SupabaseMigrationModal } from './components/SupabaseMigrationModal';
import { JsonImportModal } from './components/JsonImportModal';

import { View, Partnership, LegalInstrument, Task, User, UploadedFile, HistoryEntry, LegalInstrumentAddendum, PartnershipStatus, Notification, AppState, SyncStatus, SystemSettings, InternalProject, Study, Essay, Proposal, SystemAuditLog } from './types';
import { MOCK_USERS, MOCK_PARTNERSHIPS, MOCK_LEGAL_INSTRUMENTS, MOCK_TASKS, DEFAULT_SETTINGS } from './constants';
import * as MicrosoftApi from './utils/microsoftApi';
import * as NotificationService from './services/notificationService';
import { 
    loadAllMetadataFromSupabase, 
    saveAllMetadataToSupabase, 
    getLastSharepointBackupDate, 
    setLastSharepointBackupDate, 
    logSyncEvent 
} from './services/supabaseService';
import { parsePartnerships, parseLegalInstruments, parseUsers } from './utils/importService';
import { loadAuditLogsFromLocalStorage, saveAuditLogsToLocalStorage, createAuditEntry, seedAuditLogsFromExistingData } from './services/auditLogService';
import { CTVLogoIcon } from './components/Icons';



type MicrosoftAuthState = 'pending' | 'signedIn' | 'signedOut';

const App: React.FC = () => {
    // Main data states
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [partnerships, setPartnerships] = useState<Partnership[]>(MOCK_PARTNERSHIPS);
    const [legalInstruments, setLegalInstruments] = useState<LegalInstrument[]>(MOCK_LEGAL_INSTRUMENTS);
    const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
    const [internalProjects, setInternalProjects] = useState<InternalProject[]>([]);
    const [sentExpirationWarnings, setSentExpirationWarnings] = useState<Record<string, { sixty?: boolean, thirty?: boolean, seven?: boolean }>>({});
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [readHistoryIds, setReadHistoryIds] = useState<string[]>([]);
    const [studies, setStudies] = useState<Study[]>([]);
    const [essays, setEssays] = useState<Essay[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [systemAuditLogs, setSystemAuditLogs] = useState<SystemAuditLog[]>(() => {
        const local = loadAuditLogsFromLocalStorage();
        return local.length > 0 ? local : seedAuditLogsFromExistingData(MOCK_PARTNERSHIPS);
    });

    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeView, setActiveView] = useState<View>(View.Dashboard);
    const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
    const [selectedLegalInstrument, setSelectedLegalInstrument] = useState<LegalInstrument | null>(null);
    
    // UI Navigation State
    const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

    // Modal and UI states
    const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
    const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);
    const [isNewLegalInstrumentModalOpen, setIsNewLegalInstrumentModalOpen] = useState(false);
    const [editingLegalInstrument, setEditingLegalInstrument] = useState<LegalInstrument | null>(null);
    const [preSelectedPartnershipForInstrument, setPreSelectedPartnershipForInstrument] = useState<Partnership | null>(null);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [preSelectedPartnershipForTask, setPreSelectedPartnershipForTask] = useState<Partnership | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Initialize sidebar state based on screen width ONCE on mount to avoid resize loops
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Notifications
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Microsoft Auth & Sync state
    const [msalInstance, setMsalInstance] = useState<any>(null);
    const [microsoftAuthState, setMicrosoftAuthState] = useState<MicrosoftAuthState>('pending');
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const isDataLoadedFromCloud = useRef(false);
    const isSupabasePopulated = useRef(false);
    const msalInteractionLock = useRef(false);

    // Supabase & SharePoint Daily Backup State
    const [isSharePointDailyBackedUp, setIsSharePointDailyBackedUp] = useState(false);
    const [isBackingUpSharePoint, setIsBackingUpSharePoint] = useState(false);
    const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
    const [isJsonImportModalOpen, setIsJsonImportModalOpen] = useState(false);

    const recordAuditLog = useCallback((
        action: SystemAuditLog['action'],
        entityType: SystemAuditLog['entityType'],
        title: string,
        details: string,
        entityId?: string
    ) => {
        const newEntry = createAuditEntry(currentUser, action, entityType, title, details, entityId);
        setSystemAuditLogs(prev => {
            const updated = [newEntry, ...prev];
            saveAuditLogsToLocalStorage(updated);
            return updated;
        });
    }, [currentUser]);

    const handleClearAuditLogs = useCallback(() => {
        if (currentUser?.role !== 'Administrador Master') return;
        setSystemAuditLogs([]);
        saveAuditLogsToLocalStorage([]);
        recordAuditLog('Exclusão', 'Sistema', 'Limpeza de logs de auditoria', 'Todos os registros anteriores foram limpos pelo Administrador Master.');
    }, [currentUser, recordAuditLog]);



    
    // Deep Linking Handler
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('taskId');
        const partnershipId = params.get('partnershipId');
        
        if (taskId) {
            setActiveView(View.Tasks);
            setHighlightedTaskId(taskId);
            // Clean URL without reloading
            window.history.replaceState({}, '', window.location.pathname);
        } else if (partnershipId) {
             // Will be handled after data load if necessary, but we can set view
             // We need to wait for partnerships to load to select it
        }
    }, []);

    // Effect to handle partnership deep link after data load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const partnershipId = params.get('partnershipId');

        if (partnershipId && partnerships.length > 0) {
            const p = partnerships.find(p => p.id === partnershipId);
            if (p) {
                // Check confidentiality access before selecting
                if (currentUser) {
                     const hasAccess = !p.confidential || 
                        currentUser.role === 'Administrador' ||
                        currentUser.role === 'Administrador Master' ||
                        [p.ctvCoordinator.id, p.ctvResearcher.id, p.ctvBusinessPartner.id].includes(currentUser.id);
                    
                     if (hasAccess) {
                        setSelectedPartnership(p);
                     } else {
                         alert("Você não tem permissão para acessar esta parceria confidencial.");
                     }
                }
            }
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [partnerships, currentUser]);

    // Helper to sanitize SharePoint folder names
    const sanitizeFolderName = (name: string) => {
        const noControlChars = name.replace(/[\r\n\t]/g, ' ');
        return noControlChars.replace(/[<>:"\/\\|?*]/g, '').trim();
    };

    // --- DATA INITIALIZATION & AUTH ---

    useEffect(() => {
        const initAuth = async () => {
            if (msalInteractionLock.current) return;
            try {
                msalInteractionLock.current = true;
                setMicrosoftAuthState('pending');
                const instance = await MicrosoftApi.initializeMsal();
                setMsalInstance(instance);

                if (instance.getActiveAccount()) {
                    setMicrosoftAuthState('signedIn');
                } else {
                    const response = await MicrosoftApi.signInSilently(instance);
                    setMicrosoftAuthState(response ? 'signedIn' : 'signedOut');
                }
            } catch (error) {
                console.error('Microsoft auto sign-in error:', error);
                setMicrosoftAuthState('signedOut');
            } finally {
                msalInteractionLock.current = false;
            }
        };

        initAuth();
    }, []);

    const isMicrosoftSignedIn = microsoftAuthState === 'signedIn';

    // --- DATA SYNCHRONIZATION LOGIC (SUPABASE PRIMARY & SHAREPOINT DAILY BACKUP) ---

    // 1. Carregamento inicial de metadados do SUPABASE
    useEffect(() => {
        const initDataFromSupabase = async () => {
            try {
                setSyncStatus('loading');
                const data = await loadAllMetadataFromSupabase();
                if (data) {
                    const hasRecords = Boolean(
                        (data.partnerships && data.partnerships.length > 0) ||
                        (data.legalInstruments && data.legalInstruments.length > 0) ||
                        (data.users && data.users.length > 0)
                    );

                    if (hasRecords) {
                        if (data.users && data.users.length > 0) setUsers(data.users);
                        if (data.partnerships) setPartnerships(data.partnerships);
                        if (data.legalInstruments) setLegalInstruments(data.legalInstruments);
                        if (data.tasks) setTasks(data.tasks);
                        if (data.sentExpirationWarnings) setSentExpirationWarnings(data.sentExpirationWarnings);
                        if (data.systemSettings) setSystemSettings(data.systemSettings);
                        if (data.readHistoryIds) setReadHistoryIds(data.readHistoryIds);
                        if (data.internalProjects) setInternalProjects(data.internalProjects);
                        if (data.studies) setStudies(data.studies);
                        if (data.essays) setEssays(data.essays);
                        if (data.proposals) setProposals(data.proposals);
                        if (data.systemAuditLogs && data.systemAuditLogs.length > 0) {
                            setSystemAuditLogs(data.systemAuditLogs);
                            saveAuditLogsToLocalStorage(data.systemAuditLogs);
                        }

                        isDataLoadedFromCloud.current = true;

                        isSupabasePopulated.current = true;
                        setSyncStatus('synced');
                        setLastSyncTime(new Date());
                        console.log("Metadados carregados com sucesso do Supabase.");
                    } else {
                        console.log("Supabase conectado, aguardando gravação de metadados.");
                        isDataLoadedFromCloud.current = true;
                        setSyncStatus('idle');
                    }
                } else {
                    console.warn("Supabase ainda não configurado ou inacessível. Usando dados locais como fallback.");
                    // Marca como carregado para permitir edição e salvamento assim que o schema for criado
                    isDataLoadedFromCloud.current = true;
                    setSyncStatus('idle');
                }
            } catch (e) {
                console.error("Erro ao carregar dados do Supabase:", e);
                isDataLoadedFromCloud.current = true;
                setSyncStatus('idle');
            }
        };

        initDataFromSupabase();
    }, []);

    // 2. Salvamento contínuo de metadados no SUPABASE com debounce
    const saveData = useCallback(async () => {
        if (!isDataLoadedFromCloud.current) return;

        const appState: AppState = {
            users,
            partnerships,
            legalInstruments,
            tasks,
            sentExpirationWarnings,
            systemSettings,
            readHistoryIds,
            internalProjects,
            studies,
            essays,
            proposals,
            systemAuditLogs,
        };


        setSyncStatus('saving');
        try {
            const res = await saveAllMetadataToSupabase(appState);
            if (res.success) {
                setSyncStatus('synced');
                setLastSyncTime(new Date());
                isSupabasePopulated.current = true;
            } else {
                console.warn("Aviso ao persistir no Supabase:", res.error);
                // Permite continuar trabalhando mesmo se tabelas ainda estão pendentes de criação
                setSyncStatus('error');
            }
        } catch (error) {
            console.error('Falha ao salvar metadados no Supabase:', error);
            setSyncStatus('error');
        }
    }, [users, partnerships, legalInstruments, tasks, sentExpirationWarnings, systemSettings, readHistoryIds, internalProjects, studies, essays, proposals]);

    // Debounced save effect para o Supabase
    useEffect(() => {
        if (!isDataLoadedFromCloud.current) return;

        const handler = setTimeout(() => {
            saveData();
        }, 2000);

        return () => clearTimeout(handler);
    }, [saveData]);

    // 3. Backup diário para o SharePoint em TODO PRIMEIRO LOGIN DO DIA
    // ATENÇÃO CRÍTICA: O arquivo no SharePoint NUNCA deve sobrepor os dados presentes no Supabase!
    useEffect(() => {
        const handleDailySharePointBackup = async () => {
            if (!isMicrosoftSignedIn || !msalInstance) return;

            const todayStr = new Date().toISOString().split('T')[0];
            const lastBackup = await getLastSharepointBackupDate();

            if (lastBackup === todayStr) {
                setIsSharePointDailyBackedUp(true);
                return;
            }

            // Se o Supabase estiver completamente vazio (1ª vez absoluta), verificamos se existe arquivo prévio para migração
            if (!isSupabasePopulated.current && partnerships.length === 0) {
                try {
                    console.log("Verificando se há dados no SharePoint para semeadura inicial do Supabase...");
                    const cloudState = await MicrosoftApi.downloadDatabase(msalInstance);
                    if (cloudState && (cloudState.partnerships?.length || cloudState.users?.length)) {
                        console.log("Semeando metadados do SharePoint para o Supabase pela primeira vez...");
                        if (cloudState.users) setUsers(cloudState.users);
                        if (cloudState.partnerships) setPartnerships(cloudState.partnerships);
                        if (cloudState.legalInstruments) setLegalInstruments(cloudState.legalInstruments);
                        if (cloudState.tasks) setTasks(cloudState.tasks);
                        if (cloudState.sentExpirationWarnings) setSentExpirationWarnings(cloudState.sentExpirationWarnings);
                        if (cloudState.systemSettings) setSystemSettings(cloudState.systemSettings);
                        if (cloudState.readHistoryIds) setReadHistoryIds(cloudState.readHistoryIds);
                        if (cloudState.internalProjects) setInternalProjects(cloudState.internalProjects);
                        if (cloudState.studies) setStudies(cloudState.studies);
                        if (cloudState.essays) setEssays(cloudState.essays);
                        if (cloudState.proposals) setProposals(cloudState.proposals);

                        await saveAllMetadataToSupabase(cloudState);
                        isSupabasePopulated.current = true;
                    }
                } catch (e: any) {
                    console.log("Nenhum arquivo prévio no SharePoint ou erro na checagem:", e.message || e);
                }
            }

            // ATENÇÃO: Envia para o SharePoint um BACKUP dos dados presentes no Supabase / aplicação
            // O arquivo salvo é nomeado 'DatabaseSpabase.json'
            try {
                setIsBackingUpSharePoint(true);
                const currentAppState: AppState = {
                    users,
                    partnerships,
                    legalInstruments,
                    tasks,
                    sentExpirationWarnings,
                    systemSettings,
                    readHistoryIds,
                    internalProjects,
                    studies,
                    essays,
                    proposals
                };

                await MicrosoftApi.uploadDatabase(msalInstance, currentAppState);
                await setLastSharepointBackupDate(todayStr, {
                    trigger: 'first_login_of_day',
                    timestamp: new Date().toISOString()
                });
                setIsSharePointDailyBackedUp(true);
                console.log(`Backup diário no SharePoint (DatabaseSpabase.json) realizado com sucesso para ${todayStr}.`);
                await logSyncEvent('sharepoint_daily_backup', 'success', { date: todayStr });
            } catch (err: any) {
                console.error("Falha ao realizar backup diário no SharePoint:", err);
                setIsSharePointDailyBackedUp(false);
            } finally {
                setIsBackingUpSharePoint(false);
            }
        };

        handleDailySharePointBackup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMicrosoftSignedIn, msalInstance]);

    // Função para forçar backup manual no SharePoint a qualquer momento
    const handleForceSharePointBackup = async () => {
        if (!isMicrosoftSignedIn || !msalInstance) {
            alert('É necessário estar conectado à Microsoft/SharePoint para realizar o backup.');
            return;
        }

        setIsBackingUpSharePoint(true);
        try {
            const currentAppState: AppState = {
                users,
                partnerships,
                legalInstruments,
                tasks,
                sentExpirationWarnings,
                systemSettings,
                readHistoryIds,
                internalProjects,
                studies,
                essays,
                proposals
            };

            await MicrosoftApi.uploadDatabase(msalInstance, currentAppState);
            const todayStr = new Date().toISOString().split('T')[0];
            await setLastSharepointBackupDate(todayStr, {
                trigger: 'manual_force',
                timestamp: new Date().toISOString()
            });
            setIsSharePointDailyBackedUp(true);
            alert("Backup completo no SharePoint (DatabaseSpabase.json) realizado com sucesso!");
        } catch (error: any) {
            console.error("Erro no backup do SharePoint:", error);
            alert(`Falha no backup do SharePoint: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsBackingUpSharePoint(false);
        }
    };

    // --- END OF SYNC LOGIC ---

    const addNotification = useCallback((emailContent: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        // 1. Update local UI state
        setNotifications(prev => [{
            ...emailContent,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            read: false,
        }, ...prev]);

        // 2. Send actual email if connected
        if (isMicrosoftSignedIn && msalInstance) {
            // Pass the configured system email settings to the API
            const fromEmail = systemSettings.senderEmail;
            
            MicrosoftApi.sendEmail(msalInstance, emailContent.recipient, emailContent.subject, emailContent.body, fromEmail)
                .then(() => console.log(`Email notification sent to ${emailContent.recipient}`))
                .catch(err => console.error(`Failed to send email to ${emailContent.recipient}:`, err));
        }
    }, [isMicrosoftSignedIn, msalInstance, systemSettings]);

    const checkInstrumentExpirations = useCallback(() => {
        const today = new Date();
        legalInstruments.forEach(instrument => {
            const expirationDate = new Date(instrument.expirationDate + 'T00:00:00');
            const diffTime = expirationDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const warningKey = `inst-${instrument.id}`;
            const sentWarnings = sentExpirationWarnings[warningKey] || {};

            const partnershipsForInstrument = partnerships.filter(p => instrument.linkedPartnershipIds.includes(p.id));
            if (partnershipsForInstrument.length === 0) return;
            
            const researchers = partnershipsForInstrument.map(p => p.ctvResearcher);
            const businessPartners = partnershipsForInstrument.map(p => p.ctvBusinessPartner);
            const allRecipients = [...researchers, ...businessPartners];
            const uniqueRecipients = Array.from(new Map(allRecipients.map(user => [user.id, user])).values());


            const createWarning = (days: 60 | 30 | 7, key: 'sixty' | 'thirty' | 'seven') => {
                 if (diffDays > 0 && diffDays <= days && !sentWarnings[key]) {
                    uniqueRecipients.forEach(recipient => {
                       if (recipient) {
                           addNotification(NotificationService.generateExpirationWarningEmail(recipient, instrument, partnershipsForInstrument, diffDays));
                       }
                    });
                    setSentExpirationWarnings(prev => ({
                        ...prev,
                        [warningKey]: { ...prev[warningKey], [key]: true }
                    }));
                }
            };

            createWarning(60, 'sixty');
            createWarning(30, 'thirty');
            createWarning(7, 'seven');
        });
    }, [legalInstruments, partnerships, addNotification, sentExpirationWarnings]);

    useEffect(() => {
        const timer = setInterval(checkInstrumentExpirations, 1000 * 60 * 60 * 24); // Check once a day
        return () => clearInterval(timer);
    }, [checkInstrumentExpirations]);
    
     useEffect(() => {
        if (selectedPartnership) {
            const updatedPartnership = partnerships.find(p => p.id === selectedPartnership.id);
            if (updatedPartnership) {
                // Re-validate access in case user role or confidentiality changed dynamically
                 const hasAccess = !updatedPartnership.confidential || 
                        currentUser?.role === 'Administrador' ||
                        currentUser?.role === 'Administrador Master' ||
                        [updatedPartnership.ctvCoordinator.id, updatedPartnership.ctvResearcher.id, updatedPartnership.ctvBusinessPartner.id].includes(currentUser?.id || '');
                
                if (hasAccess) {
                    setSelectedPartnership(updatedPartnership);
                } else {
                    setSelectedPartnership(null);
                    setActiveView(View.Dashboard);
                }
            } else {
                setSelectedPartnership(null); // Deselect if deleted
            }
        }
    }, [partnerships, selectedPartnership?.id, currentUser]);
    
    const handleInteractiveSignIn = async () => {
        if (!msalInstance || msalInteractionLock.current) return;

        try {
            msalInteractionLock.current = true;
            setMicrosoftAuthState('pending');
            const response = await MicrosoftApi.signInInteractive(msalInstance);
            setMicrosoftAuthState(response ? 'signedIn' : 'signedOut');
        } catch (error: any) {
            if (error.errorCode === 'user_cancelled') {
                console.log("User cancelled the sign-in process.");
            } else {
                console.error("Interactive sign-in failed:", error);
                alert("Falha ao entrar. Por favor, tente novamente.");
            }
            setMicrosoftAuthState('signedOut');
        } finally {
            msalInteractionLock.current = false;
        }
    };

    const handleLogout = useCallback(async () => {
        if (msalInteractionLock.current) return;
        
        if (msalInstance && isMicrosoftSignedIn) {
            try {
                msalInteractionLock.current = true;
                await MicrosoftApi.signOut(msalInstance);
            } catch (e) {
                console.error('Microsoft sign out failed', e);
            } finally {
                msalInteractionLock.current = false;
            }
        }
        setCurrentUser(null);
        setMicrosoftAuthState('signedOut');
    }, [isMicrosoftSignedIn, msalInstance]);
    
    useEffect(() => {
        if (isMicrosoftSignedIn && msalInstance && !currentUser) {
            const account = msalInstance.getActiveAccount() || (msalInstance.getAllAccounts().length > 0 ? msalInstance.getAllAccounts()[0] : null);
            
            let email = '';
            let name = '';

            if (account) {
                email = (
                    account.username || 
                    (account.idTokenClaims as any)?.preferred_username || 
                    (account.idTokenClaims as any)?.email || 
                    (account.idTokenClaims as any)?.upn || 
                    ''
                ).toLowerCase().trim();
                name = account.name || (account.idTokenClaims as any)?.name || '';
            }

            if (!email) {
                console.error("Conta Microsoft sem e-mail identificável.");
                alert("Não foi possível identificar o e-mail da sua conta Microsoft. Por favor, tente entrar novamente.");
                handleLogout();
                return;
            }

            console.log(`Validando acesso para a conta Microsoft autenticada: ${email}`);

            let userInDb = users.find(u => u.email.toLowerCase() === email);

            // Se for Priscila Passos autenticada via Microsoft, assegurar papel de Administrador Master
            if (email === 'priscilapassos@ctvacinas.org') {
                if (!userInDb) {
                    const masterAdmin: User = {
                        id: 'user-priscila-master',
                        name: name || 'Priscila Passos',
                        email: 'priscilapassos@ctvacinas.org',
                        role: 'Administrador Master'
                    };
                    userInDb = masterAdmin;
                    setUsers(prev => [masterAdmin, ...prev.filter(u => u.email.toLowerCase() !== masterAdmin.email.toLowerCase())]);
                } else if (userInDb.role !== 'Administrador Master') {
                    userInDb = { ...userInDb, role: 'Administrador Master' };
                    setUsers(prev => prev.map(u => u.id === userInDb!.id ? userInDb! : u));
                }
            } else if (!userInDb) {
                // Tenta buscar no mock pré-definido
                const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email);
                if (mockUser) {
                    userInDb = mockUser;
                    setUsers(prev => [mockUser, ...prev.filter(u => u.id !== mockUser.id)]);
                }
            }

            if (userInDb) {
                setCurrentUser(userInDb);
            } else {
                alert(`A conta Microsoft (${email}) não possui autorização de acesso ao sistema. Solicite o cadastro a um administrador.`);
                handleLogout();
            }
        }
    }, [isMicrosoftSignedIn, msalInstance, users, currentUser, handleLogout]);



    const addHistoryEntry = useCallback((partnershipId: string, description: string, link?: string) => {
        if (currentUser?.role === 'Consulta') return; // Restriction
        setPartnerships(prev => prev.map(p => {
            if (p.id === partnershipId) {
                const newEntry: HistoryEntry = {
                    id: uuidv4(),
                    date: new Date().toISOString(),
                    description,
                    user: currentUser!.email,
                };
                if (link) {
                    newEntry.link = link;
                }
                return { ...p, history: [newEntry, ...p.history] };
            }
            return p;
        }));
    }, [currentUser]);

    const handleMarkHistoryRead = (historyId: string) => {
        setReadHistoryIds(prev => [...prev, historyId]);
    };

    const addDocumentToPartnership = useCallback(async (partnershipId: string, file: File, observations: string) => {
        if (!currentUser) throw new Error('Usuário não autenticado.');
        if (currentUser.role === 'Consulta') throw new Error('Permissão negada.');
        if (!isMicrosoftSignedIn || !msalInstance) {
            alert('É necessário estar conectado à sua conta Microsoft para salvar documentos na nuvem.');
            throw new Error('Usuário não autenticado com a Microsoft.');
        }

        const partnership = partnerships.find(p => p.id === partnershipId);
        if (!partnership)  throw new Error('Parceria não encontrada.');
        
        try {
            const folderName = sanitizeFolderName(partnership.reference);
            const uploadedFile = await MicrosoftApi.uploadFileToPartnership(msalInstance, folderName, file);

            const newDocument: UploadedFile = {
                id: uuidv4(),
                file: { name: file.name },
                observations: observations || "Nenhuma observação.",
                user: currentUser.email,
                date: new Date().toISOString(),
                webUrl: uploadedFile.webUrl,
            };

            setPartnerships(prev => prev.map(p => p.id === partnershipId ? { ...p, documents: [newDocument, ...p.documents] } : p));
            addHistoryEntry(partnershipId, `Documento "${file.name}" salvo na nuvem.`, `#document-${newDocument.id}`);
        } catch (error) {
            console.error('Failed to upload document:', error);
            alert('Falha ao enviar o documento para o SharePoint.');
            throw error;
        }
    }, [currentUser, partnerships, addHistoryEntry, msalInstance, isMicrosoftSignedIn]);

    const handleSaveLegalInstrument = useCallback(async (instrumentData: Omit<LegalInstrument, 'id' | 'addendums'>, file: File | null) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            if (editingLegalInstrument) {
                // EDIT MODE
                const updatedInstrument = { 
                    ...editingLegalInstrument, 
                    ...instrumentData,
                    addendums: editingLegalInstrument.addendums // Preserve addendums
                };

                // Sync Partnership Links: Remove from old, add to new
                const oldLinkedIds = editingLegalInstrument.linkedPartnershipIds;
                const newLinkedIds = instrumentData.linkedPartnershipIds;

                setPartnerships(prev => prev.map(p => {
                    let updatedLinkedIds = p.linkedInstrumentIds;
                    // If p was linked and now is not, remove
                    if (oldLinkedIds.includes(p.id) && !newLinkedIds.includes(p.id)) {
                        updatedLinkedIds = updatedLinkedIds.filter(id => id !== editingLegalInstrument.id);
                    }
                    // If p was NOT linked and now IS, add
                    if (!oldLinkedIds.includes(p.id) && newLinkedIds.includes(p.id)) {
                         if (!updatedLinkedIds.includes(editingLegalInstrument.id)) {
                             updatedLinkedIds = [...updatedLinkedIds, editingLegalInstrument.id];
                             addHistoryEntry(p.id, `Instrumento Jurídico Nº ${String(editingLegalInstrument.id).padStart(4, '0')} vinculado.`, `#instrument-${editingLegalInstrument.id}`);
                         }
                    }
                    return { ...p, linkedInstrumentIds: updatedLinkedIds };
                }));

                setLegalInstruments(prev => prev.map(inst => inst.id === editingLegalInstrument.id ? updatedInstrument : inst));
                recordAuditLog('Edição', 'Instrumento Jurídico', `Instrumento Jurídico Nº ${updatedInstrument.id} atualizado`, `Tipo: ${updatedInstrument.type} | Objeto: "${updatedInstrument.object}"`, String(updatedInstrument.id));
                setEditingLegalInstrument(null);


            } else {
                // CREATE MODE
                // Calculate ID first to use in folder name
                const newId = (legalInstruments.length > 0 ? Math.max(...legalInstruments.map(i => i.id)) : 0) + 1;
                // Format ID to 000*
                const formattedId = String(newId).padStart(4, '0');
                
                let folderId: string | undefined;
                let folderLink: string | undefined;
                let documentWebUrl = '';
                
                // Folder name format: 000* *Tipo*
                const folderName = sanitizeFolderName(`${formattedId} ${instrumentData.type}`);

                if (isMicrosoftSignedIn && msalInstance) {
                    const folderInfo = await MicrosoftApi.createLegalInstrumentFolder(msalInstance, folderName);
                    folderId = folderInfo.id;
                    folderLink = folderInfo.webUrl;
                    
                    if (file && folderId) {
                        const uploadedFile = await MicrosoftApi.uploadFileToLegalInstrument(msalInstance, folderName, file);
                        documentWebUrl = uploadedFile.webUrl;
                    }
                } else {
                    alert('Aviso: Conecte-se à Microsoft para criar uma pasta e salvar o arquivo do instrumento na nuvem.');
                }

                const newInstrument: LegalInstrument = {
                    ...instrumentData,
                    id: newId,
                    addendums: [],
                    folderId: folderId,
                    folderWebUrl: folderLink,
                    documentWebUrl: documentWebUrl,
                    document: file ? { name: file.name } : undefined,
                };

                setLegalInstruments(prev => [newInstrument, ...prev].sort((a,b) => b.id - a.id));
                recordAuditLog('Criação', 'Instrumento Jurídico', `Novo Instrumento Jurídico Nº ${formattedId} cadastrado`, `Tipo: ${newInstrument.type} | Objeto: "${newInstrument.object}"`, String(newInstrument.id));


                instrumentData.linkedPartnershipIds.forEach(pId => {
                    addHistoryEntry(pId, `Instrumento Jurídico vinculado: Nº ${formattedId} (${newInstrument.type})`, `#instrument-${newInstrument.id}`);
                });
                setPartnerships(prev => prev.map(p => instrumentData.linkedPartnershipIds.includes(p.id) ? { ...p, linkedInstrumentIds: [...p.linkedInstrumentIds, newInstrument.id] } : p));
            }

            setIsNewLegalInstrumentModalOpen(false);
            setPreSelectedPartnershipForInstrument(null);
        } catch (error) {
            console.error('Failed to save legal instrument:', error);
            alert('Falha ao salvar instrumento jurídico.');
        } finally {
            setIsSubmitting(false);
        }
    }, [legalInstruments, editingLegalInstrument, currentUser, msalInstance, addHistoryEntry, isMicrosoftSignedIn]);

    const handleOpenInstrumentModal = (instrument: LegalInstrument | null = null) => {
        setEditingLegalInstrument(instrument);
        setIsNewLegalInstrumentModalOpen(true);
    };

    const handleDeleteLegalInstrument = (instrumentId: number) => {
        const target = legalInstruments.find(inst => inst.id === instrumentId);
        if (window.confirm('Tem certeza de que deseja excluir este instrumento jurídico?')) {
            setLegalInstruments(prev => prev.filter(inst => inst.id !== instrumentId));
            // Remove link from partnerships
            setPartnerships(prev => prev.map(p => ({
                ...p,
                linkedInstrumentIds: p.linkedInstrumentIds.filter(id => id !== instrumentId)
            })));
            recordAuditLog('Exclusão', 'Instrumento Jurídico', `Instrumento Jurídico Nº ${String(instrumentId).padStart(4, '0')} excluído`, `Tipo: ${target?.type || 'N/A'} | Objeto: "${target?.object || 'N/A'}"`, String(instrumentId));
        }
    };

    const handleAddAddendum = useCallback(async (instrumentId: number, addendumData: Omit<LegalInstrumentAddendum, 'id'>, file: File | null) => {
        const instrument = legalInstruments.find(inst => inst.id === instrumentId);
        if (!instrument || !currentUser) return;
        
        let documentWebUrl = '';
        if (isMicrosoftSignedIn && file && instrument.folderId && msalInstance) {
            try {
                // Re-construct folder name to match creation logic
                const formattedId = String(instrument.id).padStart(4, '0');
                const folderName = sanitizeFolderName(`${formattedId} ${instrument.type}`);
                const uploadedFile = await MicrosoftApi.uploadFileToLegalInstrument(msalInstance, folderName, file);
                documentWebUrl = uploadedFile.webUrl;
            } catch (error) {
                 console.error('Failed to upload addendum file:', error);
                 alert('Falha ao enviar o arquivo do aditivo.');
                 return;
            }
        }
    
        const newAddendum: LegalInstrumentAddendum = { ...addendumData, id: uuidv4(), documentWebUrl: documentWebUrl };
        setLegalInstruments(prev => prev.map(inst => inst.id === instrumentId ? { ...inst, addendums: [...inst.addendums, newAddendum] } : inst));
        instrument.linkedPartnershipIds.forEach(pId => addHistoryEntry(pId, `Aditivo adicionado ao Instrumento Jurídico Nº ${String(instrument.id).padStart(4, '0')}.`));
        recordAuditLog('Edição', 'Instrumento Jurídico', `Termo aditivo adicionado ao Instrumento Nº ${String(instrumentId).padStart(4, '0')}`, `Nova expiração: ${addendumData.newExpirationDate}`, String(instrumentId));
    }, [legalInstruments, addHistoryEntry, currentUser, msalInstance, isMicrosoftSignedIn, recordAuditLog]);

    const handleUpdateAddendum = useCallback(async (instrumentId: number, addendumId: string, updatedData: Partial<LegalInstrumentAddendum>, file: File | null) => {
        const instrument = legalInstruments.find(inst => inst.id === instrumentId);
        if (!instrument || !currentUser) return;

        let documentWebUrl = instrument.addendums.find(a => a.id === addendumId)?.documentWebUrl;

        if (isMicrosoftSignedIn && file && instrument.folderId && msalInstance) {
            try {
                 const formattedId = String(instrument.id).padStart(4, '0');
                 const folderName = sanitizeFolderName(`${formattedId} ${instrument.type}`);
                 const uploadedFile = await MicrosoftApi.uploadFileToLegalInstrument(msalInstance, folderName, file);
                 documentWebUrl = uploadedFile.webUrl;
            } catch (error) {
                 console.error('Failed to upload addendum file:', error);
                 alert('Falha ao atualizar o arquivo do aditivo.');
            }
        }

        setLegalInstruments(prev => prev.map(inst => {
            if (inst.id === instrumentId) {
                return {
                    ...inst,
                    addendums: inst.addendums.map(a => a.id === addendumId ? { ...a, ...updatedData, documentWebUrl } : a)
                };
            }
            return inst;
        }));
        instrument.linkedPartnershipIds.forEach(pId => addHistoryEntry(pId, `Aditivo atualizado no Instrumento Jurídico Nº ${String(instrument.id).padStart(4, '0')}.`));
        recordAuditLog('Edição', 'Instrumento Jurídico', `Termo aditivo atualizado no Instrumento Nº ${String(instrumentId).padStart(4, '0')}`, `Aditivo ID: ${addendumId}`, String(instrumentId));

    }, [legalInstruments, addHistoryEntry, currentUser, msalInstance, isMicrosoftSignedIn, recordAuditLog]);


    const handleDeleteAddendum = (instrumentId: number, addendumId: string) => {
        if (window.confirm('Tem certeza de que deseja excluir este aditivo?')) {
            setLegalInstruments(prev => prev.map(inst => {
                if (inst.id === instrumentId) {
                    return { ...inst, addendums: inst.addendums.filter(a => a.id !== addendumId) };
                }
                return inst;
            }));
            recordAuditLog('Exclusão', 'Instrumento Jurídico', `Termo aditivo removido do Instrumento Nº ${String(instrumentId).padStart(4, '0')}`, `Aditivo ID: ${addendumId}`, String(instrumentId));
        }
    };


    const handleOpenPartnershipModal = (partnership: Partnership | null = null) => {
        setEditingPartnership(partnership);
        setIsPartnershipModalOpen(true);
    };
    
    const handlePartnershipSubmit = async (partnershipData: Omit<Partnership, 'id' | 'history' | 'documents' | 'linkedInstrumentIds' | 'folderWebUrl' | 'folderId'>) => {
        // VALIDATION
        const cleanReference = partnershipData.reference.trim();

        // 1. Check Duplicates (Reference must be unique)
        const isDuplicate = partnerships.some(p => 
            p.reference.toLowerCase() === cleanReference.toLowerCase() && 
            p.id !== editingPartnership?.id
        );

        if (isDuplicate) {
            alert('Parceria já registrada. Não é possível criar duas parcerias com a mesma referência.');
            return;
        }

        // 2. Check SharePoint Invalid Characters
        const invalidCharsRegex = /[~"#%&*:<>?/\\{|}]/;
        if (invalidCharsRegex.test(cleanReference)) {
            alert('A referência contém caracteres não permitidos para nomes de pastas no SharePoint.\n\nCaracteres proibidos: ~ " # % & * : < > ? / \\ { | }');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingPartnership) {
                // Detect changes in Researcher or Business Partner to send notifications
                const prevResearcher = editingPartnership.ctvResearcher;
                const newResearcher = partnershipData.ctvResearcher;
                const prevBusiness = editingPartnership.ctvBusinessPartner;
                const newBusiness = partnershipData.ctvBusinessPartner;
                
                // Merge data
                const updatedPartnership = { ...editingPartnership, ...partnershipData };
                setPartnerships(prev => prev.map(p => p.id === editingPartnership.id ? updatedPartnership : p));
                addHistoryEntry(editingPartnership.id, 'Dados da parceria atualizados.');
                recordAuditLog('Edição', 'Parceria', `Parceria atualizada: ${updatedPartnership.reference}`, `Título: "${updatedPartnership.title}" | Status: ${updatedPartnership.status}`, updatedPartnership.id);

                // Send emails if changed
                if (newResearcher && newResearcher.id !== prevResearcher.id) {
                     addNotification(NotificationService.generateNewPartnershipEmail(newResearcher, updatedPartnership, 'Pesquisador(a) Responsável'));
                }
                if (newBusiness && newBusiness.id !== prevBusiness.id && newBusiness.id !== newResearcher?.id) {
                     addNotification(NotificationService.generateNewPartnershipEmail(newBusiness, updatedPartnership, 'Contato de Negócios e Parcerias'));
                }

            } else {
                let folderWebUrl: string | undefined;
                let folderId: string | undefined;
                let folderStatusStr = 'criada';

                if (isMicrosoftSignedIn && msalInstance) {
                    const folderName = cleanReference;
                    
                    const folderInfo = await MicrosoftApi.getOrCreatePartnershipFolder(msalInstance, folderName);
                    
                    folderWebUrl = folderInfo.webUrl;
                    folderId = folderInfo.id;
                    
                    if (folderInfo._isExisting) {
                         folderStatusStr = 'vinculada (já existente)';
                    }
                } else {
                    alert('Aviso: Conecte-se à Microsoft para criar uma pasta para esta parceria na nuvem.');
                }
    
                const newPartnership: Partnership = {
                    ...partnershipData,
                    id: `p-${uuidv4()}`,
                    history: [{ id: uuidv4(), date: new Date().toISOString(), description: 'Parceria criada.', user: currentUser!.email }],
                    documents: [], linkedInstrumentIds: [], folderWebUrl, folderId,
                };
    
                setPartnerships(prev => [newPartnership, ...prev]);
                recordAuditLog('Criação', 'Parceria', `Nova parceria cadastrada: ${newPartnership.reference}`, `Título: "${newPartnership.title}" | Financiador: ${newPartnership.funder || 'N/A'} | Status: ${newPartnership.status}`, newPartnership.id);

                if (folderWebUrl) addHistoryEntry(newPartnership.id, `Pasta do projeto ${folderStatusStr} na nuvem.`);
                
                // Notify Researcher
                if (newPartnership.ctvResearcher) {
                    addNotification(NotificationService.generateNewPartnershipEmail(newPartnership.ctvResearcher, newPartnership, 'Pesquisador(a) Responsável'));
                }
                
                // Notify Business Partner (prevent duplicate if same user)
                if (newPartnership.ctvBusinessPartner && newPartnership.ctvBusinessPartner.id !== newPartnership.ctvResearcher?.id) {
                    addNotification(NotificationService.generateNewPartnershipEmail(newPartnership.ctvBusinessPartner, newPartnership, 'Contato de Negócios e Parcerias'));
                }

                setSelectedPartnership(newPartnership);
                setActiveView(View.Partnerships);
            }
        } catch (error) {
            console.error('Failed to save partnership:', error);
            alert('Falha ao salvar parceria.');
        } finally {
            setIsSubmitting(false);
            setIsPartnershipModalOpen(false);
            setEditingPartnership(null);
        }
    };
    
    const handleDeletePartnership = (partnershipId: string) => {
        if (legalInstruments.some(li => li.linkedPartnershipIds.includes(partnershipId)) || tasks.some(t => t.partnershipId === partnershipId)) {
            alert('Não é possível excluir esta parceria, pois ela possui instrumentos jurídicos ou tarefas vinculadas.');
            return;
        }
        const targetP = partnerships.find(p => p.id === partnershipId);
        if (window.confirm('Tem certeza de que deseja excluir esta parceria? Esta ação é irreversível.')) {
            setPartnerships(prev => prev.filter(p => p.id !== partnershipId));
            recordAuditLog('Exclusão', 'Parceria', `Parceria excluída: ${targetP?.reference || partnershipId}`, `Título: "${targetP?.title || 'N/A'}"`, partnershipId);
        }
    };

    const handlePartnershipStatusChange = (partnershipId: string, newStatus: PartnershipStatus) => {
        setPartnerships(prev => prev.map(p => {
            if (p.id === partnershipId) {
                const updatedPartnership = { ...p, status: newStatus };
                addHistoryEntry(p.id, `Status da parceria alterado para "${newStatus}".`);
                recordAuditLog('Edição', 'Parceria', `Status da parceria ${p.reference} alterado`, `Novo status: "${newStatus}"`, p.id);
                if (newStatus === PartnershipStatus.Finished || newStatus === PartnershipStatus.Rejected) {
                    [updatedPartnership.ctvResearcher, updatedPartnership.ctvBusinessPartner]
                        .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i) // Unique recipients
                        .forEach(recipient => addNotification(NotificationService.generateStatusChangeEmail(recipient, updatedPartnership)));
                }
                return updatedPartnership;
            }
            return p;
        }));
    };


    const handleOpenTaskModal = (task: Task | null = null, preSelectedPartnershipId?: string) => {
        setEditingTask(task);
        if (preSelectedPartnershipId) {
            const p = partnerships.find(p => p.id === preSelectedPartnershipId);
            setPreSelectedPartnershipForTask(p || null);
        } else {
            setPreSelectedPartnershipForTask(null);
        }
        setIsNewTaskModalOpen(true);
    };

    const handleSaveTask = (taskData: Omit<Task, 'id' | 'completed' | 'createdBy' | 'creationDate'>) => {
        if (editingTask) {
            // Check for new assignees to notify
            const newAssignees = taskData.assignedTo.filter(u => !editingTask.assignedTo.some(existing => existing.id === u.id));
            const partnership = partnerships.find(p => p.id === taskData.partnershipId);
            
            // Notify new assignees
            if (partnership) {
                newAssignees.forEach(user => addNotification(NotificationService.generateNewTaskEmail(user, { ...editingTask, ...taskData }, partnership, currentUser!)));
            }

            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
            addHistoryEntry(editingTask.partnershipId, `Tarefa atualizada: "${taskData.title}"`);
            recordAuditLog('Edição', 'Tarefa', `Tarefa atualizada: "${taskData.title}"`, `Prazo: ${taskData.dueDate} | Atribuída a ${taskData.assignedTo.map(u => u.name).join(', ')}`, editingTask.id);
        } else {
            const newTask: Task = { ...taskData, id: `t-${uuidv4()}`, completed: false, createdBy: currentUser!.email, creationDate: new Date().toISOString() };
            setTasks(prev => [newTask, ...prev]);
            addHistoryEntry(newTask.partnershipId, `Tarefa criada: "${newTask.title}"`);
            recordAuditLog('Criação', 'Tarefa', `Nova tarefa criada: "${newTask.title}"`, `Prazo: ${newTask.dueDate} | Responsáveis: ${newTask.assignedTo.map(u => u.name).join(', ')}`, newTask.id);
            const partnership = partnerships.find(p => p.id === taskData.partnershipId);
            newTask.assignedTo.forEach(user => addNotification(NotificationService.generateNewTaskEmail(user, newTask, partnership!, currentUser!)));
        }
        setIsNewTaskModalOpen(false);
        setEditingTask(null);
        setPreSelectedPartnershipForTask(null);
    };

    const handleCompleteTask = (taskId: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id === taskId) {
                const completedTask = { ...task, completed: true, completedBy: currentUser!.email, completionDate: new Date().toISOString() };
                addHistoryEntry(completedTask.partnershipId, `Tarefa concluída: "${completedTask.title}"`);
                recordAuditLog('Edição', 'Tarefa', `Tarefa marcada como concluída: "${completedTask.title}"`, `Concluída por ${currentUser?.name || currentUser?.email}`, task.id);
                return completedTask;
            }
            return task;
        }));
    };

    const handleDeleteTask = (taskId: string) => {
        const targetTask = tasks.find(t => t.id === taskId);
        if (window.confirm('Tem certeza de que deseja excluir esta tarefa?')) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            recordAuditLog('Exclusão', 'Tarefa', `Tarefa excluída: "${targetTask?.title || taskId}"`, `Removida da parceria`, taskId);
        }
    };
    
    const handleToggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };
    
    // Handler for clicking a task in the Dashboard
    const handleDashboardTaskClick = (taskId: string) => {
        setHighlightedTaskId(taskId);
        setActiveView(View.Tasks);
    };
    
    // Handler for clicking a task in the Partnership Detail View (redirect to task view)
    const handlePartnershipDetailTaskClick = (taskId: string) => {
         setHighlightedTaskId(taskId);
         setActiveView(View.Tasks);
         setSelectedPartnership(null); // Go to Task View
    }

    const handleOpenUserModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = (userData: Omit<User, 'id'>) => {
        if (editingUser) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
            recordAuditLog('Edição', 'Usuário', `Usuário atualizado: ${userData.name}`, `Email: ${userData.email} | Função: ${userData.role}`, editingUser.id);
        } else {
            const newUser: User = { ...userData, id: `user-${uuidv4()}` };
            setUsers(prev => [newUser, ...prev]);
            addNotification(NotificationService.generateNewUserEmail(newUser));
            recordAuditLog('Criação', 'Usuário', `Novo usuário cadastrado: ${userData.name}`, `Email: ${userData.email} | Função: ${userData.role}`, newUser.id);
        }
        setIsUserModalOpen(false);
        setEditingUser(null);
    };

    const handleDeleteUser = (userId: string) => {
        if (partnerships.some(p => [p.ctvCoordinator.id, p.ctvResearcher.id, p.ctvBusinessPartner.id].includes(userId)) || tasks.some(t => t.assignedTo.some(u => u.id === userId))) {
            alert('Este usuário não pode ser excluído, pois está vinculado a parcerias ou tarefas.');
            return;
        }
        const targetUser = users.find(u => u.id === userId);
        if (window.confirm('Tem certeza de que deseja excluir este usuário?')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            recordAuditLog('Exclusão', 'Usuário', `Usuário excluído: ${targetUser?.name || userId}`, `Email: ${targetUser?.email || 'N/A'}`, userId);
        }
    };

    const handleSaveInternalProject = (name: string) => {
        const newProject: InternalProject = { id: uuidv4(), name: name.trim() };
        setInternalProjects(prev => [...prev, newProject]);
        recordAuditLog('Criação', 'Projeto Interno', `Projeto Interno cadastrado: ${name.trim()}`, `Cadastrado em configurações`, newProject.id);
    };

    const handleUpdateInternalProject = (id: string, newName: string) => {
        setInternalProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
        recordAuditLog('Edição', 'Projeto Interno', `Projeto Interno renomeado: ${newName.trim()}`, `ID: ${id}`, id);
    };

    const handleDeleteInternalProject = (projectId: string) => {
        const targetProject = internalProjects.find(p => p.id === projectId);
        if (window.confirm('Tem certeza de que deseja excluir este projeto interno?')) {
            setInternalProjects(prev => prev.filter(p => p.id !== projectId));
            recordAuditLog('Exclusão', 'Projeto Interno', `Projeto Interno excluído: ${targetProject?.name || projectId}`, `Removido do sistema`, projectId);
        }
    };
    
    const handleUpdateSettings = (newSettings: SystemSettings) => {
        setSystemSettings(newSettings);
        recordAuditLog('Configuração', 'Sistema', 'Configurações do sistema atualizadas', `E-mail remetente: ${newSettings.senderEmail} | Bolsas: ${newSettings.bolsas?.length || 0}`);
        alert('Configurações salvas com sucesso!');
    };

    const handleSaveMaintenanceSettings = (enabled: boolean, message: string) => {
        const now = new Date().toISOString();
        const updatedSettings: SystemSettings = {
            ...systemSettings,
            maintenanceMode: {
                enabled,
                message,
                enabledAt: enabled ? (systemSettings.maintenanceMode?.enabled ? systemSettings.maintenanceMode.enabledAt : now) : undefined,
                enabledBy: enabled ? (currentUser?.name ? `${currentUser.name} (${currentUser.email})` : currentUser?.email || 'Administrador Master') : undefined,
            },
        };
        setSystemSettings(updatedSettings);
        recordAuditLog('Manutenção', 'Sistema', `Modo Manutenção ${enabled ? 'ATIVADO' : 'DESATIVADO'}`, `Mensagem: "${message || 'Padrão'}"`);
        if (enabled) {
            alert('Modo de manutenção ATIVADO. O acesso ao sistema está agora restrito apenas a usuários Administrador Master.');
        } else {
            alert('Modo de manutenção DESATIVADO. O acesso normal ao sistema foi restabelecido para todos os usuários.');
        }
    };

    const handleImportPartnerships = (fileContent: string) => {

        try {
            const parsed = parsePartnerships(fileContent, users);
            const existingRefs = new Set(partnerships.map(p => p.reference));
            const newPartnerships = parsed.filter(p => !existingRefs.has(p.reference)).map(p => ({ ...p, history: [{ id: uuidv4(), date: new Date().toISOString(), description: 'Parceria importada via CSV.', user: currentUser!.email }], documents: [], linkedInstrumentIds: [], folderWebUrl: undefined, folderId: undefined }));
            setPartnerships(prev => [...prev, ...newPartnerships]);
            recordAuditLog('Importação', 'Parceria', `${newPartnerships.length} parcerias importadas via CSV`, `Total no arquivo: ${parsed.length}`);
            alert(`${newPartnerships.length} de ${parsed.length} novas parcerias foram importadas com sucesso!`);
        } catch (error: any) {
            alert(`Erro ao importar parcerias: ${error.message}`);
        }
    };
    
    const handleImportLegalInstruments = (fileContent: string) => {
        try {
            const parsed = parseLegalInstruments(fileContent, partnerships);
            if (parsed.length > 0) {
                 const newInstruments: LegalInstrument[] = parsed.map(inst => ({ ...inst, addendums: [] }));
                 setLegalInstruments(prev => [...prev, ...newInstruments].sort((a,b) => b.id - a.id));
                 newInstruments.forEach(inst => {
                    inst.linkedPartnershipIds.forEach(pId => addHistoryEntry(pId, `Instrumento Jurídico importado: Nº ${inst.id} (${inst.type})`));
                    setPartnerships(prev => prev.map(p => inst.linkedPartnershipIds.includes(p.id) ? { ...p, linkedInstrumentIds: [...new Set([...p.linkedInstrumentIds, inst.id])] } : p));
                });
                recordAuditLog('Importação', 'Instrumento Jurídico', `${parsed.length} instrumentos importados via CSV`, `Instrumentos vinculados com sucesso`);
            }
            alert(`${parsed.length} novos instrumentos jurídicos foram importados com sucesso!`);
        } catch (error: any) {
            alert(`Erro ao importar instrumentos: ${error.message}`);
        }
    };

    const handleImportUsers = (fileContent: string) => {
        try {
            const parsed = parseUsers(fileContent);
            const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
            const newUsers = parsed.filter(u => !existingEmails.has(u.email.toLowerCase())).map(u => ({ ...u, id: `user-${uuidv4()}` }));
            setUsers(prev => [...prev, ...newUsers]);
            recordAuditLog('Importação', 'Usuário', `${newUsers.length} usuários importados via CSV`, `Total no arquivo: ${parsed.length}`);
            alert(`${newUsers.length} de ${parsed.length} novos usuários foram importados com sucesso!`);
        } catch (error: any) {
            alert(`Erro ao importar usuários: ${error.message}`);
        }
    };

    const handleApplyImportedJsonData = async (importedData: Partial<AppState>, mode: 'replace' | 'merge') => {
        let nextPartnerships = [...partnerships];
        let nextInstruments = [...legalInstruments];
        let nextTasks = [...tasks];
        let nextUsers = [...users];
        let nextInternalProjects = [...internalProjects];
        let nextStudies = [...studies];
        let nextEssays = [...essays];
        let nextProposals = [...proposals];
        let nextSettings = { ...systemSettings };
        let nextAuditLogs = [...systemAuditLogs];

        if (mode === 'replace') {
            if (importedData.partnerships) nextPartnerships = importedData.partnerships;
            if (importedData.legalInstruments) nextInstruments = importedData.legalInstruments;
            if (importedData.tasks) nextTasks = importedData.tasks;
            if (importedData.users) {
                const filtered = importedData.users.filter(u => u.email.toLowerCase() !== 'priscilapassos@ctvacinas.org');
                nextUsers = [
                    {
                        id: 'user-priscila-master',
                        name: 'Priscila Passos',
                        email: 'priscilapassos@ctvacinas.org',
                        role: 'Administrador Master',
                        platform: 'Microsoft'
                    },
                    ...filtered
                ];
            }
            if (importedData.internalProjects) nextInternalProjects = importedData.internalProjects;
            if (importedData.studies) nextStudies = importedData.studies;
            if (importedData.essays) nextEssays = importedData.essays;
            if (importedData.proposals) nextProposals = importedData.proposals;
            if (importedData.systemSettings) nextSettings = { ...systemSettings, ...importedData.systemSettings };
            if (importedData.systemAuditLogs) nextAuditLogs = importedData.systemAuditLogs;
        } else {
            // Modo merge (mesclar)
            if (importedData.partnerships) {
                const map = new Map(nextPartnerships.map(p => [p.reference.toLowerCase(), p]));
                importedData.partnerships.forEach(p => map.set(p.reference.toLowerCase(), p));
                nextPartnerships = Array.from(map.values());
            }
            if (importedData.legalInstruments) {
                const map = new Map(nextInstruments.map(i => [i.id, i]));
                importedData.legalInstruments.forEach(i => map.set(i.id, i));
                nextInstruments = Array.from(map.values()).sort((a, b) => b.id - a.id);
            }
            if (importedData.tasks) {
                const map = new Map(nextTasks.map(t => [t.id, t]));
                importedData.tasks.forEach(t => map.set(t.id, t));
                nextTasks = Array.from(map.values());
            }
            if (importedData.users) {
                const map = new Map(nextUsers.map(u => [u.email.toLowerCase(), u]));
                importedData.users.forEach(u => map.set(u.email.toLowerCase(), u));
                nextUsers = Array.from(map.values());
            }
            if (importedData.internalProjects) {
                const map = new Map(nextInternalProjects.map(proj => [proj.name.toLowerCase(), proj]));
                importedData.internalProjects.forEach(proj => map.set(proj.name.toLowerCase(), proj));
                nextInternalProjects = Array.from(map.values());
            }
            if (importedData.proposals) {
                const map = new Map(nextProposals.map(prop => [prop.id, prop]));
                importedData.proposals.forEach(prop => map.set(prop.id, prop));
                nextProposals = Array.from(map.values());
            }
            if (importedData.studies) {
                const map = new Map(nextStudies.map(s => [s.id, s]));
                importedData.studies.forEach(s => map.set(s.id, s));
                nextStudies = Array.from(map.values());
            }
            if (importedData.essays) {
                const map = new Map(nextEssays.map(e => [e.id, e]));
                importedData.essays.forEach(e => map.set(e.id, e));
                nextEssays = Array.from(map.values());
            }
            if (importedData.systemSettings) {
                nextSettings = { ...systemSettings, ...importedData.systemSettings };
            }
        }

        setPartnerships(nextPartnerships);
        setLegalInstruments(nextInstruments);
        setTasks(nextTasks);
        setUsers(nextUsers);
        setInternalProjects(nextInternalProjects);
        setStudies(nextStudies);
        setEssays(nextEssays);
        setProposals(nextProposals);
        setSystemSettings(nextSettings);
        setSystemAuditLogs(nextAuditLogs);

        const newAppState: AppState = {
            users: nextUsers,
            partnerships: nextPartnerships,
            legalInstruments: nextInstruments,
            tasks: nextTasks,
            sentExpirationWarnings,
            systemSettings: nextSettings,
            readHistoryIds,
            internalProjects: nextInternalProjects,
            studies: nextStudies,
            essays: nextEssays,
            proposals: nextProposals,
            systemAuditLogs: nextAuditLogs
        };

        recordAuditLog('Importação', 'Sistema', `Importação completa via arquivo .JSON (${mode === 'replace' ? 'Substituição total' : 'Mesclagem'})`, `Dados aplicados e sincronizados com Supabase.`);

        // Salvar imediatamente no Supabase
        await saveAllMetadataToSupabase(newAppState);

        // Se autenticado com a Microsoft, sincronizar backup no SharePoint como DatabaseSpabase.json
        if (isMicrosoftSignedIn && msalInstance) {
            try {
                await MicrosoftApi.uploadDatabase(msalInstance, newAppState);
            } catch (err) {
                console.error("Erro ao sincronizar backup no SharePoint após importação JSON:", err);
            }
        }
    };


    const toCSV = (data: any[], headers: string[], separator = ';') => {
        const headerRow = headers.join(separator);
        const rows = data.map(row => headers.map(fieldName => {
            let val = row[fieldName] || '';
            if (val === undefined || val === null) val = '';
            // Basic handling of arrays/objects for CSV view
            if (typeof val === 'object') val = JSON.stringify(val);
            // Escape quotes and wrap in quotes
            const stringVal = String(val).replace(/"/g, '""'); 
            return `"${stringVal}"`; 
        }).join(separator));
        return [headerRow, ...rows].join('\n');
    };

    const handleCloudBackup = async () => {
        if (!isMicrosoftSignedIn || !msalInstance) {
             alert('É necessário estar conectado à Microsoft para realizar o backup na nuvem.');
             return;
        }

        setIsBackingUp(true);
        const dateStr = new Date().toISOString().split('T')[0];
        
        try {
             // 1. Partnerships CSV
             const partnershipHeaders = ['reference', 'title', 'status', 'projectType', 'funder', 'folderWebUrl', 'entryDate', 'approvedValue'];
             // Flatten/Enhance data for export
             const flatPartnerships = partnerships.map(p => ({
                 ...p,
                 folderWebUrl: p.folderWebUrl || ''
             }));
             const partnershipsCSV = toCSV(flatPartnerships, partnershipHeaders);

             // 2. Legal Instruments CSV
             const instrumentHeaders = ['id', 'type', 'object', 'signatureDate', 'expirationDate', 'folderWebUrl'];
             const flatInstruments = legalInstruments.map(i => ({
                 ...i,
                 folderWebUrl: i.folderWebUrl || ''
             }));
             const instrumentsCSV = toCSV(flatInstruments, instrumentHeaders);

             // 3. Users CSV
             const userHeaders = ['name', 'email', 'role'];
             const usersCSV = toCSV(users, userHeaders);

             // 4. Tasks CSV
             const taskHeaders = ['title', 'description', 'dueDate', 'completed'];
             const tasksCSV = toCSV(tasks, taskHeaders);

             await MicrosoftApi.uploadBackupFiles(msalInstance, [
                 { name: `backup_parcerias_${dateStr}.csv`, content: partnershipsCSV },
                 { name: `backup_instrumentos_${dateStr}.csv`, content: instrumentsCSV },
                 { name: `backup_usuarios_${dateStr}.csv`, content: usersCSV },
                 { name: `backup_tarefas_${dateStr}.csv`, content: tasksCSV },
             ]);

             recordAuditLog('Backup', 'Sistema', 'Backup CSV na nuvem realizado', 'Arquivos de parcerias, instrumentos, tarefas e usuários salvos no SharePoint.');
             alert('Backup CSV realizado com sucesso na pasta do sistema no SharePoint!');
        } catch (error) {
             console.error("Backup failed:", error);
             alert("Falha ao realizar o backup. Verifique o console.");
        } finally {
            setIsBackingUp(false);
        }
    };

    
    const handleToggleNotifications = () => {
        setIsNotificationsOpen(prev => !prev);
        if (!isNotificationsOpen) setNotifications(prev => prev.map(n => ({...n, read: true})));
    };
    
    const handleNotificationLinkClick = (link: Notification['link']) => {
        if (!link) return;
        const partnership = partnerships.find(p => p.id === link.partnershipId);
        if (partnership) {
            setSelectedPartnership(partnership);
            setActiveView(View.Partnerships);
            if (link.instrumentId) {
                setSelectedLegalInstrument(legalInstruments.find(i => i.id === link.instrumentId) || null);
            }
        }
        setIsNotificationsOpen(false);
    };
    
    // Handler for navigation from task view (clicking Partnership reference)
    const handleNavigateToPartnership = (partnership: Partnership) => {
        setSelectedPartnership(partnership);
        setActiveView(View.Partnerships);
    };

    const renderContent = () => {
        if (selectedPartnership) {
            return <PartnershipDetailView
                partnership={selectedPartnership}
                legalInstruments={legalInstruments.filter(li => li.linkedPartnershipIds.includes(selectedPartnership.id))}
                tasks={tasks.filter(t => t.partnershipId === selectedPartnership.id)}
                users={users}
                currentUser={currentUser!}
                onBack={() => setSelectedPartnership(null)}
                addHistoryEntry={addHistoryEntry}
                onAddDocument={addDocumentToPartnership}
                onSelectLegalInstrument={setSelectedLegalInstrument}
                onStatusChange={handlePartnershipStatusChange}
                isMicrosoftSignedIn={isMicrosoftSignedIn}
                onEdit={handleOpenPartnershipModal}
                onDelete={handleDeletePartnership}
                onDeleteTask={handleDeleteTask}
                onDeleteLegalInstrument={handleDeleteLegalInstrument}
                onAddNewInstrument={() => {
                    setPreSelectedPartnershipForInstrument(selectedPartnership);
                    setEditingLegalInstrument(null);
                    setIsNewLegalInstrumentModalOpen(true);
                }}
                onAddNewTask={() => {
                    handleOpenTaskModal(null, selectedPartnership.id);
                }}
                onTaskClick={handlePartnershipDetailTaskClick}
                internalProjects={internalProjects}
                proposals={proposals}
                onNavigateToProposalsView={() => {
                    setSelectedPartnership(null);
                    setActiveView(View.Proposals);
                }}
            />;
        }

        switch (activeView) {
            case View.Dashboard: 
                return <Dashboard 
                            partnerships={partnerships} 
                            legalInstruments={legalInstruments} 
                            tasks={tasks} 
                            setActiveView={setActiveView} 
                            currentUser={currentUser!}
                            readHistoryIds={readHistoryIds}
                            onMarkHistoryRead={handleMarkHistoryRead}
                            onTaskClick={handleDashboardTaskClick}
                        />;
            case View.Partnerships: return <PartnershipView partnerships={partnerships} onSelectPartnership={setSelectedPartnership} onNewPartnership={() => handleOpenPartnershipModal(null)} currentUser={currentUser!} internalProjects={internalProjects} />;
            case View.LegalInstruments: 
                return <LegalInstrumentView 
                    legalInstruments={legalInstruments} 
                    partnerships={partnerships} 
                    onNewInstrument={() => { setEditingLegalInstrument(null); setIsNewLegalInstrumentModalOpen(true); }} 
                    onSelectInstrument={setSelectedLegalInstrument} 
                    onDeleteInstrument={handleDeleteLegalInstrument}
                    onEditInstrument={handleOpenInstrumentModal}
                    currentUser={currentUser!}
                />;
            case View.Tasks: 
                return <TaskView 
                    tasks={tasks} 
                    partnerships={partnerships} 
                    users={users} 
                    onNewTask={() => handleOpenTaskModal(null)} 
                    onCompleteTask={handleCompleteTask} 
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleOpenTaskModal}
                    highlightedTaskId={highlightedTaskId}
                    onSelectPartnership={handleNavigateToPartnership}
                    currentUser={currentUser!}
                />;
            case View.InternalProjects:
                return <InternalProjectView
                    internalProjects={internalProjects}
                    partnerships={partnerships}
                    legalInstruments={legalInstruments}
                    onSelectPartnership={handleNavigateToPartnership}
                />;
            case View.Proposals:
                return <ProposalsView
                    proposals={proposals}
                    setProposals={setProposals}
                    partnerships={partnerships}
                    essays={essays}
                    studies={studies}
                    currentUser={currentUser!}
                    addHistoryEntry={addHistoryEntry}
                />;
            case View.Pricing:
                return <PricingView 
                    studies={studies} 
                    setStudies={setStudies} 
                    essays={essays}
                    setEssays={setEssays}
                    users={users} 
                    systemSettings={systemSettings} 
                    currentUser={currentUser!}
                    isMicrosoftSignedIn={isMicrosoftSignedIn}
                    msalInstance={msalInstance}
                    proposals={proposals}
                    setProposals={setProposals}
                    partnerships={partnerships}
                    addHistoryEntry={addHistoryEntry}
                    onNavigateToProposals={() => setActiveView(View.Proposals)}
                />;
            case View.Settings: return <SettingsView 
                currentUser={currentUser!} 
                users={users} 
                onNewUser={() => handleOpenUserModal(null)} 
                onEditUser={handleOpenUserModal} 
                onDeleteUser={handleDeleteUser} 
                onImportPartnerships={handleImportPartnerships} 
                onImportLegalInstruments={handleImportLegalInstruments} 
                onImportUsers={handleImportUsers} 
                systemSettings={systemSettings} 
                onUpdateSettings={handleUpdateSettings} 
                onCloudBackup={handleCloudBackup} 
                isBackingUp={isBackingUp} 
                internalProjects={internalProjects} 
                onSaveInternalProject={handleSaveInternalProject} 
                onUpdateInternalProject={handleUpdateInternalProject} 
                onDeleteInternalProject={handleDeleteInternalProject} 
                onOpenMaintenanceModal={() => setIsMaintenanceModalOpen(true)} 
                onOpenJsonImportModal={() => setIsJsonImportModalOpen(true)}
                auditLogs={systemAuditLogs}
                onClearAuditLogs={handleClearAuditLogs}
            />;


            default: 
                return <Dashboard 
                            partnerships={partnerships} 
                            legalInstruments={legalInstruments} 
                            tasks={tasks} 
                            setActiveView={setActiveView} 
                            currentUser={currentUser!}
                            readHistoryIds={readHistoryIds}
                            onMarkHistoryRead={handleMarkHistoryRead}
                            onTaskClick={handleDashboardTaskClick}
                        />;
        }
    };

    const MicrosoftLoginView = ({ onSignIn }: { onSignIn: () => void }) => (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md z-10">
                <div className="text-center">
                    <CTVLogoIcon className="w-48 h-auto mx-auto mb-6" />
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                        Gestor de Parcerias
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Faça login com sua conta Microsoft para acessar o sistema.
                    </p>
                </div>
                <button
                    onClick={onSignIn}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    Entrar com a Microsoft
                </button>
            </div>
            <div className="absolute bottom-2 text-gray-300 text-xs text-center w-full z-0">
                Desenvolvido por Priscila Passos e Bruna Dias
            </div>
        </div>
    );
    
    if (microsoftAuthState === 'pending') {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <p className="text-lg text-gray-600">Conectando à nuvem...</p>
            </div>
        );
    }

    if (!isMicrosoftSignedIn) {
        return <MicrosoftLoginView onSignIn={handleInteractiveSignIn} />;
    }

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <h3 className="text-lg font-bold text-gray-800">Verificando autorização...</h3>
                    <p className="text-sm text-gray-500">
                        Validando credenciais da conta Microsoft junto à base de usuários autorizados do CTVacinas.
                    </p>
                    <div className="pt-4 border-t">
                        <button
                            onClick={handleLogout}
                            className="text-xs text-gray-500 hover:text-red-600 hover:underline transition-colors"
                        >
                            Sair / Trocar de conta Microsoft
                        </button>
                    </div>
                </div>
            </div>
        );
    }



    // Intercept with Maintenance View if maintenance is active and user is NOT Administrador Master
    if (systemSettings.maintenanceMode?.enabled && currentUser.role !== 'Administrador Master') {
        return (
            <MaintenanceView
                currentUser={currentUser}
                maintenanceConfig={systemSettings.maintenanceMode}
                onLogout={handleLogout}
                onRetry={() => window.location.reload()}
            />
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar 
                activeView={activeView} 
                setActiveView={(view) => { setActiveView(view); setSelectedPartnership(null); }} 
                onNewPartnership={() => handleOpenPartnershipModal(null)} 
                currentUser={currentUser} 
                isCollapsed={!isSidebarOpen}
            />
            <div className="flex flex-col flex-1 w-full">
                <Header 
                    currentUser={currentUser} 
                    onLogout={handleLogout} 
                    notifications={notifications} 
                    onToggleNotifications={handleToggleNotifications} 
                    microsoftAuthState={microsoftAuthState} 
                    onInteractiveSignIn={handleInteractiveSignIn} 
                    syncStatus={syncStatus} 
                    lastSyncTime={lastSyncTime}
                    onToggleSidebar={handleToggleSidebar}
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                    isMaintenanceActive={!!systemSettings.maintenanceMode?.enabled}
                    onOpenMaintenanceModal={() => setIsMaintenanceModalOpen(true)}
                />

                {/* Banner de Sincronização Supabase & Backup Diário SharePoint */}
                <SupabaseMigrationBanner
                    onOpenMigrationModal={() => setIsSupabaseModalOpen(true)}
                    syncStatus={syncStatus}
                    lastSyncTime={lastSyncTime}
                    isSharePointDailyBackedUp={isSharePointDailyBackedUp}
                    onForceSharePointBackup={handleForceSharePointBackup}
                    isBackingUpSharePoint={isBackingUpSharePoint}
                    isMicrosoftSignedIn={isMicrosoftSignedIn}
                />

                {/* Master Admin notification banner when maintenance is enabled */}
                {systemSettings.maintenanceMode?.enabled && currentUser.role === 'Administrador Master' && (
                    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between shadow-md z-20 border-b border-amber-600 gap-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-base">⚠️</span>
                            <span>
                                <strong>MODO DE MANUTENÇÃO ATIVO:</strong> O acesso ao sistema está desabilitado para os demais usuários.
                                {systemSettings.maintenanceMode.message && (
                                    <span className="font-normal italic ml-1">&quot;{systemSettings.maintenanceMode.message}&quot;</span>
                                )}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsMaintenanceModalOpen(true)}
                            className="px-3 py-1 bg-slate-950 text-white text-xs font-bold rounded hover:bg-black transition-colors shadow-xs"
                        >
                            Gerenciar / Reativar Acesso
                        </button>
                    </div>
                )}

                <main className="h-full overflow-y-auto relative flex flex-col">
                    <div className="w-full px-6 mx-auto my-6 flex-grow overflow-x-hidden">
                        {renderContent()}
                    </div>
                    {/* Footer Credit */}
                    <div className="py-2 text-center mt-auto">
                         <span className="text-gray-300 text-xs">Desenvolvido por Priscila Passos e Bruna Dias</span>
                    </div>

                     <NotificationsPanel isOpen={isNotificationsOpen} notifications={notifications} onClose={() => setIsNotificationsOpen(false)} onLinkClick={handleNotificationLinkClick} />
                </main>
            </div>
            <NewPartnershipModal isOpen={isPartnershipModalOpen} onClose={() => { setIsPartnershipModalOpen(false); setEditingPartnership(null); }} onSubmit={handlePartnershipSubmit} users={users} isSubmitting={isSubmitting} isMicrosoftSignedIn={isMicrosoftSignedIn} partnershipToEdit={editingPartnership} internalProjects={internalProjects} />
            
            <NewLegalInstrumentModal 
                isOpen={isNewLegalInstrumentModalOpen} 
                onClose={() => { setIsNewLegalInstrumentModalOpen(false); setEditingLegalInstrument(null); setPreSelectedPartnershipForInstrument(null); }} 
                onSubmit={handleSaveLegalInstrument} 
                partnerships={partnerships} 
                isSubmitting={isSubmitting} 
                preSelectedPartnership={preSelectedPartnershipForInstrument}
                instrumentToEdit={editingLegalInstrument}
            />
            
            <LegalInstrumentDetailModal 
                isOpen={!!selectedLegalInstrument} 
                onClose={() => setSelectedLegalInstrument(null)} 
                instrument={selectedLegalInstrument} 
                partnerships={partnerships}
                onAddAddendum={handleAddAddendum} 
                onUpdateAddendum={handleUpdateAddendum}
                onDeleteAddendum={handleDeleteAddendum}
                currentUser={currentUser}
            />
            
            <NewTaskModal 
                isOpen={isNewTaskModalOpen} 
                onClose={() => { setIsNewTaskModalOpen(false); setEditingTask(null); setPreSelectedPartnershipForTask(null); }} 
                onSubmit={handleSaveTask} 
                partnerships={partnerships} 
                users={users} 
                taskToEdit={editingTask}
                preSelectedPartnership={preSelectedPartnershipForTask}
            />
            
            <UserManagementModal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }} onSubmit={handleSaveUser} userToEdit={editingUser} />
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
            <MaintenanceModal 
                isOpen={isMaintenanceModalOpen} 
                onClose={() => setIsMaintenanceModalOpen(false)} 
                currentConfig={systemSettings.maintenanceMode} 
                onSave={handleSaveMaintenanceSettings} 
            />
            <SupabaseMigrationModal 
                isOpen={isSupabaseModalOpen} 
                onClose={() => setIsSupabaseModalOpen(false)} 
                appState={{
                    users,
                    partnerships,
                    legalInstruments,
                    tasks,
                    sentExpirationWarnings,
                    systemSettings,
                    readHistoryIds,
                    internalProjects,
                    studies,
                    essays,
                    proposals,
                    systemAuditLogs
                }}
                msalInstance={msalInstance}
                isMicrosoftSignedIn={isMicrosoftSignedIn}
                onOpenJsonImportModal={() => setIsJsonImportModalOpen(true)}
            />
            <JsonImportModal
                isOpen={isJsonImportModalOpen}
                onClose={() => setIsJsonImportModalOpen(false)}
                currentAppState={{
                    users,
                    partnerships,
                    legalInstruments,
                    tasks,
                    sentExpirationWarnings,
                    systemSettings,
                    readHistoryIds,
                    internalProjects,
                    studies,
                    essays,
                    proposals,
                    systemAuditLogs
                }}
                currentUser={currentUser!}
                onApplyImportedData={handleApplyImportedJsonData}
            />

        </div>
    );

};


export default App;
