
import React, { useMemo } from 'react';
import { Partnership, LegalInstrument, Task, View, User } from '../types';
import { ArrowRightIcon, BellIcon, CheckCircleIcon, ClockIcon, CollectionIcon, DocumentReportIcon, ExclamationIcon, XIcon } from './Icons';

interface DashboardProps {
    partnerships: Partnership[];
    legalInstruments: LegalInstrument[];
    tasks: Task[];
    setActiveView: (view: View) => void;
    currentUser: User;
    readHistoryIds: string[];
    onMarkHistoryRead: (id: string) => void;
    onTaskClick: (taskId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div className={`p-4 bg-white rounded-lg shadow-md flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={onClick}>
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ partnerships, legalInstruments, tasks, setActiveView, currentUser, readHistoryIds, onMarkHistoryRead, onTaskClick }) => {
    const isConsultant = currentUser.role === 'Consulta';

    const visiblePartnerships = useMemo(() => {
        return partnerships.filter(p => {
            if (!p.confidential) return true;
            return currentUser.role === 'Administrador' ||
                   currentUser.role === 'Administrador Master' ||
                   [p.ctvCoordinator.id, p.ctvResearcher.id, p.ctvBusinessPartner.id].includes(currentUser.id);
        });
    }, [partnerships, currentUser]);

    // Filter instruments based on visible partnerships
    const visibleInstruments = useMemo(() => {
        const visiblePartnershipIds = visiblePartnerships.map(p => p.id);
        return legalInstruments.filter(i => 
             i.linkedPartnershipIds.some(pid => visiblePartnershipIds.includes(pid))
        );
    }, [legalInstruments, visiblePartnerships]);

    const expiringSoonInstruments = visibleInstruments.filter(inst => {
        const diff = new Date(inst.expirationDate + 'T00:00:00').getTime() - new Date().getTime();
        const days = diff / (1000 * 3600 * 24);
        return days > 0 && days <= 60;
    });

    // Filter tasks: Pending AND assigned to current user
    const pendingTasks = useMemo(() => {
        return tasks
            .filter(task => {
                // Must be assigned to me
                const assignedToMe = task.assignedTo.some(u => u.id === currentUser.id);
                // Must be pending
                return !task.completed && assignedToMe;
            })
            .sort((a, b) => new Date(a.dueDate + 'T00:00:00').getTime() - new Date(b.dueDate + 'T00:00:00').getTime());
    }, [tasks, currentUser.id]);

    const partnershipsExecuting = visiblePartnerships.filter(p => p.status === 'Em execução').length;

    // Filter History:
    // 1. User is involved (Coordinator, Researcher, Business Partner)
    // 2. Not read
    const recentHistory = useMemo(() => {
        const relevantPartnerships = visiblePartnerships.filter(p => 
            p.ctvCoordinator.id === currentUser.id || 
            p.ctvResearcher.id === currentUser.id || 
            p.ctvBusinessPartner.id === currentUser.id
        );

        return relevantPartnerships
            .flatMap(p => p.history.map(entry => ({
                ...entry,
                partnershipReference: p.reference,
            })))
            .filter(entry => !readHistoryIds.includes(entry.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5); // Just top 5 unread
    }, [visiblePartnerships, currentUser.id, readHistoryIds]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-700">Dashboard</h2>
            
            <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total de Parcerias" value={visiblePartnerships.length} icon={<CollectionIcon className="w-6 h-6 text-white"/>} color="bg-teal-600" onClick={() => setActiveView(View.Partnerships)} />
                <StatCard title="Parcerias em Execução" value={partnershipsExecuting} icon={<ClockIcon className="w-6 h-6 text-teal-900"/>} color="bg-lime-400" />
                <StatCard title="Instrumentos a Vencer" value={expiringSoonInstruments.length} icon={<ExclamationIcon className="w-6 h-6 text-white"/>} color="bg-amber-500" onClick={() => setActiveView(View.LegalInstruments)} />
                <StatCard title="Minhas Tarefas Pendentes" value={pendingTasks.length} icon={<BellIcon className="w-6 h-6 text-white"/>} color="bg-red-500" onClick={() => setActiveView(View.Tasks)} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Histórico Recente (Relevante para você)</h3>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                        {recentHistory.map((entry, index) => (
                           <div key={entry.id || index} className="flex items-start space-x-3 group relative pr-8">
                                <div className="bg-teal-100 p-2 rounded-full mt-1">
                                    <CheckCircleIcon className="w-5 h-5 text-teal-600"/>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold text-gray-800">{entry.partnershipReference}:</span> {entry.description}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleString()} por {entry.user}</p>
                                </div>
                                <button 
                                    onClick={() => onMarkHistoryRead(entry.id)}
                                    className="absolute right-0 top-1 text-gray-300 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Marcar como lido"
                                >
                                    <CheckCircleIcon className="w-5 h-5"/>
                                </button>
                           </div>
                        ))}
                        {recentHistory.length === 0 && (
                            <p className="text-sm text-gray-500">Nenhum histórico novo não lido.</p>
                        )}
                    </div>
                </div>

                {/* Overdue Tasks */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 flex justify-between items-center">
                        <span>Minhas Tarefas Pendentes (Ordem de Vencimento)</span>
                        <button onClick={() => setActiveView(View.Tasks)} className="text-sm text-teal-600 hover:underline flex items-center">Ver todas <ArrowRightIcon className="w-4 h-4 ml-1"/></button>
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {pendingTasks.slice(0, 5).map(task => {
                            const partnership = visiblePartnerships.find(p => p.id === task.partnershipId);
                            const dueDate = new Date(task.dueDate + 'T00:00:00');
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const isOverdue = !task.completed && dueDate < today;
                            
                            return (
                                <div 
                                    key={task.id} 
                                    className="p-3 bg-gray-50 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => onTaskClick(task.id)} // Navigates to specific task
                                    title="Clique para abrir esta tarefa"
                                >
                                    <p className="font-semibold text-sm text-gray-800">{task.title}</p>
                                    <p className="text-xs text-gray-500">Parceria: {partnership?.reference}</p>
                                    <p className={`text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                        Vencimento: {dueDate.toLocaleDateString()}</p>
                                </div>
                            );
                        })}
                         {pendingTasks.length === 0 && <p className="text-sm text-gray-500">Nenhuma tarefa pendente para você.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
