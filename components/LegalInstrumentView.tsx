
import React, { useState } from 'react';
import { LegalInstrument, Partnership, LegalInstrumentType, User } from '../types';
import { TrashIcon, SearchIcon, PencilIcon } from './Icons';

interface LegalInstrumentViewProps {
    legalInstruments: LegalInstrument[];
    partnerships: Partnership[];
    onNewInstrument: () => void;
    onSelectInstrument: (instrument: LegalInstrument) => void;
    onDeleteInstrument?: (instrumentId: number) => void;
    onEditInstrument: (instrument: LegalInstrument) => void;
    currentUser: User;
}

const getCurrentExpirationDate = (instrument: LegalInstrument): string => {
    if (instrument.addendums.length === 0) {
        return instrument.expirationDate;
    }
    const latestAddendum = instrument.addendums.reduce((latest, current) => {
        return new Date(current.newExpirationDate + 'T00:00:00') > new Date(latest.newExpirationDate + 'T00:00:00') ? current : latest;
    });
    return latestAddendum.newExpirationDate;
};


const LegalInstrumentView: React.FC<LegalInstrumentViewProps> = ({ legalInstruments, partnerships, onNewInstrument, onSelectInstrument, onDeleteInstrument, onEditInstrument, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>(''); // 'active' | 'expired' | ''

    const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'Administrador Master';
    const isConsultant = currentUser.role === 'Consulta';

    const getDaysUntilExpiration = (date: string) => {
        const diff = new Date(date + 'T00:00:00').getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const filteredInstruments = legalInstruments.filter(inst => {
        const matchesType = typeFilter ? inst.type === typeFilter : true;
        
        const currentExpiration = getCurrentExpirationDate(inst);
        const daysLeft = getDaysUntilExpiration(currentExpiration);
        const isExpired = daysLeft <= 0;

        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = !isExpired;
        } else if (statusFilter === 'expired') {
            matchesStatus = isExpired;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const formattedId = String(inst.id).padStart(4, '0');
        const partnershipsStr = inst.linkedPartnershipIds
            .map(id => partnerships.find(p => p.id === id)?.reference || '')
            .join(' ');
        
        const matchesSearch = 
            formattedId.includes(searchLower) ||
            inst.type.toLowerCase().includes(searchLower) ||
            partnershipsStr.toLowerCase().includes(searchLower) ||
            inst.signatories.some(s => s.toLowerCase().includes(searchLower)) ||
            inst.object.toLowerCase().includes(searchLower);

        return matchesType && matchesSearch && matchesStatus;
    });

    return (
        <div className="w-full">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-700">Instrumentos Jurídicos</h2>
                
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Pesquisar (Nº, Parceiro, Signatário...)" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm w-full"
                        />
                    </div>

                    <select 
                        value={typeFilter} 
                        onChange={(e) => setTypeFilter(e.target.value)} 
                        className="py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm w-full md:w-auto"
                    >
                        <option value="">Todos os Tipos</option>
                        {Object.values(LegalInstrumentType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)} 
                        className="py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm w-full md:w-auto"
                    >
                        <option value="">Todos os Status</option>
                        <option value="active">Vigentes</option>
                        <option value="expired">Vencidos</option>
                    </select>

                    {isAdmin && !isConsultant && (
                        <button onClick={onNewInstrument} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 whitespace-nowrap w-full md:w-auto">
                            Novo Instrumento
                        </button>
                    )}
                </div>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vigência</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Parcerias Vinculadas</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signatários</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            {!isConsultant && <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInstruments.sort((a, b) => b.id - a.id).map(inst => {
                            const currentExpiration = getCurrentExpirationDate(inst);
                            const daysLeft = getDaysUntilExpiration(currentExpiration);
                            const formattedId = String(inst.id).padStart(4, '0');
                            
                            const isCritical = daysLeft <= 60;

                            return (
                                <tr key={inst.id} className={`hover:bg-gray-100 cursor-pointer transition-colors ${isCritical ? 'bg-red-50' : ''}`} onClick={() => onSelectInstrument(inst)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formattedId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inst.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(currentExpiration + 'T00:00:00').toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-normal break-words max-w-xs">
                                        {inst.linkedPartnershipIds.length > 0 
                                            ? inst.linkedPartnershipIds.map(id => partnerships.find(p => p.id === id)?.reference).join(', ')
                                            : <span className="text-gray-400 italic">Sem vínculo</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={inst.signatories.join(', ')}>
                                        {inst.signatories.join(', ')}
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                        {daysLeft <= 0 ? (
                                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-800">Vencido</span>
                                        ) : daysLeft <= 30 ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Vence em {daysLeft} dias</span>
                                        ) : daysLeft <= 60 ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Vence em {daysLeft} dias</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-lime-100 text-lime-800">Vigente</span>
                                        )}
                                    </td>
                                    {!isConsultant && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {isAdmin && (
                                                <>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onEditInstrument(inst); }} 
                                                        className="text-teal-600 hover:text-teal-900 p-1"
                                                        title="Editar Instrumento"
                                                    >
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                    {onDeleteInstrument && (
                                                        <button onClick={(e) => { e.stopPropagation(); onDeleteInstrument(inst.id); }} className="text-red-400 hover:text-red-600 p-1">
                                                            <TrashIcon className="w-5 h-5"/>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {filteredInstruments.length === 0 && (
                            <tr>
                                <td colSpan={isConsultant ? 6 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Nenhum instrumento encontrado com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LegalInstrumentView;
