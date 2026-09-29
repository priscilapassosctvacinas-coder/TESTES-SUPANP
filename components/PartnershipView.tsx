
import React, { useState, useMemo } from 'react';
import { Partnership, PartnershipStatus, ProjectType, User, InternalProject } from '../types';
import { PlusIcon, SearchIcon, XIcon, ChevronDownIcon } from './Icons';

interface PartnershipViewProps {
    partnerships: Partnership[];
    onSelectPartnership: (partnership: Partnership) => void;
    onNewPartnership: () => void;
    userRole?: string;
    currentUser: User;
    internalProjects: InternalProject[];
}

const getStatusColor = (status: PartnershipStatus) => {
    switch (status) {
        case PartnershipStatus.Executing:
            return 'bg-lime-100 text-lime-800';
        case PartnershipStatus.Finished:
            return 'bg-blue-100 text-blue-800';
        case PartnershipStatus.Negotiating:
            return 'bg-yellow-100 text-yellow-800';
        case PartnershipStatus.Rejected:
            return 'bg-red-100 text-red-800';
        case PartnershipStatus.Edict:
            return 'bg-purple-100 text-purple-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const PartnershipView: React.FC<PartnershipViewProps> = ({ partnerships, onSelectPartnership, onNewPartnership, userRole, currentUser, internalProjects }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [selectedInternalProjectIds, setSelectedInternalProjectIds] = useState<string[]>([]);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<PartnershipStatus[]>([PartnershipStatus.Executing, PartnershipStatus.Negotiating]);

    const toggleInternalProjectFilter = (id: string) => {
        setSelectedInternalProjectIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const getProjectFilterLabel = () => {
        if (selectedInternalProjectIds.length === 0) {
            return "Projeto Interno: Todos";
        }
        if (selectedInternalProjectIds.length === 1) {
            const id = selectedInternalProjectIds[0];
            if (id === 'none') return "Sem Projeto Interno";
            if (id === 'any') return "Com Qualquer Projeto Interno";
            const proj = internalProjects.find(ip => ip.id === id);
            return proj ? `Projeto: ${proj.name}` : "Projeto Desconhecido";
        }
        return `Projetos Internos (${selectedInternalProjectIds.length})`;
    };

    const isConsultant = userRole === 'Consulta';

    const toggleStatusFilter = (status: PartnershipStatus) => {
        setSelectedStatuses(prev => 
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const filteredPartnerships = useMemo(() => {
        return partnerships.filter(p => {
            // Check Confidentiality
            if (p.confidential) {
                const isAuthorized = currentUser.role === 'Administrador' ||
                    currentUser.role === 'Administrador Master' ||
                    [p.ctvCoordinator.id, p.ctvResearcher.id, p.ctvBusinessPartner.id].includes(currentUser.id);
                if (!isAuthorized) return false;
            }

            // Text Search
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                p.reference.toLowerCase().includes(searchLower) || 
                p.title.toLowerCase().includes(searchLower) ||
                p.ctvCoordinator.name.toLowerCase().includes(searchLower) ||
                p.ctvResearcher.name.toLowerCase().includes(searchLower) ||
                p.ctvBusinessPartner.name.toLowerCase().includes(searchLower);

            // Type Filter
            const matchesType = typeFilter ? p.projectType === typeFilter : true;

            // Internal Project Filter (multi-select)
            let matchesInternalProject = true;
            if (selectedInternalProjectIds.length > 0) {
                matchesInternalProject = false;
                if (selectedInternalProjectIds.includes('none') && !p.internalProjectId) {
                    matchesInternalProject = true;
                }
                if (selectedInternalProjectIds.includes('any') && !!p.internalProjectId) {
                    matchesInternalProject = true;
                }
                if (p.internalProjectId && selectedInternalProjectIds.includes(p.internalProjectId)) {
                    matchesInternalProject = true;
                }
            }

            // Status Filter (Multi-select)
            const matchesStatus = selectedStatuses.length > 0 ? selectedStatuses.includes(p.status) : true;

            return matchesSearch && matchesType && matchesInternalProject && matchesStatus;
        }).sort((a, b) => a.reference.localeCompare(b.reference)); // Alphabetical Sort by Reference
    }, [partnerships, searchTerm, typeFilter, selectedInternalProjectIds, selectedStatuses, currentUser]);

    const getLastHistory = (partnership: Partnership) => {
        if (partnership.history.length === 0) return null;
        // Assuming history is usually pushed to front or we sort it here to be safe
        const sortedHistory = [...partnership.history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sortedHistory[0];
    };

    const handleRowClick = (e: React.MouseEvent, partnership: Partnership) => {
        // If Ctrl or Meta key is pressed, open in new tab
        if (e.ctrlKey || e.metaKey) {
            const url = `${window.location.origin}${window.location.pathname}?partnershipId=${partnership.id}`;
            window.open(url, '_blank');
        } else {
            onSelectPartnership(partnership);
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-gray-700">Parcerias</h2>
                    {!isConsultant && (
                        <button
                            onClick={onNewPartnership}
                            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Nova Parceria
                        </button>
                    )}
                </div>

                {/* Filters Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        {/* Text Search */}
                        <div className="relative w-full md:w-1/3">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar por Ref, Título, Coord., Pesq. ou Negócios..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm w-full"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="w-full md:w-1/4">
                            <select 
                                value={typeFilter} 
                                onChange={(e) => setTypeFilter(e.target.value)} 
                                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            >
                                <option value="">Todos os Tipos</option>
                                {Object.values(ProjectType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Internal Project Filter (Multi-select) */}
                        <div className="w-full md:w-1/3 relative">
                            <button
                                type="button"
                                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                className="flex items-center justify-between w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-left cursor-pointer"
                            >
                                <span className="truncate text-gray-700 font-medium">
                                    {getProjectFilterLabel()}
                                </span>
                                <ChevronDownIcon className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                            </button>

                            {isProjectDropdownOpen && (
                                <>
                                    {/* Invisible backdrop to detect clicks outside */}
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setIsProjectDropdownOpen(false)} 
                                    />
                                    
                                    {/* Dropdown Menu */}
                                    <div className="absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-20 py-1 text-sm">
                                        {/* Reset option / Clear all */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedInternalProjectIds([]);
                                            }}
                                            className="flex items-center w-full px-3 py-2 text-left text-teal-600 hover:bg-teal-50 font-semibold border-b border-gray-100"
                                        >
                                            Limpar Filtro (Todos)
                                        </button>

                                        {/* Built-in Special Filters */}
                                        <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedInternalProjectIds.includes('none')}
                                                onChange={() => toggleInternalProjectFilter('none')}
                                                className="rounded text-teal-600 focus:ring-teal-500 mr-2 h-4 w-4 border-gray-300"
                                            />
                                            <span className="text-gray-700">Sem Projeto Interno</span>
                                        </label>

                                        <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedInternalProjectIds.includes('any')}
                                                onChange={() => toggleInternalProjectFilter('any')}
                                                className="rounded text-teal-600 focus:ring-teal-500 mr-2 h-4 w-4 border-gray-300"
                                            />
                                            <span className="text-gray-700">Com Qualquer Projeto Interno</span>
                                        </label>

                                        <div className="border-t border-gray-100 my-1"></div>

                                        {/* Actual Internal Projects */}
                                        {(internalProjects || []).length === 0 ? (
                                            <div className="px-3 py-2 text-gray-400 italic">Nenhum projeto cadastrado</div>
                                        ) : (
                                            (internalProjects || []).map(ip => (
                                                <label key={ip.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInternalProjectIds.includes(ip.id)}
                                                        onChange={() => toggleInternalProjectFilter(ip.id)}
                                                        className="rounded text-teal-600 focus:ring-teal-500 mr-2 h-4 w-4 border-gray-300"
                                                    />
                                                    <span className="text-gray-700 truncate" title={ip.name}>{ip.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="mt-4">
                        <span className="text-sm font-medium text-gray-700 mr-2">Filtrar por Status:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {Object.values(PartnershipStatus).map(status => {
                                const isSelected = selectedStatuses.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatusFilter(status)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                            isSelected 
                                                ? 'bg-teal-600 text-white border-teal-600' 
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                );
                            })}
                            {selectedStatuses.length > 0 && (
                                <button onClick={() => setSelectedStatuses([])} className="text-xs text-red-500 hover:text-red-700 underline ml-2">
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referência</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coord. CTV</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pesq. CTV</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Últ. Hist.</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Histórico</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPartnerships.map(p => {
                            const lastHistory = getLastHistory(p);
                            return (
                                <tr 
                                    key={p.id} 
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${p.confidential ? 'bg-orange-50 hover:bg-orange-100' : ''}`} 
                                    onClick={(e) => handleRowClick(e, p)}
                                    title={p.confidential ? "Parceria Confidencial" : ""}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-700">
                                        {p.reference}
                                        {p.confidential && <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1 rounded border border-orange-200">Confidencial</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.ctvCoordinator.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.ctvResearcher.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-800 max-w-xs">
                                        <div className="truncate font-semibold text-gray-900" title={p.title}>{p.title}</div>
                                        {p.internalProjectId && (
                                            <div className="mt-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200">
                                                    Proj. Interno: {internalProjects.find(ip => ip.id === p.internalProjectId)?.name || 'Desconhecido'}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {lastHistory ? new Date(lastHistory.date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lastHistory?.description || ''}>
                                        {lastHistory ? lastHistory.description : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPartnerships.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                    Nenhuma parceria encontrada com os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PartnershipView;
