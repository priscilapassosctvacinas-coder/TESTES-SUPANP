import React from 'react';
import { MaintenanceModeConfig, User } from '../types';
import { CTVLogoIcon } from './Icons';

interface MaintenanceViewProps {
    maintenanceConfig?: MaintenanceModeConfig;
    currentUser: User | null;
    onLogout: () => void;
    onRetry?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
    maintenanceConfig,
    currentUser,
    onLogout,
    onRetry
}) => {
    const formattedDate = maintenanceConfig?.enabledAt
        ? new Date(maintenanceConfig.enabledAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    const handleRefresh = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Background ambient decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/20 p-8 sm:p-10 text-center">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl shadow-inner border border-slate-100">
                        <CTVLogoIcon className="h-14 w-auto mx-auto" />
                    </div>
                </div>

                {/* Animated Maintenance Icon */}
                <div className="mx-auto w-20 h-20 mb-6 flex items-center justify-center rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 shadow-md">
                    <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>

                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-4">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    Modo de Manutenção Ativado
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
                    Sistema em Manutenção
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                    {maintenanceConfig?.message ||
                        'Estamos realizando melhorias técnicas e manutenções programadas no Gestor de Parcerias CTV para garantir a estabilidade e a segurança das informações.'}
                </p>

                {/* Status Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-2 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Status de Acesso:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-red-100 text-red-800">
                            Bloqueado temporariamente
                        </span>
                    </div>
                    {formattedDate && (
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Início da Manutenção:</span>
                            <span>{formattedDate}</span>
                        </div>
                    )}
                    {currentUser && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">Usuário Conectado:</span>
                            <span className="truncate max-w-[240px] text-slate-500">
                                {currentUser.name} ({currentUser.role})
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                        onClick={handleRefresh}
                        className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg shadow hover:bg-teal-700 transition duration-150 flex items-center justify-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Verificar se o Sistema Voltou
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-200 transition duration-150 text-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Entrar com Outra Conta / Master
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-8 text-center text-xs text-slate-400">
                <p>Centro de Tecnologia de Vacinas - CTVacinas</p>
                <p className="mt-1 text-slate-500">Desenvolvido por Priscila Passos e Bruna Dias</p>
            </div>
        </div>
    );
};

export default MaintenanceView;
