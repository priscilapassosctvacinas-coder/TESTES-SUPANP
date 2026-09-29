import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { MaintenanceModeConfig } from '../types';

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig?: MaintenanceModeConfig;
    onSave: (enabled: boolean, message: string) => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
    isOpen,
    onClose,
    currentConfig,
    onSave
}) => {
    const isCurrentlyEnabled = !!currentConfig?.enabled;
    const [targetEnabled, setTargetEnabled] = useState(isCurrentlyEnabled);
    const [message, setMessage] = useState(
        currentConfig?.message ||
        'Estamos realizando melhorias e manutenção técnica no sistema. O acesso será restabelecido em breve.'
    );

    useEffect(() => {
        if (isOpen) {
            setTargetEnabled(!!currentConfig?.enabled);
            setMessage(
                currentConfig?.message ||
                'Estamos realizando melhorias e manutenção técnica no sistema. O acesso será restabelecido em breve.'
            );
        }
    }, [isOpen, currentConfig]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(targetEnabled, message.trim());
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Controle de Acesso ao Sistema (Modo Manutenção)"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="maintenance-control-form"
                        className={`px-5 py-2 text-white font-medium rounded-lg text-sm shadow transition-colors ${
                            targetEnabled
                                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                                : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'
                        }`}
                    >
                        {targetEnabled ? 'Salvar e Bloquear Acesso aos Demais' : 'Salvar e Liberar Acesso para Todos'}
                    </button>
                </div>
            }
        >
            <form id="maintenance-control-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Explanation banner */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div className="ml-3 text-xs sm:text-sm text-amber-900 leading-relaxed">
                            <p className="font-bold mb-1">Recurso Exclusivo do Administrador Master</p>
                            <p>
                                Quando o modo de manutenção está ativado, <strong>todos os demais usuários</strong> (Administradores, Coordenadores, Pesquisadores e Consulta)
                                têm o acesso suspenso e são direcionados para a tela de <strong>&quot;Sistema em Manutenção&quot;</strong>.
                            </p>
                            <p className="mt-1 text-amber-800">
                                Apenas usuários com o perfil <strong>Administrador Master</strong> continuam com acesso irrestrito ao sistema.
                            </p>
                        </div>
                    </div>
                </div>

                {/* State toggle switch */}
                <div className="p-4 border rounded-xl bg-gray-50 flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-semibold text-gray-800">
                            Status do Acesso ao Sistema
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                            {targetEnabled
                                ? '⚠️ Em Manutenção: Acesso bloqueado para os demais usuários'
                                : '✅ Normal: Sistema acessível a todos os usuários autorizados'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTargetEnabled(false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                !targetEnabled
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            Liberado
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetEnabled(true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                targetEnabled
                                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            Em Manutenção
                        </button>
                    </div>
                </div>

                {/* Custom notice message */}
                <div>
                    <label htmlFor="maintenance-message" className="block text-sm font-medium text-gray-700 mb-1">
                        Mensagem apresentada na Tela de Manutenção
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Esta mensagem será exibida na tela de bloqueio para todos os usuários que tentarem acessar o sistema.
                    </p>
                    <textarea
                        id="maintenance-message"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ex: Estamos realizando manutenção programada no banco de dados. Previsão de retorno: 14h30."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                        required
                    />
                </div>

                {/* Quick status details if currently active */}
                {currentConfig?.enabled && (
                    <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg space-y-1">
                        <div>
                            <strong>Última ativação:</strong>{' '}
                            {currentConfig.enabledAt ? new Date(currentConfig.enabledAt).toLocaleString('pt-BR') : 'Data não registrada'}
                        </div>
                        {currentConfig.enabledBy && (
                            <div>
                                <strong>Ativado por:</strong> {currentConfig.enabledBy}
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default MaintenanceModal;
