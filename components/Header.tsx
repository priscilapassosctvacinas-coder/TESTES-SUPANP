
import React from 'react';
import { User, Notification, SyncStatus } from '../types';
import { BellIcon, UserCircleIcon, MailIcon, MenuIcon, QuestionMarkCircleIcon } from './Icons';

interface HeaderProps {
    currentUser: User;
    onLogout: () => void;
    notifications: Notification[];
    onToggleNotifications: () => void;
    microsoftAuthState: 'pending' | 'signedIn' | 'signedOut';
    onInteractiveSignIn: () => void;
    syncStatus: SyncStatus;
    lastSyncTime: Date | null;
    onToggleSidebar: () => void;
    onOpenHelp: () => void;
    isMaintenanceActive?: boolean;
    onOpenMaintenanceModal?: () => void;
}

const SyncStatusIndicator: React.FC<{ status: SyncStatus, time: Date | null }> = ({ status, time }) => {
    const spinner = <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>;

    switch (status) {
        case 'loading':
            return <div className="flex items-center space-x-2 text-sm text-gray-500">{spinner}<span>Sincronizando com Supabase...</span></div>;
        case 'saving':
            return <div className="flex items-center space-x-2 text-sm text-gray-500">{spinner}<span>Salvando no Supabase...</span></div>;
        case 'synced':
            const timeString = time ? ` às ${time.toLocaleTimeString()}` : '';
            return <p className="text-sm text-teal-700 font-medium">✓ Salvo no Supabase{timeString}</p>;
        case 'error':
            return <p className="text-sm text-amber-700 font-semibold">⚠️ Supabase: verificar tabelas</p>;
        case 'idle':
             if (time === null) { // Before first sync
                 return <p className="text-sm text-gray-500">Supabase pronto</p>;
             }
             return <p className="text-sm text-teal-700 font-medium">✓ Salvo no Supabase</p>;
        default:
            return null;
    }
};



export const Header: React.FC<HeaderProps> = ({ 
    currentUser, 
    onLogout, 
    notifications, 
    onToggleNotifications,
    microsoftAuthState,
    onInteractiveSignIn,
    syncStatus,
    lastSyncTime,
    onToggleSidebar,
    onOpenHelp,
    isMaintenanceActive,
    onOpenMaintenanceModal
}) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const isMasterAdmin = currentUser.role === 'Administrador Master';

    return (
        <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-30">
            <div className="flex items-center gap-4">
                 <button onClick={onToggleSidebar} className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-700">Gestor de Parcerias CTV</h1>
            </div>
            
            <div className="flex-grow flex items-center justify-center">
                {microsoftAuthState === 'pending' && <p className="text-sm text-gray-500">Conectando à nuvem...</p>}
                {microsoftAuthState === 'signedIn' && <SyncStatusIndicator status={syncStatus} time={lastSyncTime} />}
                {microsoftAuthState === 'signedOut' && (
                    <div className="flex items-center space-x-3">
                        <p className="text-sm text-yellow-700 font-semibold">Sincronização com a nuvem desativada.</p>
                        <button
                            onClick={onInteractiveSignIn}
                            className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700"
                        >
                            Conectar
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Master Admin Maintenance Button */}
                {isMasterAdmin && onOpenMaintenanceModal && (
                    <button
                        onClick={onOpenMaintenanceModal}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            isMaintenanceActive
                                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse ring-2 ring-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                        title={
                            isMaintenanceActive
                                ? 'Modo Manutenção ATIVO: Usuários bloqueados. Clique para gerenciar ou desativar.'
                                : 'Modo Manutenção: Clique para desabilitar o acesso aos demais usuários.'
                        }
                    >
                        {isMaintenanceActive ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                <span>Manutenção Ativa (Bloqueado)</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Desabilitar Acesso</span>
                            </>
                        )}
                    </button>
                )}

                 <button 
                    onClick={onOpenHelp}
                    className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-full transition-colors"
                    title="Ajuda e Documentação"
                >
                    <QuestionMarkCircleIcon className="w-6 h-6" />
                </button>

                 <button 
                    onClick={onLogout}
                    className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50"
                >
                    Logout
                </button>
                 <button 
                    onClick={onToggleNotifications}
                    className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    <MailIcon />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </button>
                <div className="flex items-center space-x-2">
                    <UserCircleIcon className={`w-8 h-8 ${isMasterAdmin ? 'text-amber-600' : 'text-teal-600'}`} />
                    <div className="text-right hidden md:block">
                        <div className="flex items-center justify-end gap-1.5">
                            <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
                            {isMasterAdmin && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                    Master
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">{currentUser.email}</p>
                    </div>
                </div>
            </div>
        </header>
    );
};
