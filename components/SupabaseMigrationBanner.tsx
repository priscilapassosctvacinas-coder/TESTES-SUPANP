import React, { useState } from 'react';
import { SyncStatus } from '../types';

interface SupabaseMigrationBannerProps {
    onOpenMigrationModal: () => void;
    syncStatus: SyncStatus;
    lastSyncTime: Date | null;
    isSharePointDailyBackedUp: boolean;
    onForceSharePointBackup: () => void;
    isBackingUpSharePoint: boolean;
    isMicrosoftSignedIn: boolean;
}

export const SupabaseMigrationBanner: React.FC<SupabaseMigrationBannerProps> = ({
    onOpenMigrationModal,
    syncStatus,
    lastSyncTime,
    isSharePointDailyBackedUp,
    onForceSharePointBackup,
    isBackingUpSharePoint,
    isMicrosoftSignedIn
}) => {
    const [isMinimized, setIsMinimized] = useState(false);

    if (isMinimized) {
        return (
            <div className="bg-amber-500 text-white px-4 py-1 flex items-center justify-between text-xs shadow-inner">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">⚠️ Manutenção:</span>
                    <span>Migração Supabase ativa (Backup diário SharePoint)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenMigrationModal}
                        className="underline font-semibold hover:text-amber-100"
                    >
                        Painel Supabase
                    </button>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="ml-2 hover:text-amber-200"
                        title="Expandir aviso"
                    >
                        ▼
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-base">🛠️</span>
                <div>
                    <span className="font-bold mr-1">Sistema em Manutenção / Migração de Metadados:</span>
                    <span>
                        Os metadados são carregados e salvos no <strong>Supabase</strong>. Pastas e arquivos continuam no <strong>SharePoint</strong>, com sincronização de backup diária automática no 1º acesso.
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {/* Status Supabase */}
                <div className="flex items-center gap-1.5 bg-white/80 border border-amber-300 px-2.5 py-1 rounded shadow-xs">
                    <span className={`w-2 h-2 rounded-full ${syncStatus === 'error' ? 'bg-red-500' : 'bg-teal-500 animate-pulse'}`}></span>
                    <span className="font-medium text-gray-700">
                        Supabase: {syncStatus === 'saving' ? 'Salvando...' : syncStatus === 'loading' ? 'Carregando...' : syncStatus === 'error' ? 'Erro' : 'Ativo'}
                    </span>
                </div>

                {/* Status SharePoint Backup Diário */}
                <div className="flex items-center gap-1.5 bg-white/80 border border-amber-300 px-2.5 py-1 rounded shadow-xs">
                    <span className={`w-2 h-2 rounded-full ${isSharePointDailyBackedUp ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-gray-700">
                        Backup SharePoint: <strong>{isSharePointDailyBackedUp ? 'Hoje OK' : 'Pendente'}</strong>
                    </span>
                </div>

                {/* Botão Forçar Backup SharePoint */}
                {isMicrosoftSignedIn && !isSharePointDailyBackedUp && (
                    <button
                        onClick={onForceSharePointBackup}
                        disabled={isBackingUpSharePoint}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors disabled:opacity-50"
                        title="Executar backup de segurança no SharePoint agora"
                    >
                        {isBackingUpSharePoint ? 'Salvando...' : 'Backup Diário Agora'}
                    </button>
                )}

                {/* Botão Abrir Painel */}
                <button
                    onClick={onOpenMigrationModal}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                >
                    <span>Configurar Supabase</span>
                </button>

                {/* Minimizar */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="text-amber-700 hover:text-amber-900 p-1 rounded"
                    title="Minimizar aviso"
                >
                    ▲
                </button>
            </div>
        </div>
    );
};
