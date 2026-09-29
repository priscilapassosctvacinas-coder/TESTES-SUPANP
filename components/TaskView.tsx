
import React, { useState, useMemo, useEffect } from 'react';
import { Task, Partnership, PartnershipStatus, User } from '../types';
import { TrashIcon, PencilIcon, ArrowRightIcon, ViewGridIcon, ViewListIcon } from './Icons';

interface TaskViewProps {
    tasks: Task[];
    partnerships: Partnership[];
    users: User[];
    onNewTask: () => void;
    onCompleteTask: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onEditTask: (task: Task) => void;
    highlightedTaskId?: string | null;
    onSelectPartnership?: (partnership: Partnership) => void;
    currentUser?: User;
}

const TaskView: React.FC<TaskViewProps> = ({ tasks, partnerships, users, onNewTask, onCompleteTask, onDeleteTask, onEditTask, highlightedTaskId, onSelectPartnership, currentUser }) => {
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    
    const canCreateTask = partnerships.some(p => 
        p.status !== PartnershipStatus.Finished && p.status !== PartnershipStatus.Rejected
    );
    const isConsultant = currentUser?.role === 'Consulta';

    // Filters State
    const [partnershipFilter, setPartnershipFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [platformFilter, setPlatformFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending
    const [dateStartFilter, setDateStartFilter] = useState('');
    const [dateEndFilter, setDateEndFilter] = useState('');

    useEffect(() => {
        if (highlightedTaskId) {
            // Wait a tick for rendering
            setTimeout(() => {
                const element = document.getElementById(`task-${highlightedTaskId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [highlightedTaskId, tasks, viewMode]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Role Based Restriction: Consultants only see tasks assigned to them
            if (isConsultant && currentUser) {
                const isAssignedToMe = task.assignedTo.some(u => u.id === currentUser.id);
                if (!isAssignedToMe) return false;
            }

            const partnership = partnerships.find(p => p.id === task.partnershipId);
            
            // Partnership Filter
            if (partnershipFilter && task.partnershipId !== partnershipFilter) return false;

            // Responsible Filter
            if (responsibleFilter && !task.assignedTo.some(u => u.id === responsibleFilter)) return false;

            // Platform Filter
            if (platformFilter) {
                const hasPlatform = task.assignedTo.some(u => 
                    u.platform && u.platform.toLowerCase().includes(platformFilter.toLowerCase())
                );
                if (!hasPlatform) return false;
            }

            // Status Filter
            if (statusFilter) {
                if (statusFilter === 'pending' && task.completed) return false;
                if (statusFilter === 'completed' && !task.completed) return false;
            }

            // Date Range Filter (Due Date)
            const taskDate = new Date(task.dueDate + 'T00:00:00');
            taskDate.setHours(0,0,0,0);
            
            if (dateStartFilter) {
                const startDate = new Date(dateStartFilter + 'T00:00:00');
                if (taskDate < startDate) return false;
            }
            if (dateEndFilter) {
                const endDate = new Date(dateEndFilter + 'T00:00:00');
                if (taskDate > endDate) return false;
            }

            return true;
        }).sort((a,b) => new Date(a.dueDate + 'T00:00:00').getTime() - new Date(b.dueDate + 'T00:00:00').getTime());
    }, [tasks, partnerships, partnershipFilter, responsibleFilter, platformFilter, statusFilter, dateStartFilter, dateEndFilter, isConsultant, currentUser]);


    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-700">Gestão de Tarefas</h2>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-200 rounded-md p-1">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Visualização em Grade"
                        >
                            <ViewGridIcon className="w-5 h-5"/>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Visualização em Lista"
                        >
                            <ViewListIcon className="w-5 h-5"/>
                        </button>
                    </div>

                    {!isConsultant && (
                        <button 
                            onClick={onNewTask}
                            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={!canCreateTask}
                            title={!canCreateTask ? "Não há parcerias ativas para adicionar novas tarefas." : "Criar uma nova tarefa"}
                        >
                            Nova Tarefa
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Parceria</label>
                        <select 
                            value={partnershipFilter} 
                            onChange={(e) => setPartnershipFilter(e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Todas</option>
                            {partnerships.map(p => (
                                <option key={p.id} value={p.id}>{p.reference}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
                        <select 
                            value={responsibleFilter} 
                            onChange={(e) => setResponsibleFilter(e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Todos</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Plataforma</label>
                         <input
                            type="text"
                            placeholder="Buscar plataforma..."
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Todos</option>
                            <option value="pending">Pendentes</option>
                            <option value="completed">Concluídas</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento (Início)</label>
                        <input 
                            type="date" 
                            value={dateStartFilter} 
                            onChange={(e) => setDateStartFilter(e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento (Fim)</label>
                        <input 
                            type="date" 
                            value={dateEndFilter} 
                            onChange={(e) => setDateEndFilter(e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>
            </div>
            
            {/* --- GRID VIEW --- */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTasks.map(task => {
                        const partnership = partnerships.find(p => p.id === task.partnershipId);
                        const dueDate = new Date(task.dueDate + 'T00:00:00');
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const isOverdue = !task.completed && dueDate < today;
                        const isHighlighted = task.id === highlightedTaskId;

                        return (
                            <div 
                                key={task.id} 
                                id={`task-${task.id}`}
                                className={`bg-white rounded-lg shadow-md p-5 border-l-4 transition-all duration-500 ${
                                task.completed ? 'border-lime-500' : isOverdue ? 'border-red-500' : 'border-teal-500'
                            } ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-gray-800">{task.title}</h3>
                                    <div className="flex space-x-1">
                                        {task.completed ? (
                                            <span className="px-2 py-1 text-xs font-semibold text-lime-800 bg-lime-100 rounded-full">Concluída</span>
                                        ) : (
                                            <span className={`px-2 py-1 text-xs font-semibold ${isOverdue ? 'text-red-800 bg-red-100' : 'text-teal-800 bg-teal-100'} rounded-full`}>Pendente</span>
                                        )}
                                        {!isConsultant && (
                                            <>
                                                <button onClick={() => onEditTask(task)} className="text-teal-600 hover:text-teal-800 p-1" title="Editar Tarefa">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                {onDeleteTask && (
                                                    <button onClick={() => onDeleteTask(task.id)} className="text-red-400 hover:text-red-600 p-1">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="mt-2">
                                    <span className="text-xs text-gray-500">Parceria: </span>
                                    {partnership ? (
                                        onSelectPartnership ? (
                                            <button 
                                                onClick={() => onSelectPartnership(partnership)}
                                                className="text-sm text-teal-600 font-medium hover:underline focus:outline-none"
                                                title="Acessar Detalhes da Parceria"
                                            >
                                                {partnership.reference}
                                            </button>
                                        ) : (
                                            <span className="text-sm font-medium text-gray-700">{partnership.reference}</span>
                                        )
                                    ) : (
                                        <span className="text-sm text-gray-400">N/A</span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                                
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500 font-medium">Responsáveis:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.assignedTo.map(user => (
                                            <span key={user.id} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full" title={user.platform ? `Plataforma: ${user.platform}` : ''}>
                                                {user.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mt-4 text-xs text-gray-500">
                                    <div>
                                        <p>Vencimento: {dueDate.toLocaleDateString()}</p>
                                        {task.completed && task.completionDate && (
                                            <p className="text-lime-600">Concluído em: {new Date(task.completionDate).toLocaleDateString()}</p>
                                        )}
                                    </div>

                                    {!task.completed && (
                                        <button 
                                            onClick={() => onCompleteTask(task.id)}
                                            className="px-3 py-1 bg-lime-500 text-white text-xs rounded hover:bg-lime-600">
                                            Concluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* --- LIST VIEW --- */}
            {viewMode === 'list' && (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título / Descrição</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parceria</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsáveis</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTasks.map(task => {
                                const partnership = partnerships.find(p => p.id === task.partnershipId);
                                const dueDate = new Date(task.dueDate + 'T00:00:00');
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const isOverdue = !task.completed && dueDate < today;
                                const isHighlighted = task.id === highlightedTaskId;
                                
                                return (
                                    <tr 
                                        key={task.id} 
                                        id={`task-${task.id}`}
                                        className={`hover:bg-gray-50 ${isHighlighted ? 'bg-yellow-50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                             {task.completed ? (
                                                <span className="px-2 py-1 text-xs font-semibold text-lime-800 bg-lime-100 rounded-full">Concluída</span>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs font-semibold ${isOverdue ? 'text-red-800 bg-red-100' : 'text-teal-800 bg-teal-100'} rounded-full`}>Pendente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">{task.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {partnership ? (
                                                onSelectPartnership ? (
                                                    <button 
                                                        onClick={() => onSelectPartnership(partnership)}
                                                        className="text-teal-600 hover:underline focus:outline-none font-medium"
                                                    >
                                                        {partnership.reference}
                                                    </button>
                                                ) : (
                                                    partnership.reference
                                                )
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {task.assignedTo.map(user => (
                                                    <span key={user.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border">
                                                        {user.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{dueDate.toLocaleDateString()}</div>
                                            {task.completed && task.completionDate && (
                                                <div className="text-xs text-lime-600">Concluído: {new Date(task.completionDate).toLocaleDateString()}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2">
                                                {!task.completed && (
                                                    <button 
                                                        onClick={() => onCompleteTask(task.id)}
                                                        className="px-2 py-1 bg-lime-500 text-white text-xs rounded hover:bg-lime-600">
                                                        Concluir
                                                    </button>
                                                )}
                                                {!isConsultant && (
                                                    <>
                                                        <button onClick={() => onEditTask(task)} className="text-teal-600 hover:text-teal-900 p-1" title="Editar">
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        {onDeleteTask && (
                                                            <button onClick={() => onDeleteTask(task.id)} className="text-red-400 hover:text-red-600 p-1" title="Excluir">
                                                                <TrashIcon className="w-4 h-4"/>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            {filteredTasks.length === 0 && (
                <p className="text-sm text-gray-500 col-span-full text-center mt-6">Nenhuma tarefa encontrada com os filtros selecionados.</p>
            )}
        </div>
    );
};

export default TaskView;
