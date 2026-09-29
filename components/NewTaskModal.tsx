
import React, { useState, useEffect, useRef } from 'react';
import { Task, Partnership, User, PartnershipStatus } from '../types';
import Modal from './Modal';
import { SearchIcon } from './Icons';

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: Omit<Task, 'id' | 'completed' | 'createdBy' | 'creationDate'>) => void;
    partnerships: Partnership[];
    users: User[];
    taskToEdit?: Task | null;
    preSelectedPartnership?: Partnership | null;
}

const initialState = {
    partnershipId: '',
    title: '',
    description: '',
    assignedTo: [],
    dueDate: '',
};


const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onSubmit, partnerships, users, taskToEdit, preSelectedPartnership }) => {
    const [formState, setFormState] = useState<Omit<Task, 'id' | 'completed' | 'createdBy' | 'creationDate' | 'assignedTo'> & { assignedTo: string[] } >({
        ...initialState,
        assignedTo: [],
    });

    // Searchable dropdown state
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isEditing = !!taskToEdit;

    // When editing, allow searching even if partnership is technically finished (to preserve data), otherwise filter.
    const availablePartnerships = isEditing 
        ? partnerships 
        : partnerships.filter(p => p.status !== PartnershipStatus.Finished && p.status !== PartnershipStatus.Rejected);

    const filteredPartnerships = availablePartnerships.filter(p => 
        p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setFormState({
                    partnershipId: taskToEdit.partnershipId,
                    title: taskToEdit.title,
                    description: taskToEdit.description,
                    assignedTo: taskToEdit.assignedTo.map(u => u.id),
                    dueDate: taskToEdit.dueDate,
                });
                const p = partnerships.find(p => p.id === taskToEdit.partnershipId);
                if (p) setSearchTerm(`${p.reference} - ${p.title}`);
            } else if (preSelectedPartnership) {
                setFormState({
                     ...initialState,
                     partnershipId: preSelectedPartnership.id,
                     assignedTo: [],
                });
                setSearchTerm(`${preSelectedPartnership.reference} - ${preSelectedPartnership.title}`);
            } else {
                setFormState({ ...initialState, assignedTo: [] });
                setSearchTerm('');
            }
            setIsDropdownOpen(false);
        }
    }, [isOpen, taskToEdit, partnerships, preSelectedPartnership]);

    // Close dropdown when clicking outside
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

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIds = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
        setFormState(prev => ({ ...prev, assignedTo: selectedIds }));
    };

    const handlePartnershipSelect = (partnership: Partnership) => {
        setFormState(prev => ({ ...prev, partnershipId: partnership.id }));
        setSearchTerm(`${partnership.reference} - ${partnership.title}`);
        setIsDropdownOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.partnershipId || !formState.title || !formState.dueDate) {
            alert('Por favor, preencha todos os campos obrigatórios e selecione uma parceria válida.');
            return;
        }

        const assignedUsers = users.filter(user => formState.assignedTo.includes(user.id));
        
        onSubmit({
            ...formState,
            assignedTo: assignedUsers,
        });
    };

    const isPartnershipLocked = !!preSelectedPartnership && !isEditing;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isEditing ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="task-form"
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                        disabled={availablePartnerships.length === 0}
                    >
                        {isEditing ? 'Salvar Alterações' : 'Salvar Tarefa'}
                    </button>
                </>
            }
        >
            <form id="task-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4">
                    {availablePartnerships.length > 0 ? (
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Parceria Vinculada</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar parceria por referência ou título..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                        setFormState(prev => ({ ...prev, partnershipId: '' })); // Clear selection on type
                                    }}
                                    onFocus={() => !isPartnershipLocked && setIsDropdownOpen(true)}
                                    disabled={isPartnershipLocked}
                                    className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${isPartnershipLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            
                            {isDropdownOpen && !isPartnershipLocked && (
                                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {filteredPartnerships.length === 0 ? (
                                        <li className="text-gray-500 cursor-default select-none relative py-2 px-3 pl-9">
                                            Nenhuma parceria encontrada.
                                        </li>
                                    ) : (
                                        filteredPartnerships.map((p) => (
                                            <li
                                                key={p.id}
                                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-teal-50 text-gray-900"
                                                onClick={() => handlePartnershipSelect(p)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{p.reference}</span>
                                                    <span className="text-xs text-gray-500">{p.title}</span>
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                            {formState.partnershipId === '' && searchTerm !== '' && !isDropdownOpen && (
                                <p className="text-xs text-red-500 mt-1">Selecione uma parceria da lista.</p>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 text-center bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-700">Não há parcerias ativas disponíveis para vincular uma nova tarefa.</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input type="text" name="title" value={formState.title} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" disabled={availablePartnerships.length === 0} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Descrição</label>
                        <textarea name="description" value={formState.description} onChange={handleChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" disabled={availablePartnerships.length === 0}></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Atribuído a</label>
                        <select multiple name="assignedTo" value={formState.assignedTo} onChange={handleUserChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm h-24" disabled={availablePartnerships.length === 0}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Segure Ctrl (ou Cmd no Mac) para selecionar múltiplos.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                        <input type="date" name="dueDate" value={formState.dueDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" disabled={availablePartnerships.length === 0} />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default NewTaskModal;
