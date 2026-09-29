
import React, { useState, useEffect, useRef } from 'react';
import { LegalInstrument, Partnership, LegalInstrumentType } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon, UploadIcon, SearchIcon, XIcon } from './Icons';

interface NewLegalInstrumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (instrument: Omit<LegalInstrument, 'id' | 'addendums'>, file: File | null) => Promise<void>;
    partnerships: Partnership[];
    isSubmitting: boolean;
    preSelectedPartnership?: Partnership | null;
    instrumentToEdit?: LegalInstrument | null;
}

const getInitialState = () => {
    // Local YYYY-MM-DD
    const localToday = new Date().toLocaleDateString('en-CA');
    return {
        signatories: [''],
        type: LegalInstrumentType.PartnershipAgreement,
        linkedPartnershipIds: [] as string[],
        object: '',
        signatureDate: localToday,
        expirationDate: '',
        document: undefined,
        observations: '',
    };
};

const NewLegalInstrumentModal: React.FC<NewLegalInstrumentModalProps> = ({ isOpen, onClose, onSubmit, partnerships, isSubmitting, preSelectedPartnership, instrumentToEdit }) => {
    const [formState, setFormState] = useState<Omit<LegalInstrument, 'id' | 'addendums'>>(getInitialState());
    const [files, setFiles] = useState<File[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    
    // Searchable dropdown states
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditing = !!instrumentToEdit;

    useEffect(() => {
        if (isOpen) {
            if (instrumentToEdit) {
                setFormState({
                    signatories: instrumentToEdit.signatories,
                    type: instrumentToEdit.type,
                    linkedPartnershipIds: instrumentToEdit.linkedPartnershipIds,
                    object: instrumentToEdit.object,
                    signatureDate: instrumentToEdit.signatureDate,
                    expirationDate: instrumentToEdit.expirationDate,
                    document: instrumentToEdit.document,
                    observations: instrumentToEdit.observations,
                });
            } else {
                setFormState({
                    ...getInitialState(),
                    linkedPartnershipIds: preSelectedPartnership ? [preSelectedPartnership.id] : [],
                });
            }
            setFiles([]);
            setSearchTerm('');
            setIsDropdownOpen(false);
            setIsMerging(false);
        }
    }, [isOpen, preSelectedPartnership, instrumentToEdit]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const togglePartnership = (partnershipId: string) => {
        setFormState(prev => {
            const isSelected = prev.linkedPartnershipIds.includes(partnershipId);
            const newIds = isSelected 
                ? prev.linkedPartnershipIds.filter(id => id !== partnershipId)
                : [...prev.linkedPartnershipIds, partnershipId];
            return { ...prev, linkedPartnershipIds: newIds };
        });
        setSearchTerm('');
        setIsDropdownOpen(false);
    };
    
    const handleSignatoryChange = (index: number, value: string) => {
        const newSignatories = [...formState.signatories];
        newSignatories[index] = value;
        setFormState(prev => ({ ...prev, signatories: newSignatories }));
    };

    const addSignatory = () => {
        setFormState(prev => ({ ...prev, signatories: [...prev.signatories, ''] }));
    };

    const removeSignatory = (index: number) => {
        setFormState(prev => ({ ...prev, signatories: prev.signatories.filter((_, i) => i !== index) }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selected]);
        }
        // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente se for deletado da lista
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const mergePDFs = async (pdfFiles: File[]): Promise<File> => {
        const PDFLib = (window as any).PDFLib;
        if (!PDFLib) {
            throw new Error("A biblioteca de PDF (PDF-Lib) não foi carregada corretamente.");
        }
        
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        return new File([mergedPdfBytes], "instrumento_unificado.pdf", { type: 'application/pdf' });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formState.linkedPartnershipIds.length === 0) {
            alert("Por favor, selecione pelo menos uma parceria para vincular.");
            return;
        }

        let finalFile: File | null = null;

        try {
            if (files.length > 1) {
                setIsMerging(true);
                const onlyPdfs = files.filter(f => f.type === 'application/pdf');
                
                if (onlyPdfs.length < files.length) {
                    const proceed = window.confirm("Atenção: Apenas arquivos PDF podem ser mesclados. Outros formatos selecionados serão ignorados na junção. Deseja continuar?");
                    if (!proceed) {
                        setIsMerging(false);
                        return;
                    }
                }

                if (onlyPdfs.length === 0) {
                    alert("Não há arquivos PDF válidos para mesclar.");
                    setIsMerging(false);
                    return;
                }

                finalFile = await mergePDFs(onlyPdfs);
            } else if (files.length === 1) {
                finalFile = files[0];
            }

            await onSubmit(formState, finalFile);
        } catch (error: any) {
            console.error("Erro no processamento do formulário:", error);
            alert("Ocorreu um erro ao salvar: " + (error.message || "Erro desconhecido"));
        } finally {
            setIsMerging(false);
        }
    };

    // Filtering logic for the search
    const filteredPartnerships = partnerships.filter(p => {
        const matchesSearch = p.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const notSelected = !formState.linkedPartnershipIds.includes(p.id);
        return matchesSearch && notSelected;
    });

    const selectedPartnershipsData = partnerships.filter(p => formState.linkedPartnershipIds.includes(p.id));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Instrumento Jurídico' : 'Criar Novo Instrumento Jurídico'}>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Header Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select name="type" value={formState.type} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {Object.values(LegalInstrumentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Searchable Partnership Multi-select */}
                    <div className="md:row-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vincular Parcerias (Busca por texto)</label>
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Digite a referência ou nome da parceria..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                />
                            </div>

                            {isDropdownOpen && (
                                <ul className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {filteredPartnerships.length === 0 ? (
                                        <li className="text-gray-500 cursor-default select-none relative py-2 px-3">
                                            {searchTerm ? 'Nenhuma parceria encontrada.' : 'Comece a digitar para buscar...'}
                                        </li>
                                    ) : (
                                        filteredPartnerships.map((p) => (
                                            <li
                                                key={p.id}
                                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-teal-50 text-gray-900 border-b border-gray-50 last:border-0"
                                                onClick={() => togglePartnership(p.id)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-teal-700">{p.reference}</span>
                                                    <span className="text-xs text-gray-500 truncate">{p.title}</span>
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Selected Items Pills */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedPartnershipsData.length > 0 ? (
                                selectedPartnershipsData.map(p => (
                                    <div key={p.id} className="inline-flex items-center bg-teal-50 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-200">
                                        <span className="max-w-[150px] truncate">{p.reference}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => togglePartnership(p.id)}
                                            className="ml-1.5 inline-flex items-center justify-center text-teal-400 hover:text-teal-600 focus:outline-none"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-red-500 italic">Nenhuma parceria selecionada.</span>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-1">
                         <label className="block text-sm font-medium text-gray-700">Data de Assinatura</label>
                        <input type="date" name="signatureDate" value={formState.signatureDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Vigência</label>
                        <input type="date" name="expirationDate" value={formState.expirationDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Objeto</label>
                        <textarea name="object" value={formState.object} onChange={handleChange} rows={3} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea name="observations" value={formState.observations} onChange={handleChange} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                    </div>

                    {/* Signatories */}
                    <div className="md:col-span-2">
                         <label className="block text-sm font-medium text-gray-700">Signatários</label>
                         {formState.signatories.map((s, index) => (
                             <div key={index} className="flex items-center space-x-2 mt-1">
                                 <input type="text" value={s} onChange={e => handleSignatoryChange(index, e.target.value)} required className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" placeholder={`Signatário ${index + 1}`} />
                                 {formState.signatories.length > 1 && (
                                     <button type="button" onClick={() => removeSignatory(index)} className="text-red-500 hover:text-red-700 p-1">
                                        <TrashIcon className="w-5 h-5"/>
                                     </button>
                                 )}
                             </div>
                         ))}
                         <button type="button" onClick={addSignatory} className="text-sm text-teal-600 hover:text-teal-800 mt-2 flex items-center">
                            <PlusIcon className="w-4 h-4 mr-1"/>
                            Adicionar Signatário
                         </button>
                    </div>

                     {/* File Upload UI */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Documentos do Instrumento {isEditing && '(Opcional se já existir)' }
                        </label>
                        <div className="space-y-3">
                            {/* Botão de Seleção Real */}
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadIcon className="w-8 h-8 mb-4 text-gray-500" />
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para selecionar</span> ou arraste arquivos</p>
                                        <p className="text-xs text-gray-500">PDFs serão mesclados automaticamente (DOC/DOCX aceitos individualmente)</p>
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

                            {/* Lista de Arquivos Selecionados */}
                            {files.length > 0 && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Arquivos na fila ({files.length}):</h5>
                                    <ul className="space-y-1">
                                        {files.map((file, idx) => (
                                            <li key={`${file.name}-${idx}`} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded text-sm border border-gray-100">
                                                <div className="flex items-center truncate">
                                                    <span className={`flex-shrink-0 w-8 text-center text-[10px] font-bold py-0.5 rounded mr-3 ${file.type === 'application/pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {file.type === 'application/pdf' ? 'PDF' : 'DOC'}
                                                    </span>
                                                    <span className="truncate text-gray-600 font-medium">{file.name}</span>
                                                    <span className="ml-2 text-[10px] text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                                                </div>
                                                <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    {files.length > 1 && (
                                        <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-100 text-[11px] text-amber-700 flex items-start">
                                            <span className="mr-1">⚠️</span>
                                            <span><strong>Nota:</strong> {files.filter(f => f.type === 'application/pdf').length} arquivo(s) PDF serão mesclados em um único documento ao salvar.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4 border-t space-x-2 mt-6">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors" 
                        disabled={isSubmitting || isMerging}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-teal-300 font-medium shadow-sm transition-all" 
                        disabled={isSubmitting || isMerging || (files.length === 0 && !isEditing)}
                    >
                        {isMerging ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Mesclando...
                            </span>
                        ) : isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Instrumento')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default NewLegalInstrumentModal;
