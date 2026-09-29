
import React, { useState, useMemo } from 'react';
import { Partnership, LegalInstrument, InternalProject } from '../types';
import { SearchIcon, CollectionIcon, DocumentReportIcon, ClockIcon, ArrowRightIcon } from './Icons';

interface InternalProjectViewProps {
    internalProjects: InternalProject[];
    partnerships: Partnership[];
    legalInstruments: LegalInstrument[];
    onSelectPartnership: (partnership: Partnership) => void;
}

const InternalProjectView: React.FC<InternalProjectViewProps> = ({ internalProjects, partnerships, legalInstruments, onSelectPartnership }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    // Filtered Data
    const filteredPartnerships = useMemo(() => {
        if (!selectedProjectId) return [];
        return partnerships.filter(p => p.internalProjectId === selectedProjectId);
    }, [selectedProjectId, partnerships]);

    const filteredInstruments = useMemo(() => {
        if (!selectedProjectId) return [];
        const pIds = filteredPartnerships.map(p => p.id);
        return legalInstruments.filter(inst => 
            inst.linkedPartnershipIds.some(id => pIds.includes(id))
        );
    }, [selectedProjectId, filteredPartnerships, legalInstruments]);

    const consolidatedHistory = useMemo(() => {
        if (!selectedProjectId) return [];
        return filteredPartnerships
            .flatMap(p => p.history.map(h => ({ ...h, pRef: p.reference })))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedProjectId, filteredPartnerships]);

    const selectedProjectName = internalProjects.find(p => p.id === selectedProjectId)?.name;

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-semibold text-gray-700">Acompanhamento de Projetos Internos</h2>
                
                <div className="w-full md:w-96">
                    <label htmlFor="project-filter" className="block text-xs font-medium text-gray-500 mb-1">Filtrar por Projeto Interno / Edital</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            id="project-filter"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white shadow-sm"
                        >
                            <option value="">Selecione um projeto interno...</option>
                            {internalProjects.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {!selectedProjectId ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <CollectionIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">Selecione um Projeto Interno para visualizar os dados consolidados.</h3>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    
                    {/* Header Highlight */}
                    <div className="bg-teal-700 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center space-x-3 mb-2">
                            <CollectionIcon className="w-8 h-8 text-lime-400" />
                            <h3 className="text-2xl font-bold">{selectedProjectName}</h3>
                        </div>
                        <div className="flex gap-6 mt-4">
                            <div className="bg-teal-800 bg-opacity-50 px-4 py-2 rounded-lg">
                                <span className="text-xs text-teal-200 block">Parcerias Vinculadas</span>
                                <span className="text-xl font-bold">{filteredPartnerships.length}</span>
                            </div>
                            <div className="bg-teal-800 bg-opacity-50 px-4 py-2 rounded-lg">
                                <span className="text-xs text-teal-200 block">Total Aprovado (R$)</span>
                                <span className="text-xl font-bold">
                                    {filteredPartnerships.reduce((acc, curr) => acc + curr.approvedValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Partnerships Table */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <h4 className="font-bold text-gray-700 flex items-center">
                                    <CollectionIcon className="w-4 h-4 mr-2 text-teal-600" />
                                    Parcerias do Projeto Interno
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referência</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredPartnerships.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectPartnership(p)}>
                                                <td className="px-4 py-3 text-sm font-bold text-teal-700">{p.reference}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{p.status}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                                                    {p.approvedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredPartnerships.length === 0 && (
                                            <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 italic">Nenhuma parceria vinculada.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Legal Instruments Table */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <h4 className="font-bold text-gray-700 flex items-center">
                                    <DocumentReportIcon className="w-4 h-4 mr-2 text-teal-600" />
                                    Instrumentos Relacionados
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo / ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assinatura</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vigência</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredInstruments.map(inst => (
                                            <tr key={inst.id}>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    <div className="font-medium">{inst.type}</div>
                                                    <div className="text-xs text-gray-400">#{String(inst.id).padStart(4, '0')}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(inst.signatureDate + 'T00:00:00').toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 font-semibold">
                                                    {new Date(inst.expirationDate + 'T00:00:00').toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredInstruments.length === 0 && (
                                            <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 italic">Nenhum instrumento jurídico vinculado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Consolidated History */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 lg:col-span-2">
                             <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <h4 className="font-bold text-gray-700 flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-2 text-teal-600" />
                                    Histórico Consolidado (Todas as Parcerias)
                                </h4>
                            </div>
                            <div className="p-4 max-h-96 overflow-y-auto">
                                <div className="space-y-4">
                                    {consolidatedHistory.map((h, idx) => (
                                        <div key={idx} className="flex space-x-3 border-b border-gray-50 pb-3 last:border-0">
                                            <div className="flex-shrink-0 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{h.pRef}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(h.date).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{h.description}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Por: {h.user}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {consolidatedHistory.length === 0 && (
                                        <p className="text-center text-sm text-gray-400 py-8 italic">Nenhum histórico disponível para as parcerias deste projeto.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalProjectView;
