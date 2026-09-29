
import React, { useState } from 'react';
import Modal from './Modal';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newPassword: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        onSubmit(newPassword);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Alterar sua Senha"
            footer={
                <button
                    type="submit"
                    form="change-password-form"
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-teal-400"
                    disabled={!newPassword || !confirmPassword}
                >
                    Salvar Nova Senha
                </button>
            }
        >
            <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                    Por segurança, você precisa criar uma nova senha para continuar.
                </p>
                <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="newPassword"
                            className="block text-sm font-medium text-gray-700 text-left"
                        >
                            Nova Senha
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-700 text-left"
                        >
                            Confirmar Nova Senha
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </form>
            </div>
        </Modal>
    );
};

export default ChangePasswordModal;
