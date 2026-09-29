
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import Modal from './Modal';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (user: Omit<User, 'id'>) => void;
    userToEdit: User | null;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, onSubmit, userToEdit }) => {
    const getInitialState = () => ({
        name: userToEdit?.name || '',
        email: userToEdit?.email || '',
        role: userToEdit?.role || 'Pesquisador',
        platform: userToEdit?.platform || '',
    });
    
    const [formState, setFormState] = useState(getInitialState());

    useEffect(() => {
        setFormState(getInitialState());
    }, [userToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = { ...formState };
        if (userData.role !== 'Pesquisador') {
            userData.platform = '';
        }
        // Force cast role to compatible type
        onSubmit(userData as Omit<User, 'id'>);
    };

    const isEditing = !!userToEdit;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button type="submit" form="user-form" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
                        {isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}
                    </button>
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                        <input type="text" name="name" value={formState.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formState.email} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Função</label>
                        <select name="role" value={formState.role} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            <option value="Administrador Master">Administrador Master</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Coordenador">Coordenador</option>
                            <option value="Pesquisador">Pesquisador</option>
                            <option value="Consulta">Consulta</option>
                        </select>
                    </div>
                    {formState.role === 'Pesquisador' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Plataforma</label>
                            <input type="text" name="platform" value={formState.platform} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" placeholder="Ex: Plataforma A" />
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default UserManagementModal;