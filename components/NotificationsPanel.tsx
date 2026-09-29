
import React from 'react';
import { Notification, View } from '../types';
import { XIcon, MailIcon } from './Icons';

interface NotificationsPanelProps {
    isOpen: boolean;
    notifications: Notification[];
    onClose: () => void;
    onLinkClick: (link: Notification['link']) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, notifications, onClose, onLinkClick }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-30" 
            onClick={onClose}
        >
            <div
                className="absolute top-16 right-4 w-full max-w-md bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col"
                style={{ maxHeight: 'calc(100vh - 5rem)'}}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Notificações (Caixa de Saída)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto">
                    {notifications.length > 0 ? (
                        <ul>
                            {notifications.map(n => (
                                <li key={n.id} className={`border-b p-4 ${!n.read ? 'bg-teal-50' : 'bg-white'}`}>
                                    <p className="text-xs text-gray-500">
                                        <span className="font-semibold">Para:</span> {n.recipient}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{n.subject}</p>
                                    <div 
                                        className="text-sm text-gray-600 mt-2 prose prose-sm max-w-none" 
                                        dangerouslySetInnerHTML={{ __html: n.body }}
                                    />
                                    {n.link && (
                                        <button 
                                            onClick={() => onLinkClick(n.link)} 
                                            className="text-sm text-teal-600 hover:underline mt-2 font-semibold"
                                        >
                                            Acessar o sistema
                                        </button>
                                    )}
                                    <p className="text-right text-xs text-gray-400 mt-3">{new Date(n.timestamp).toLocaleString()}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center p-8 text-gray-500">
                            <MailIcon className="mx-auto h-12 w-12 text-gray-300"/>
                            <p className="mt-2 text-sm">Nenhuma notificação ainda.</p>
                            <p className="text-xs">As notificações de e-mail simuladas aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPanel;
