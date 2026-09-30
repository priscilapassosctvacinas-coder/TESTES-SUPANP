import React, { useState, useMemo } from 'react';
import { SystemAuditLog, User } from '../types';
import { 
    SearchIcon, 
    DownloadIcon, 
    TrashIcon, 
    RefreshIcon, 
    CollectionIcon,
    DocumentReportIcon,
    ClockIcon,
    CheckCircleIcon,
    XIcon
} from './Icons';

interface SystemAuditLogsTabProps {
    currentUser: User;
    auditLogs: SystemAuditLog[];
    onClearLogs?: () => void;
}

export const SystemAuditLogsTab: React.FC<SystemAuditLogsTabProps> = ({
    currentUser,
    auditLogs,
    onClearLogs
}) => {
    const isMasterAdmin = currentUser.role === 'Administrador Master';

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [selectedEntity, setSelectedEntity] = useState<string>('all');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;
    const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);

    // Proteção de segurança restrita ao Administrador Master
    if (!isMasterAdmin) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-900 my-6">
                <span className="text-4xl block mb-2">🚫</span>
                <h3 className="text-lg font-bold">Acesso Restrito</h3>
                <p className="text-sm text-red-700 mt-1 max-w-md mx-auto">
                    A guia de <strong>Registro de Alterações do Sistema</strong> é exclusiva para o <strong>Administrador Master</strong>. Seu perfil atual ({currentUser.role}) não possui permissão para visualizar estes registros.
                </p>
            </div>
        );
    }

    // Filtragem dos logs
    const filteredLogs = useMemo(() => {
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        return auditLogs.filter(log => {
            // Busca textual
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesUser = log.userName?.toLowerCase().includes(term) || log.userEmail?.toLowerCase().includes(term);
                const matchesTitle = log.title?.toLowerCase().includes(term);
                const matchesDetails = log.details?.toLowerCase().includes(term);
                const matchesEntity = log.entityType?.toLowerCase().includes(term);
                if (!matchesUser && !matchesTitle && !matchesDetails && !matchesEntity) {
                    return false;
                }
            }

            // Filtro por ação
            if (selectedAction !== 'all' && log.action !== selectedAction) {
                return false;
            }

            // Filtro por entidade
            if (selectedEntity !== 'all' && log.entityType !== selectedEntity) {
                return false;
            }

            // Filtro por período
            if (selectedPeriod !== 'all') {
                const logTime = new Date(log.timestamp).getTime();
                if (selectedPeriod === 'today') {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    if (logTime < todayStart.getTime()) return false;
                } else if (selectedPeriod === '7days') {
                    if (now - logTime > 7 * oneDay) return false;
                } else if (selectedPeriod === '30days') {
                    if (now - logTime > 30 * oneDay) return false;
                }
            }

            return true;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLogs, searchTerm, selectedAction, selectedEntity, selectedPeriod]);

    // Paginação
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(start, start + itemsPerPage);
    }, [filteredLogs, currentPage]);

    // Formatação de data/hora
    const formatDateTime = (isoString: string) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Cores e badges por tipo de ação
    const getActionBadge = (action: string) => {
        switch (action) {
            case 'Criação':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'Edição':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'Exclusão':
                return 'bg-rose-100 text-rose-800 border-rose-300';
            case 'Importação':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'Manutenção':
                return 'bg-amber-100 text-amber-900 border-amber-300';
            case 'Backup':
                return 'bg-teal-100 text-teal-800 border-teal-300';
            case 'Configuração':
            default:
                return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    const getEntityIcon = (entityType: string) => {
        switch (entityType) {
            case 'Parceria':
                return '🤝';
            case 'Instrumento Jurídico':
                return '📜';
            case 'Tarefa':
                return '✅';
            case 'Usuário':
                return '👤';
            case 'Projeto Interno':
                return '📁';
            case 'Bolsa':
                return '💰';
            case 'Proposta':
                return '💼';
            case 'Estudos/Precificação':
                return '🔬';
            case 'Sistema':
            default:
                return '⚙️';
        }
    };

    // Exportação em CSV
    const handleExportCSV = () => {
        const headers = ['Data_Hora', 'Usuario_Nome', 'Usuario_Email', 'Acao', 'Entidade', 'Titulo', 'Detalhes'];
        const rows = filteredLogs.map(log => [
            `"${formatDateTime(log.timestamp)}"`,
            `"${log.userName || ''}"`,
            `"${log.userEmail || ''}"`,
            `"${log.action || ''}"`,
            `"${log.entityType || ''}"`,
            `"${(log.title || '').replace(/"/g, '""')}"`,
            `"${(log.details || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `registro_alteracoes_auditoria_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Exportação em JSON
    const handleExportJSON = () => {
        const jsonContent = JSON.stringify(filteredLogs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria_sistema_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Banner de Cabeçalho da Auditoria */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-6 rounded-2xl shadow-md border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            <h3 className="text-xl font-black tracking-tight text-white">
                                Registro de Alterações de Dados do Sistema
                            </h3>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs">
                                🔒 Exclusivo Administrador Master
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                            Trilha de auditoria completa e cronológica de todas as ações no sistema: inclusões, edições, exclusões, importações de dados, ajustes de bolsas, projetos internos e configurações. Apenas você, como <strong>Administrador Master</strong>, tem acesso a esta tela.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={filteredLogs.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors border border-slate-600"
                            title="Exportar registros filtrados para CSV"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            Exportar CSV
                        </button>
                        <button
                            type="button"
                            onClick={handleExportJSON}
                            disabled={filteredLogs.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            title="Exportar registros filtrados para JSON"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            Exportar JSON
                        </button>
                        {onClearLogs && (
                            <button
                                type="button"
                                onClick={() => setShowConfirmClearModal(true)}
                                disabled={auditLogs.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 bg-rose-900/60 hover:bg-rose-800 disabled:opacity-40 text-rose-200 border border-rose-700/60 rounded-lg text-xs font-semibold transition-colors"
                                title="Limpar registros de auditoria"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* Métricas Rápidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/80">
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                        <div className="text-xl font-black text-teal-400">{auditLogs.length}</div>
                        <div className="text-[11px] text-slate-400 font-medium">Total de Registros Gravados</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                        <div className="text-xl font-black text-amber-400">
                            {auditLogs.filter(l => {
                                const d = new Date(l.timestamp);
                                const today = new Date();
                                return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                            }).length}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">Alterações Hoje</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                        <div className="text-xl font-black text-purple-400">
                            {new Set(auditLogs.map(l => l.userEmail)).size}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">Usuários Responsáveis</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                            {auditLogs.length > 0 ? formatDateTime(auditLogs[0].timestamp) : 'Nenhum'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">Última Ação Registrada</div>
                    </div>
                </div>
            </div>

            {/* Filtros e Barra de Pesquisa */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            placeholder="Buscar por usuário, título, entidade ou detalhe da alteração..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <select
                            value={selectedAction}
                            onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                            className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="all">Todas as Ações</option>
                            <option value="Criação">Criação</option>
                            <option value="Edição">Edição</option>
                            <option value="Exclusão">Exclusão</option>
                            <option value="Importação">Importação</option>
                            <option value="Configuração">Configuração</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Backup">Backup</option>
                        </select>

                        <select
                            value={selectedEntity}
                            onChange={(e) => { setSelectedEntity(e.target.value); setCurrentPage(1); }}
                            className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="all">Todas as Entidades</option>
                            <option value="Parceria">Parceria</option>
                            <option value="Instrumento Jurídico">Instrumento Jurídico</option>
                            <option value="Tarefa">Tarefa</option>
                            <option value="Usuário">Usuário</option>
                            <option value="Projeto Interno">Projeto Interno</option>
                            <option value="Bolsa">Bolsa</option>
                            <option value="Proposta">Proposta</option>
                            <option value="Estudos/Precificação">Estudos/Precificação</option>
                            <option value="Sistema">Sistema</option>
                        </select>

                        <select
                            value={selectedPeriod}
                            onChange={(e) => { setSelectedPeriod(e.target.value); setCurrentPage(1); }}
                            className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="all">Todo o Período</option>
                            <option value="today">Hoje</option>
                            <option value="7days">Últimos 7 dias</option>
                            <option value="30days">Últimos 30 dias</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t">
                    <span>
                        Exibindo <strong>{filteredLogs.length}</strong> registro(s) encontrado(s)
                    </span>
                    {(searchTerm || selectedAction !== 'all' || selectedEntity !== 'all' || selectedPeriod !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedAction('all');
                                setSelectedEntity('all');
                                setSelectedPeriod('all');
                                setCurrentPage(1);
                            }}
                            className="text-teal-600 hover:text-teal-800 font-medium"
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Tabela de Logs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                        <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th scope="col" className="px-4 py-3 w-44">Data / Hora</th>
                                <th scope="col" className="px-4 py-3 w-32">Ação</th>
                                <th scope="col" className="px-4 py-3 w-48">Entidade</th>
                                <th scope="col" className="px-4 py-3">Título / Descrição da Alteração</th>
                                <th scope="col" className="px-4 py-3 w-56">Usuário Responsável</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {paginatedLogs.length > 0 ? (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                                            {formatDateTime(log.timestamp)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadge(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                                <span>{getEntityIcon(log.entityType)}</span>
                                                <span>{log.entityType}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            <div className="font-semibold text-gray-900 leading-snug">
                                                {log.title}
                                            </div>
                                            {log.details && (
                                                <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed break-words">
                                                    {log.details}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{log.userName || 'Sistema'}</div>
                                            <div className="text-[11px] text-gray-500">{log.userEmail || '-'}</div>
                                            {log.userRole && (
                                                <span className="inline-block mt-0.5 text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border">
                                                    {log.userRole}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-3xl mb-2">🔍</span>
                                            <p className="font-medium text-gray-600">Nenhum registro de alteração encontrado</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Tente ajustar os termos de pesquisa ou remover os filtros aplicados.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNumber = i + 1;
                                return (
                                    <button
                                        key={pageNumber}
                                        type="button"
                                        onClick={() => setCurrentPage(pageNumber)}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                            currentPage === pageNumber
                                                ? 'bg-teal-600 text-white'
                                                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de confirmação para limpar logs */}
            {showConfirmClearModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <span className="text-2xl">⚠️</span>
                            <h4 className="text-lg font-bold text-gray-900">Limpar Registros de Auditoria</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Tem certeza de que deseja apagar todos os registros de alterações de dados?
                            Esta ação é irreversível e removerá o histórico detalhado de auditoria do sistema.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmClearModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onClearLogs) onClearLogs();
                                    setShowConfirmClearModal(false);
                                }}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm shadow-sm"
                            >
                                Confirmar Limpeza
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemAuditLogsTab;
