
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from '../utils/uuid';
import { Partnership, User, PartnershipStatus, ProjectType, InternalProject } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon } from './Icons';

interface NewPartnershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (partnership: Omit<Partnership, 'id' | 'history' | 'documents' | 'linkedInstrumentIds' | 'folderWebUrl' | 'folderId'>) => void;
    users: User[];
    isSubmitting: boolean;
    isMicrosoftSignedIn: boolean;
    partnershipToEdit?: Partnership | null;
    internalProjects: InternalProject[];
}

const NewPartnershipModal: React.FC<NewPartnershipModalProps> = ({ isOpen, onClose, onSubmit, users, isSubmitting, isMicrosoftSignedIn, partnershipToEdit, internalProjects }) => {
    const isEditing = !!partnershipToEdit;

    const getInitialState = useCallback(() => {
        // Use local YYYY-MM-DD
        const localToday = new Date().toLocaleDateString('en-CA');
        
        const defaultState = {
            reference: '',
            status: PartnershipStatus.Negotiating,
            title: '',
            funder: '',
            funderCoordinator: '',
            partners: [],
            ctvCoordinator: users.find(u => u.role === 'Coordenador') || users[0],
            ctvResearcher: users[0],
            ctvBusinessPartner: users[0],
            entryDate: localToday,
            executionStartDate: '',
            approvedValue: 0,
            projectType: ProjectType.CoDevelopment,
            observations: [''],
            projectNumber: '',
            confidential: false,
            internalProjectId: '',
        };
    
        if (isEditing && partnershipToEdit) {
            return {
                reference: partnershipToEdit.reference,
                status: partnershipToEdit.status,
                title: partnershipToEdit.title,
                funder: partnershipToEdit.funder,
                funderCoordinator: partnershipToEdit.funderCoordinator,
                partners: partnershipToEdit.partners,
                ctvCoordinator: partnershipToEdit.ctvCoordinator,
                ctvResearcher: partnershipToEdit.ctvResearcher,
                ctvBusinessPartner: partnershipToEdit.ctvBusinessPartner,
                entryDate: partnershipToEdit.entryDate,
                executionStartDate: partnershipToEdit.executionStartDate,
                approvedValue: partnershipToEdit.approvedValue,
                projectType: partnershipToEdit.projectType,
                observations: partnershipToEdit.observations,
                projectNumber: partnershipToEdit.projectNumber,
                confidential: partnershipToEdit.confidential || false,
                internalProjectId: partnershipToEdit.internalProjectId || '',
            };
        }
        return defaultState;
    }, [isEditing, partnershipToEdit, users]);

    const [formState, setFormState] = useState(getInitialState());
    
    useEffect(() => {
        if(isOpen) {
            setFormState(getInitialState());
        }
    }, [isOpen, getInitialState]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const checked = (e.target as HTMLInputElement).checked;
             setFormState(prev => ({ ...prev, [name]: checked }));
        } else {
             setFormState(prev => ({ ...prev, [name]: name === 'approvedValue' ? parseFloat(value) || 0 : value }));
        }
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'ctvCoordinator' | 'ctvResearcher' | 'ctvBusinessPartner') => {
        const selectedUser = users.find(u => u.id === e.target.value);
        if (selectedUser) {
            setFormState(prev => ({ ...prev, [field]: selectedUser }));
        }
    };
    
    const addPartner = () => {
        setFormState(prev => ({ ...prev, partners: [...prev.partners, { id: uuidv4(), name: '', coordinator: '' }] }));
    };

    const removePartner = (id: string) => {
        setFormState(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }));
    };

    const handlePartnerChange = (id: string, field: 'name' | 'coordinator', value: string) => {
        setFormState(prev => ({
            ...prev,
            partners: prev.partners.map(p => p.id === id ? { ...p, [field]: value } : p)
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formState);
        if(!isSubmitting){
            setFormState(getInitialState());
        }
    };

    const coordinators = users.filter(u => u.role === 'Coordenador');
    // We allow any user to be assigned to researcher and business partner roles for maximum flexibility
    const allAvailableUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Parceria' : 'Criar Nova Parceria'}>
            <form onSubmit={handleSubmit}>
                {!isMicrosoftSignedIn && (
                    <div className="p-3 mb-4 text-sm text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md">
                        Aviso: A conexão com o SharePoint falhou. A pasta do projeto não será criada na nuvem.
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Referência</label>
                        <input type="text" name="reference" value={formState.reference} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título do Projeto/Parceria</label>
                        <input type="text" name="title" value={formState.title} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select name="status" value={formState.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {Object.values(PartnershipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Projeto</label>
                        <select name="projectType" value={formState.projectType} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {Object.values(ProjectType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    
                    {/* New Internal Project Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Projeto Interno (Opcional)</label>
                        <select 
                            name="internalProjectId" 
                            value={formState.internalProjectId} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        >
                            <option value="">Nenhum</option>
                            {internalProjects.map(ip => (
                                <option key={ip.id} value={ip.id}>{ip.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Financiador</label>
                        <input type="text" name="funder" value={formState.funder} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coordenador do Financiador</label>
                        <input type="text" name="funderCoordinator" value={formState.funderCoordinator} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coordenador CTV</label>
                        <select name="ctvCoordinator" value={formState.ctvCoordinator.id} onChange={(e) => handleUserChange(e, 'ctvCoordinator')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Pesquisador Responsável CTV</label>
                        <select name="ctvResearcher" value={formState.ctvResearcher.id} onChange={(e) => handleUserChange(e, 'ctvResearcher')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {allAvailableUsers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Negócios e Parcerias</label>
                        <select name="ctvBusinessPartner" value={formState.ctvBusinessPartner.id} onChange={(e) => handleUserChange(e, 'ctvBusinessPartner')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            {allAvailableUsers.map(bp => <option key={bp.id} value={bp.id}>{bp.name} ({bp.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Entrada</label>
                        <input type="date" name="entryDate" value={formState.entryDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Início da Execução</label>
                        <input type="date" name="executionStartDate" value={formState.executionStartDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Valor Aprovado (R$)</label>
                        <input type="number" name="approvedValue" value={formState.approvedValue} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Número do Projeto</label>
                        <input type="text" name="projectNumber" value={formState.projectNumber} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                     <div className="md:col-span-2">
                         <div className="flex items-center mt-2">
                             <input
                                id="confidential"
                                name="confidential"
                                type="checkbox"
                                checked={formState.confidential}
                                onChange={handleChange}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                            <label htmlFor="confidential" className="ml-2 block text-sm text-gray-900 font-semibold">
                                Parceria Confidencial (Acesso restrito apenas aos envolvidos e administradores)
                            </label>
                         </div>
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea name="observations" value={formState.observations[0]} onChange={(e) => setFormState(prev => ({...prev, observations: [e.target.value]}))} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                    </div>

                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-md font-medium text-gray-800">Parceiros Externos</h4>
                            <button type="button" onClick={addPartner} className="flex items-center text-sm text-teal-600 hover:text-teal-800">
                                <PlusIcon className="w-4 h-4 mr-1"/> Adicionar Parceiro
                            </button>
                        </div>
                         <div className="mt-2 space-y-2">
                            {formState.partners.map((partner) => (
                                <div key={partner.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-2 border rounded-md">
                                    <input
                                        type="text"
                                        placeholder="Nome do Parceiro"
                                        value={partner.name}
                                        onChange={(e) => handlePartnerChange(partner.id, 'name', e.target.value)}
                                        className="col-span-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                                    />
                                     <input
                                        type="text"
                                        placeholder="Coordenador do Parceiro"
                                        value={partner.coordinator}
                                        onChange={(e) => handlePartnerChange(partner.id, 'coordinator', e.target.value)}
                                        className="col-span-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                                    />
                                    <button type="button" onClick={() => removePartner(partner.id)} className="text-red-500 hover:text-red-700 justify-self-end">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 border-t space-x-2 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" disabled={isSubmitting}>Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-teal-300" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Parceria')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default NewPartnershipModal;
