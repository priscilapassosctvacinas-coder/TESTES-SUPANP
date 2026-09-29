
import React from 'react';
import { View, User } from '../types';
import { ChartPieIcon, CollectionIcon, DocumentReportIcon, ClipboardListIcon, CogIcon, CTVLogoIcon, CalculatorIcon } from './Icons';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    onNewPartnership: () => void;
    currentUser: User;
    isCollapsed: boolean;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, isCollapsed, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-150 ${
            isActive
                ? 'text-white bg-teal-800 border-l-4 border-lime-500'
                : 'text-teal-100 hover:text-white hover:bg-teal-800 border-l-4 border-transparent'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? label : undefined}
    >
        {icon}
        {!isCollapsed && <span className="ml-4">{label}</span>}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onNewPartnership, currentUser, isCollapsed }) => {
    const navItems = [
        { view: View.Dashboard, label: 'Dashboard', icon: <ChartPieIcon /> },
        { view: View.Partnerships, label: 'Parcerias', icon: <CollectionIcon /> },
        { view: View.LegalInstruments, label: 'Instrumentos Jurídicos', icon: <DocumentReportIcon /> },
        { view: View.Tasks, label: 'Tarefas', icon: <ClipboardListIcon /> },
        { view: View.InternalProjects, label: 'Projetos Internos', icon: <CollectionIcon /> },
        { view: View.Proposals, label: 'Propostas', icon: <CalculatorIcon /> },
        { view: View.Pricing, label: 'Precificação', icon: <DocumentReportIcon /> },
    ];

    return (
        <aside className={`z-20 flex-shrink-0 overflow-y-auto overflow-x-hidden bg-teal-900 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            <div className="py-4 text-gray-400">
                <div className={`flex items-center justify-center h-14 mb-6 ${isCollapsed ? '' : 'px-4'}`}>
                    {isCollapsed ? (
                         <span className="text-xl font-bold text-white tracking-widest text-center">CTV</span>
                    ) : (
                        <div className="w-full">
                            <CTVLogoIcon className="w-full h-auto max-h-12" preserveAspectRatio="xMinYMid meet" />
                        </div>
                    )}
                </div>
                
                <ul className="mt-6">
                    {navItems.map(item => (
                        <li className="relative" key={item.view}>
                            <NavItem
                                icon={item.icon}
                                label={item.label}
                                isActive={activeView === item.view}
                                isCollapsed={isCollapsed}
                                onClick={() => setActiveView(item.view)}
                            />
                        </li>
                    ))}
                </ul>
                <div className="px-4 my-6">
                    <button 
                        onClick={onNewPartnership} 
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium leading-5 text-white transition-colors duration-150 bg-teal-600 border border-transparent rounded-lg active:bg-teal-600 hover:bg-teal-500 focus:outline-none focus:shadow-outline-teal ${isCollapsed ? 'justify-center px-2' : ''}`}
                        title={isCollapsed ? "Nova Parceria" : undefined}
                    >
                        {!isCollapsed ? (
                            <>
                                Nova Parceria
                                <span className="ml-2" aria-hidden="true">+</span>
                            </>
                        ) : (
                            <span aria-hidden="true">+</span>
                        )}
                    </button>
                </div>
                 {(currentUser.role === 'Administrador' || currentUser.role === 'Administrador Master') && (
                    <ul className="mt-6 pt-4 border-t border-teal-800">
                        <li className="relative">
                            <NavItem
                                icon={<CogIcon />}
                                label="Configurações"
                                isActive={activeView === View.Settings}
                                isCollapsed={isCollapsed}
                                onClick={() => setActiveView(View.Settings)}
                            />
                        </li>
                    </ul>
                 )}
            </div>
        </aside>
    );
};
