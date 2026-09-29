
import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface NewHistoryEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (description: string) => void;
}

const NewHistoryEntryModal: React.FC<NewHistoryEntryModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDescription('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim()) {
            onSubmit(description.trim());
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Adicionar Novo Histórico"
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="history-form" 
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-teal-300"
                        disabled={!description.trim()}
                    >
                        Salvar
                    </button>
                </>
            }
        >
            <form id="history-form" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="history-description" className="block text-sm font-medium text-gray-700">
                        Histórico
                    </label>
                    <textarea
                        id="history-description"
                        name="description"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="Descreva o evento ou atualização..."
                        required
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    );
};

export default NewHistoryEntryModal;
