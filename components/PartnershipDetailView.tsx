
import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Partnership, LegalInstrument, Task, User, UploadedFile, PartnershipStatus, InternalProject, Proposal } from '../types';
import { ArrowLeftIcon, UploadIcon, PlusIcon, PencilIcon, TrashIcon, CollectionIcon, DocumentReportIcon, ClipboardListIcon, ArrowRightIcon, CollectionIcon as ProjectIcon, CalculatorIcon } from './Icons';
import NewHistoryEntryModal from './NewHistoryEntryModal';

interface PartnershipDetailViewProps {
    partnership: Partnership;
    legalInstruments: LegalInstrument[];
    tasks: Task[];
    users: User[];
    currentUser: User;
    onBack: () => void;
    addHistoryEntry: (partnershipId: string, description: string) => void;
    onAddDocument: (partnershipId: string, file: File, description: string) => Promise<void>;
    onSelectLegalInstrument: (instrument: LegalInstrument) => void;
    onStatusChange: (partnershipId: string, newStatus: PartnershipStatus) => void;
    isMicrosoftSignedIn: boolean;
    onEdit: (partnership: Partnership) => void;
    onDelete: (partnershipId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onDeleteLegalInstrument?: (instrumentId: number) => void;
    onAddNewInstrument: () => void;
    onAddNewTask: () => void;
    onTaskClick: (taskId: string) => void;
    internalProjects: InternalProject[];
    proposals?: Proposal[];
    onNavigateToProposalsView?: () => void;
}

const DetailCard: React.FC<{ title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({ title, children, className = "", action }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2 flex justify-between items-center">
            <span>{title}</span>
            {action}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4 text-sm items-center">
        <dt className="font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-800 col-span-2 break-words">{children}</dd>
    </div>
);

const getCurrentExpirationDate = (instrument: LegalInstrument): string => {
    if (instrument.addendums.length === 0) {
        return instrument.expirationDate;
    }
    const latestAddendum = instrument.addendums.reduce((latest, current) => {
        return new Date(current.newExpirationDate + 'T00:00:00') > new Date(latest.newExpirationDate + 'T00:00:00') ? current : latest;
    });
    return latestAddendum.newExpirationDate;
};


const PartnershipDetailView: React.FC<PartnershipDetailViewProps> = ({ partnership, legalInstruments, tasks, currentUser, onBack, addHistoryEntry, onAddDocument, onSelectLegalInstrument, onStatusChange, isMicrosoftSignedIn, onEdit, onDelete, onDeleteTask, onDeleteLegalInstrument, onAddNewInstrument, onAddNewTask, onTaskClick, internalProjects, proposals, onNavigateToProposalsView }) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [fileDescription, setFileDescription] = useState<string>('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [expandedProposalHistoryId, setExpandedProposalHistoryId] = useState<string | null>(null);

    const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'Administrador Master';
    const isConsultant = currentUser.role === 'Consulta';
    const sortedHistory = [...partnership.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const linkedProposals = (proposals || []).filter(p => p.partnershipId === partnership.id);

    const handleHistorySubmit = (description: string) => {
        addHistoryEntry(partnership.id, description);
        setIsHistoryModalOpen(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToUpload(file);
        } else {
            setFileToUpload(null);
        }
    };

    const handleUploadDocument = async () => {
        if (!fileToUpload || !fileDescription.trim()) return;
        setIsUploading(true);
        try {
            await onAddDocument(partnership.id, fileToUpload, fileDescription);
            setFileToUpload(null);
            setFileDescription('');
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Upload failed in component", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleHistoryLinkClick = (link: string) => {
        const elementId = link.substring(1); 
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-yellow-100', 'transition-colors', 'duration-1000', 'rounded-md');
            setTimeout(() => {
                element.classList.remove('bg-yellow-100', 'rounded-md');
            }, 2500);
        }
    };

    const internalProjectName = internalProjects.find(ip => ip.id === partnership.internalProjectId)?.name;


    return (
        <div className="w-full space-y-6 pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <div className="flex items-center space-x-2">
                             <h2 className="text-2xl font-bold text-gray-800">{partnership.reference}</h2>
                             {partnership.confidential && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                    Confidencial
                                </span>
                             )}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{partnership.title}</p>
                    </div>
                </div>
                 <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && !isConsultant && (
                        <button
                            onClick={onAddNewInstrument}
                            className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm shadow-sm"
                            title="Adicionar Novo Instrumento Jurídico vinculado a esta parceria"
                        >
                            <DocumentReportIcon className="w-4 h-4 mr-2" />
                            Novo Instrumento
                        </button>
                    )}
                    {!isConsultant && (
                        <>
                            <button
                                onClick={() => onEdit(partnership)}
                                className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm shadow-sm"
                            >
                                <PencilIcon className="w-4 h-4 mr-2" />
                                Editar
                            </button>
                            <button
                                onClick={() => onDelete(partnership.id)}
                                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm shadow-sm"
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Excluir
                            </button>
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Adicionar ao Histórico
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (Details) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Highlighted Internal Project Box */}
                    {internalProjectName && (
                        <div className="bg-lime-50 border-2 border-lime-400 rounded-xl p-5 shadow-sm flex items-center space-x-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-lime-500 p-3 rounded-lg text-white shadow-md">
                                <CollectionIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-lime-700 uppercase tracking-wider">Projeto Interno Vinculado</span>
                                <h3 className="text-xl font-extrabold text-teal-900 leading-tight">{internalProjectName}</h3>
                            </div>
                        </div>
                    )}

                    {/* General Information Card */}
                    <DetailCard title="Informações Gerais">
                         {/* Project Folder Link - Prominent */}
                        <div className="bg-teal-50 border border-teal-200 rounded-md p-3 mb-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-teal-800">Pasta do Projeto na Nuvem</span>
                             {partnership.folderWebUrl ? (
                                <a 
                                    href={partnership.folderWebUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center text-sm bg-white px-3 py-1 rounded border border-teal-300 text-teal-600 hover:bg-teal-50 hover:text-teal-800 font-semibold"
                                >
                                    <CollectionIcon className="w-4 h-4 mr-2"/>
                                    Acessar Pasta
                                </a>
                            ) : (
                                <span className="text-sm text-gray-500 italic">Pasta não vinculada</span>
                            )}
                        </div>

                        <InfoRow label="Status">
                            <select 
                                value={partnership.status} 
                                onChange={(e) => onStatusChange(partnership.id, e.target.value as PartnershipStatus)}
                                className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isConsultant}
                            >
                                {Object.values(PartnershipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </InfoRow>
                        <InfoRow label="Tipo de Projeto">{partnership.projectType}</InfoRow>
                        
                        <div className="my-2 border-t border-gray-100"></div>

                        {/* Highlighted Value */}
                        <InfoRow label="Valor Aprovado">
                            <span className="text-lg font-bold text-teal-700">
                                {partnership.approvedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </InfoRow>
                        
                        <div className="my-2 border-t border-gray-100"></div>
                        
                        <InfoRow label="Financiador">{partnership.funder}</InfoRow>
                        <InfoRow label="Coord. Financiador">{partnership.funderCoordinator}</InfoRow>
                        <InfoRow label="Coordenador CTV">{partnership.ctvCoordinator.name}</InfoRow>
                        <InfoRow label="Pesquisador CTV">{partnership.ctvResearcher.name}</InfoRow>
                        <InfoRow label="Negócios e Parcerias">{partnership.ctvBusinessPartner.name}</InfoRow>
                        <InfoRow label="Data de Entrada">{new Date(partnership.entryDate + 'T00:00:00').toLocaleDateString()}</InfoRow>
                        <InfoRow label="Início da Execução">{partnership.executionStartDate ? new Date(partnership.executionStartDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</InfoRow>
                        <InfoRow label="Nº do Projeto">{partnership.projectNumber}</InfoRow>
                        <InfoRow label="Observações">{partnership.observations.join(', ')}</InfoRow>
                    </DetailCard>

                    {/* Linked Instruments Section - Specifically requested fields */}
                    <DetailCard title="Instrumentos Jurídicos Vinculados">
                        {legalInstruments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo / Nº</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vigência</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pasta</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {legalInstruments.map(inst => {
                                            const expiration = getCurrentExpirationDate(inst);
                                            return (
                                                <tr key={inst.id} id={`instrument-${inst.id}`}>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <div className="font-medium">{inst.type}</div>
                                                        <div className="text-xs text-gray-500">#{String(inst.id).padStart(4, '0')}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {new Date(expiration + 'T00:00:00').toLocaleDateString()}
                                                        {new Date(expiration + 'T00:00:00') < new Date() && <span className="ml-2 text-xs text-red-600 font-bold">(Vencido)</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {inst.folderWebUrl ? (
                                                            <a href={inst.folderWebUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline flex items-center">
                                                                <CollectionIcon className="w-4 h-4 mr-1"/> Abrir
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right space-x-2">
                                                        <button onClick={() => onSelectLegalInstrument(inst)} className="text-teal-600 hover:text-teal-900 font-medium">Detalhes</button>
                                                        {isAdmin && !isConsultant && onDeleteLegalInstrument && (
                                                            <button onClick={() => onDeleteLegalInstrument(inst.id)} className="text-red-400 hover:text-red-600">
                                                                <TrashIcon className="w-4 h-4 inline" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Nenhum instrumento jurídico vinculado a esta parceria.</p>
                        )}
                    </DetailCard>

                    {/* Linked Proposals Section */}
                    <DetailCard 
                        title="Propostas de Preço Vinculadas"
                        action={
                            onNavigateToProposalsView ? (
                                <button
                                    onClick={onNavigateToProposalsView}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                >
                                    <CalculatorIcon className="w-3.5 h-3.5 mr-1" /> Gerenciar Propostas
                                </button>
                            ) : undefined
                        }
                    >
                        {linkedProposals.length > 0 ? (
                            <div className="space-y-3">
                                {linkedProposals.map(proposal => {
                                    const isHistoryExpanded = expandedProposalHistoryId === proposal.id;
                                    const statusChangeDate = proposal.statusChangedAt 
                                        ? new Date(proposal.statusChangedAt).toLocaleString('pt-BR')
                                        : new Date(proposal.updatedAt).toLocaleString('pt-BR');

                                    return (
                                        <div 
                                            key={proposal.id} 
                                            id={`proposal-${proposal.id}`}
                                            className="p-4 bg-gray-50 hover:bg-teal-50/30 rounded-xl border border-gray-200 transition-all space-y-3"
                                        >
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                                        <span className="font-bold text-gray-800 text-sm">{proposal.title}</span>
                                                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                                                            proposal.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                                            proposal.status === 'Não Aprovada' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                                            proposal.status === 'Enviada' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                            proposal.status === 'Rascunho' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                            'bg-purple-100 text-purple-800 border-purple-300'
                                                        }`}>
                                                            {proposal.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">
                                                        {proposal.items.length} item(ns) | Alteração de status: <span className="font-semibold text-gray-800">{statusChangeDate}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right flex items-center space-x-3 self-end sm:self-center">
                                                    <span className="font-bold text-teal-700 text-base">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.totalValue)}
                                                    </span>
                                                    <button
                                                        onClick={() => setExpandedProposalHistoryId(isHistoryExpanded ? null : proposal.id)}
                                                        className="px-2.5 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                                                    >
                                                        {isHistoryExpanded ? 'Ocultar Histórico' : `Histórico (${proposal.revisionHistory?.length || 0})`}
                                                    </button>
                                                    {onNavigateToProposalsView && (
                                                        <button
                                                            onClick={onNavigateToProposalsView}
                                                            className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Ver Detalhes
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isHistoryExpanded && (
                                                <div className="pt-2 border-t border-gray-200/80 mt-2">
                                                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Histórico de Status e Revisões:</p>
                                                    {proposal.revisionHistory && proposal.revisionHistory.length > 0 ? (
                                                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                            {proposal.revisionHistory.map(rev => (
                                                                <div key={rev.id} className="text-xs bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-between gap-2">
                                                                    <div>
                                                                        <span className="font-semibold text-gray-800">{rev.action}</span>
                                                                        <span className="text-gray-500 text-[10px] ml-2">(Por: {rev.userName})</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                                                        {new Date(rev.date).toLocaleString('pt-BR')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic">Sem registros de histórico.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Nenhuma proposta de preço criada para esta parceria.</p>
                        )}
                    </DetailCard>

                    {/* History Section - Moved here to be main content */}
                    <DetailCard title="Histórico Completo">
                         <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {sortedHistory.map((entry, index) => (
                                <div key={entry.id || index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                                    <div className="bg-teal-100 p-2 rounded-full mt-1 flex-shrink-0">
                                        <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs text-gray-400 mb-1">{new Date(entry.date).toLocaleString()}</p>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{entry.user}</span>
                                        </div>
                                        {entry.link ? (
                                            <button onClick={() => handleHistoryLinkClick(entry.link!)} className="text-sm text-teal-600 hover:underline text-left hover:text-teal-800 transition-colors block">
                                                {entry.description}
                                            </button>
                                        ) : (
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description}</p>
                                        )}
                                    </div>
                               </div>
                            ))}
                            {sortedHistory.length === 0 && <p className="text-sm text-gray-500">Nenhum histórico registrado.</p>}
                        </div>
                    </DetailCard>

                     {partnership.partners.length > 0 && (
                        <DetailCard title="Parceiros Envolvidos">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {partnership.partners.map(partner => (
                                    <div key={partner.id} className="p-3 bg-gray-50 rounded-md border">
                                        <p className="font-semibold text-gray-800">{partner.name}</p>
                                        <p className="text-sm text-gray-600">Coordenador: {partner.coordinator}</p>
                                    </div>
                                ))}
                            </div>
                        </DetailCard>
                    )}
                </div>

                {/* Right Column (Docs, Tasks) */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Documents */}
                     <DetailCard title="Documentos">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {partnership.documents.map((doc) => (
                                <div key={doc.id} id={`document-${doc.id}`} className="p-3 bg-gray-50 rounded-md border flex flex-col">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-medium text-gray-800 break-all">{doc.file.name}</p>
                                        {doc.webUrl && (
                                            <a href={doc.webUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-1" title="Acessar documento">
                                                <CollectionIcon className="w-4 h-4"/>
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 italic mb-1">{doc.observations}</p>
                                    <p className="text-xs text-gray-400 text-right">{new Date(doc.date).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {partnership.documents.length === 0 && <p className="text-sm text-gray-500">Nenhum documento.</p>}
                        </div>
                        {!isConsultant && (
                            <div className="mt-6 pt-4 border-t">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Adicionar Novo Documento</h4>
                                <form onSubmit={(e) => { e.preventDefault(); handleUploadDocument(); }} className="space-y-3">
                                    <div>
                                        <label htmlFor="fileDescription" className="block text-xs font-medium text-gray-700">Descrição</label>
                                        <textarea
                                            id="fileDescription"
                                            rows={2}
                                            value={fileDescription}
                                            onChange={(e) => setFileDescription(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs"
                                            placeholder="Descrição do documento..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="file-upload" className="block text-xs font-medium text-gray-700">Arquivo</label>
                                        <div className="mt-1">
                                            <input
                                                type="file"
                                                id="file-upload"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                required
                                                className="block w-full text-xs text-gray-500
                                                    file:mr-2 file:py-1 file:px-2
                                                    file:rounded-md file:border-0
                                                    file:text-xs file:font-semibold
                                                    file:bg-teal-50 file:text-teal-700
                                                    hover:file:bg-teal-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center py-1 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400 disabled:cursor-not-allowed"
                                            disabled={isUploading || !fileToUpload || !fileDescription.trim()}
                                        >
                                            {isUploading ? 'Enviando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </DetailCard>
                    
                    {/* Tasks */}
                    <DetailCard 
                        title="Tarefas Associadas"
                        action={!isConsultant ? (
                            <button 
                                onClick={onAddNewTask}
                                className="flex items-center text-xs bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-700"
                                title="Criar tarefa para esta parceria"
                            >
                                <PlusIcon className="w-3 h-3 mr-1"/> Nova
                            </button>
                        ) : undefined}
                    >
                        {tasks.length > 0 ? tasks.filter(task => !isConsultant || task.assignedTo.some(u => u.id === currentUser.id)).map(task => {
                            const dueDate = new Date(task.dueDate + 'T00:00:00');
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const isOverdue = !task.completed && dueDate < today;
                            
                            return (
                                <div 
                                    key={task.id} 
                                    onClick={() => onTaskClick(task.id)}
                                    className={`p-3 rounded-md border-l-4 mb-2 flex justify-between items-start cursor-pointer hover:shadow-md transition-shadow ${task.completed ? 'border-green-500 bg-green-50 hover:bg-green-100' : isOverdue ? 'border-red-500 bg-red-50 hover:bg-red-100' : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'}`}
                                    title="Clique para ver detalhes"
                                >
                                    <div>
                                        <div className="flex items-center">
                                             <p className="font-semibold text-gray-800 text-sm hover:underline hover:text-teal-800">{task.title}</p>
                                             <ArrowRightIcon className="w-3 h-3 ml-2 text-gray-400" />
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Resp: {task.assignedTo.map(u => u.name).join(', ')}</p>
                                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>Vencimento: {dueDate.toLocaleDateString()}</p>
                                    </div>
                                    {!isConsultant && onDeleteTask && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} 
                                            className="text-red-400 hover:text-red-600 p-1"
                                            title="Excluir Tarefa"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        }) : <p className="text-sm text-gray-500">Nenhuma tarefa associada.</p>}
                    </DetailCard>

                </div>
            </div>
            
            <NewHistoryEntryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                onSubmit={handleHistorySubmit}
            />

        </div>
    );
};

export default PartnershipDetailView;
