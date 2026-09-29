
import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { LegalInstrument, LegalInstrumentAddendum, User, Partnership } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon, PencilIcon, UploadIcon } from './Icons';

interface LegalInstrumentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    instrument: LegalInstrument | null;
    partnerships: Partnership[];
    onAddAddendum: (instrumentId: number, addendumData: Omit<LegalInstrumentAddendum, 'id'>, file: File | null) => void;
    onUpdateAddendum?: (instrumentId: number, addendumId: string, updatedData: Partial<LegalInstrumentAddendum>, file: File | null) => void;
    onDeleteAddendum?: (instrumentId: number, addendumId: string) => void;
    currentUser: User | null;
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

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100">
        <dt className="font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-800 col-span-2">{children}</dd>
    </div>
);


const LegalInstrumentDetailModal: React.FC<LegalInstrumentDetailModalProps> = ({ isOpen, onClose, instrument, partnerships, onAddAddendum, onUpdateAddendum, onDeleteAddendum, currentUser }) => {
    const initialState = {
        signatureDate: '',
        newExpirationDate: '',
    };
    const [formState, setFormState] = useState(initialState);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddendumId, setEditingAddendumId] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = currentUser?.role === 'Administrador' || currentUser?.role === 'Administrador Master';
    const isConsultant = currentUser?.role === 'Consulta';

    useEffect(() => {
        if (!isOpen) {
            setShowAddForm(false);
            setEditingAddendumId(null);
            setFormState(initialState);
            setFiles([]);
            setIsMerging(false);
        }
    }, [isOpen]);

    if (!instrument) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: value}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selected]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const mergePDFs = async (pdfFiles: File[]): Promise<File> => {
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        return new File([mergedPdfBytes], "aditivo_unificado.pdf", { type: 'application/pdf' });
    };

    const handleStartEdit = (addendum: LegalInstrumentAddendum) => {
        setFormState({
            signatureDate: addendum.signatureDate,
            newExpirationDate: addendum.newExpirationDate,
        });
        setEditingAddendumId(addendum.id);
        setShowAddForm(true);
        setFiles([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.signatureDate || !formState.newExpirationDate) return;

        let finalFile: File | null = null;
        
        try {
            if (files.length > 1) {
                setIsMerging(true);
                const onlyPdfs = files.filter(f => f.type === 'application/pdf');
                if (onlyPdfs.length === 0) {
                    alert("Apenas arquivos PDF podem ser mesclados.");
                    setIsMerging(false);
                    return;
                }
                finalFile = await mergePDFs(onlyPdfs);
            } else if (files.length === 1) {
                finalFile = files[0];
            }

            if (editingAddendumId && onUpdateAddendum) {
                onUpdateAddendum(instrument.id, editingAddendumId, formState, finalFile);
            } else {
                onAddAddendum(instrument.id, formState, finalFile);
            }
            
            setFormState(initialState);
            setShowAddForm(false);
            setEditingAddendumId(null);
            setFiles([]);
        } catch (error) {
            console.error("Erro ao processar aditivo:", error);
            alert("Ocorreu um erro ao processar os arquivos do aditivo.");
        } finally {
            setIsMerging(false);
        }
    };
    
    const sortedAddendums = [...instrument.addendums].sort((a,b) => new Date(b.signatureDate + 'T00:00:00').getTime() - new Date(a.signatureDate + 'T00:00:00').getTime());
    const currentExpirationDate = getCurrentExpirationDate(instrument);

    const linkedPartnershipRefs = instrument.linkedPartnershipIds
        .map(id => {
            const p = partnerships.find(partner => partner.id === id);
            return p ? p.reference : 'Ref Removida';
        })
        .join('; ');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Detalhes do Instrumento Jurídico #${String(instrument.id).padStart(4, '0')}`}
        >
            <div className="space-y-6">
                <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Informações Gerais</h4>
                    <dl>
                        <InfoRow label="Tipo">{instrument.type}</InfoRow>
                        <InfoRow label="Objeto">{instrument.object}</InfoRow>
                        <InfoRow label="Refs. Parcerias">{linkedPartnershipRefs || 'Nenhuma'}</InfoRow>
                        <InfoRow label="Signatários">{instrument.signatories.join(', ')}</InfoRow>
                        <InfoRow label="Data de Assinatura">{new Date(instrument.signatureDate + 'T00:00:00').toLocaleDateString()}</InfoRow>
                        <InfoRow label="Vigência Original">{new Date(instrument.expirationDate + 'T00:00:00').toLocaleDateString()}</InfoRow>
                        <InfoRow label="Vigência Atual">{new Date(currentExpirationDate + 'T00:00:00').toLocaleDateString()}</InfoRow>
                        <InfoRow label="Pasta no SharePoint">
                            {instrument.folderWebUrl ? (
                                <a href={instrument.folderWebUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                                    Acessar pasta
                                </a>
                            ) : (
                                <span>Não disponível</span>
                            )}
                        </InfoRow>
                        <InfoRow label="Documento Principal">
                            {instrument.documentWebUrl ? (
                                <a href={instrument.documentWebUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                                    Ver documento
                                </a>
                            ) : (
                                <span>Não disponível</span>
                            )}
                        </InfoRow>
                        <InfoRow label="Observações">{instrument.observations || 'N/A'}</InfoRow>
                    </dl>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-gray-700">Aditivos</h4>
                        {isAdmin && !isConsultant && !showAddForm && (
                             <button onClick={() => { setShowAddForm(true); setEditingAddendumId(null); setFormState(initialState); setFiles([]); }} className="flex items-center text-sm text-teal-600 hover:text-teal-800 transition-colors">
                                <PlusIcon className="w-4 h-4 mr-1"/> Adicionar Aditivo
                            </button>
                        )}
                    </div>
                    
                    {showAddForm && (
                        <form onSubmit={handleSubmit} className="p-4 border rounded-md bg-gray-50 space-y-4 mb-4 shadow-inner">
                            <h5 className="font-bold text-sm text-teal-800">{editingAddendumId ? 'Editar Aditivo' : 'Novo Aditivo'}</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Data de Assinatura</label>
                                    <input type="date" name="signatureDate" value={formState.signatureDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Nova Data de Vigência</label>
                                    <input type="date" name="newExpirationDate" value={formState.newExpirationDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                </div>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Documentos do Aditivo {editingAddendumId && '(Opcional se já existir)'}</label>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                                <UploadIcon className="w-6 h-6 mb-2 text-gray-500" />
                                                <p className="text-xs text-gray-500"><span className="font-semibold">Clique para selecionar</span> ou arraste</p>
                                                <p className="text-[10px] text-gray-400">PDFs múltiplos serão mesclados</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                className="hidden" 
                                                multiple 
                                                accept=".pdf,.doc,.docx" 
                                                onChange={handleFileChange} 
                                            />
                                        </label>
                                    </div>

                                    {files.length > 0 && (
                                        <div className="bg-white border rounded p-2 max-h-40 overflow-y-auto shadow-sm">
                                            <ul className="space-y-1">
                                                {files.map((file, idx) => (
                                                    <li key={idx} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded text-[11px] border">
                                                        <span className="truncate max-w-[200px] text-gray-600">{file.name}</span>
                                                        <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                                            <TrashIcon className="w-3.5 h-3.5"/>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            {files.length > 1 && (
                                                <p className="mt-2 text-[10px] text-amber-600 italic font-medium">
                                                    * {files.filter(f => f.type === 'application/pdf').length} PDFs serão mesclados em um só.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={() => { setShowAddForm(false); setEditingAddendumId(null); setFiles([]); }} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors" disabled={isMerging}>Cancelar</button>
                                <button type="submit" className="px-4 py-1.5 text-xs bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-all font-medium disabled:bg-teal-300" disabled={isMerging}>
                                    {isMerging ? 'Mesclando...' : (editingAddendumId ? 'Atualizar' : 'Salvar Aditivo')}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {sortedAddendums.length > 0 ? (
                            sortedAddendums.map(ad => (
                                <div key={ad.id} className="p-3 bg-gray-50 rounded-md border text-sm flex justify-between items-start hover:shadow-sm transition-shadow">
                                    <div className="space-y-1">
                                        <p><span className="font-semibold text-gray-600">Assinado em:</span> {new Date(ad.signatureDate + 'T00:00:00').toLocaleDateString()}</p>
                                        <p><span className="font-semibold text-gray-600">Nova Vigência:</span> {new Date(ad.newExpirationDate + 'T00:00:00').toLocaleDateString()}</p>
                                        {ad.documentWebUrl && (
                                            <a href={ad.documentWebUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-teal-600 hover:underline text-xs font-bold mt-1">
                                                <UploadIcon className="w-3 h-3 mr-1 rotate-180" /> Ver Documento
                                            </a>
                                        )}
                                    </div>
                                    {isAdmin && !isConsultant && (
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleStartEdit(ad)} className="text-teal-600 hover:text-teal-800 p-1 transition-colors" title="Editar Aditivo">
                                                <PencilIcon className="w-4 h-4"/>
                                            </button>
                                            {onDeleteAddendum && (
                                                <button onClick={() => onDeleteAddendum(instrument.id, ad.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Excluir Aditivo">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-md">Nenhum aditivo registrado.</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default LegalInstrumentDetailModal;
