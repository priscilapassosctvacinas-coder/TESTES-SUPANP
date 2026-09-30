import { SystemAuditLog, User, Partnership } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';

const AUDIT_LOGS_STORAGE_KEY = 'ctv_system_audit_logs';

/**
 * Carrega logs de auditoria do localStorage como fallback rápido
 */
export const loadAuditLogsFromLocalStorage = (): SystemAuditLog[] => {
    try {
        const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Erro ao carregar logs do localStorage:', e);
    }
    return [];
};

/**
 * Salva logs de auditoria no localStorage
 */
export const saveAuditLogsToLocalStorage = (logs: SystemAuditLog[]) => {
    try {
        localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 1000))); // Manter até 1000 mais recentes
    } catch (e) {
        console.warn('Erro ao salvar logs no localStorage:', e);
    }
};

/**
 * Cria uma nova entrada de log de auditoria
 */
export const createAuditEntry = (
    currentUser: User | null | undefined,
    action: SystemAuditLog['action'],
    entityType: SystemAuditLog['entityType'],
    title: string,
    details: string,
    entityId?: string
): SystemAuditLog => {
    return {
        id: `audit-${uuidv4()}`,
        timestamp: new Date().toISOString(),
        userEmail: currentUser?.email || 'sistema@ctvacinas.org',
        userName: currentUser?.name || 'Sistema Automatizado',
        userRole: currentUser?.role || 'Sistema',
        action,
        entityType,
        entityId,
        title,
        details
    };
};

/**
 * Converte o histórico pré-existente de parcerias em logs de auditoria se a lista estiver vazia
 */
export const seedAuditLogsFromExistingData = (partnerships: Partnership[]): SystemAuditLog[] => {
    const logs: SystemAuditLog[] = [];

    partnerships.forEach(p => {
        // Log de cadastro da parceria
        if (p.entryDate) {
            logs.push({
                id: `audit-seed-${p.id}-entry`,
                timestamp: new Date(p.entryDate + 'T12:00:00Z').toISOString(),
                userEmail: p.ctvCoordinator?.email || 'gestao@ctvacinas.org',
                userName: p.ctvCoordinator?.name || 'Coordenador CTV',
                userRole: 'Coordenador',
                action: 'Criação',
                entityType: 'Parceria',
                entityId: p.id,
                title: `Parceria cadastrada: ${p.reference}`,
                details: `Título: "${p.title}" | Financiador: ${p.funder || 'N/A'} | Status: ${p.status}`
            });
        }

        // Histórico de alterações da parceria
        if (Array.isArray(p.history)) {
            p.history.forEach((h, idx) => {
                let action: SystemAuditLog['action'] = 'Edição';
                const desc = h.description || '';
                if (desc.toLowerCase().includes('criada') || desc.toLowerCase().includes('cadastrada')) {
                    action = 'Criação';
                } else if (desc.toLowerCase().includes('importad')) {
                    action = 'Importação';
                } else if (desc.toLowerCase().includes('excluíd') || desc.toLowerCase().includes('remov')) {
                    action = 'Exclusão';
                }

                let entityType: SystemAuditLog['entityType'] = 'Parceria';
                if (desc.toLowerCase().includes('instrumento')) {
                    entityType = 'Instrumento Jurídico';
                } else if (desc.toLowerCase().includes('documento')) {
                    entityType = 'Parceria';
                }

                logs.push({
                    id: `audit-seed-${p.id}-${h.id || idx}`,
                    timestamp: h.date || new Date().toISOString(),
                    userEmail: h.user || 'usuario@ctvacinas.org',
                    userName: h.user ? h.user.split('@')[0] : 'Usuário',
                    userRole: 'Administrador',
                    action,
                    entityType,
                    entityId: p.id,
                    title: `Parceria ${p.reference}: Atualização de histórico`,
                    details: desc
                });
            });
        }
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
