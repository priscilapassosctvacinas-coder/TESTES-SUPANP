
import React, { useRef, useState } from 'react';
import { User, SystemSettings, InternalProject, Bolsa } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, DownloadIcon, UploadIcon, TableIcon, RefreshIcon, CollectionIcon, CheckCircleIcon, XIcon, CashIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface SettingsViewProps {
    currentUser: User;
    users: User[];
    onNewUser: () => void;
    onEditUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
    onImportPartnerships: (fileContent: string) => void;
    onImportLegalInstruments: (fileContent: string) => void;
    onImportUsers: (fileContent: string) => void;
    systemSettings: SystemSettings;
    onUpdateSettings: (settings: SystemSettings) => void;
    onCloudBackup: () => void;
    isBackingUp: boolean;
    internalProjects: InternalProject[];
    onSaveInternalProject: (name: string) => void;
    onUpdateInternalProject: (id: string, newName: string) => void;
    onDeleteInternalProject: (projectId: string) => void;
    onOpenMaintenanceModal?: () => void;
    onOpenJsonImportModal?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    currentUser,
    users, 
    onNewUser, 
    onEditUser, 
    onDeleteUser,
    onImportPartnerships,
    onImportLegalInstruments,
    onImportUsers,
    systemSettings,
    onUpdateSettings,
    onCloudBackup,
    isBackingUp,
    internalProjects,
    onSaveInternalProject,
    onUpdateInternalProject,
    onDeleteInternalProject,
    onOpenMaintenanceModal,
    onOpenJsonImportModal
}) => {

    const partnershipFileRef = useRef<HTMLInputElement>(null);
    const instrumentFileRef = useRef<HTMLInputElement>(null);
    const userFileRef = useRef<HTMLInputElement>(null);

    const logoLeftRef = useRef<HTMLInputElement>(null);
    const logoCenterRef = useRef<HTMLInputElement>(null);
    const logoRightRef = useRef<HTMLInputElement>(null);
    
    const [senderEmail, setSenderEmail] = useState(systemSettings.senderEmail);
    const [logoLeft, setLogoLeft] = useState<string>(systemSettings.logoLeft || '');
    const [logoCenter, setLogoCenter] = useState<string>(systemSettings.logoCenter || '');
    const [logoRight, setLogoRight] = useState<string>(systemSettings.logoRight || '');
    const [newInternalProjectName, setNewInternalProjectName] = useState('');

    const handleLogoSelect = (position: 'left' | 'center' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (position === 'left') {
                    setLogoLeft(base64);
                    onUpdateSettings({ ...systemSettings, logoLeft: base64 });
                } else if (position === 'center') {
                    setLogoCenter(base64);
                    onUpdateSettings({ ...systemSettings, logoCenter: base64 });
                } else if (position === 'right') {
                    setLogoRight(base64);
                    onUpdateSettings({ ...systemSettings, logoRight: base64 });
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleRemoveLogo = (position: 'left' | 'center' | 'right') => {
        if (position === 'left') {
            setLogoLeft('');
            onUpdateSettings({ ...systemSettings, logoLeft: '' });
        } else if (position === 'center') {
            setLogoCenter('');
            onUpdateSettings({ ...systemSettings, logoCenter: '' });
        } else if (position === 'right') {
            setLogoRight('');
            onUpdateSettings({ ...systemSettings, logoRight: '' });
        }
    };
    
    // States for inline editing of internal projects
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingProjectName, setEditingProjectName] = useState('');

    // States for Bolsas
    const [newBolsaCargo, setNewBolsaCargo] = useState('');
    const [newBolsaValor, setNewBolsaValor] = useState<string>('');
    const [newBolsaCargaHoraria, setNewBolsaCargaHoraria] = useState<string>('');
    const [editingBolsaId, setEditingBolsaId] = useState<string | null>(null);
    const [editingBolsaCargo, setEditingBolsaCargo] = useState('');
    const [editingBolsaValor, setEditingBolsaValor] = useState<string>('');
    const [editingBolsaCargaHoraria, setEditingBolsaCargaHoraria] = useState<string>('');

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, handler: (content: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                handler(content);
            };
            reader.readAsText(file);
        }
        e.target.value = ''; // Reset input
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateSettings({
            ...systemSettings,
            senderEmail: senderEmail.trim()
        });
    };

    const handleAddInternalProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newInternalProjectName.trim()) {
            onSaveInternalProject(newInternalProjectName);
            setNewInternalProjectName('');
        }
    };

    const startEditingProject = (project: InternalProject) => {
        setEditingProjectId(project.id);
        setEditingProjectName(project.name);
    };

    const cancelEditingProject = () => {
        setEditingProjectId(null);
        setEditingProjectName('');
    };

    const saveEditedProject = () => {
        if (editingProjectId && editingProjectName.trim()) {
            onUpdateInternalProject(editingProjectId, editingProjectName);
            setEditingProjectId(null);
            setEditingProjectName('');
        }
    };

    const handleAddBolsa = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBolsaCargo.trim() && newBolsaValor && newBolsaCargaHoraria) {
            const newBolsa: Bolsa = {
                id: uuidv4(),
                cargo: newBolsaCargo.trim(),
                valorBolsa: parseFloat(newBolsaValor),
                cargaHoraria: parseFloat(newBolsaCargaHoraria),
                dataAlteracao: new Date().toISOString()
            };
            
            const updatedBolsas = [...(systemSettings.bolsas || []), newBolsa];
            onUpdateSettings({
                ...systemSettings,
                bolsas: updatedBolsas
            });
            
            setNewBolsaCargo('');
            setNewBolsaValor('');
            setNewBolsaCargaHoraria('');
        }
    };

    const startEditingBolsa = (bolsa: Bolsa) => {
        setEditingBolsaId(bolsa.id);
        setEditingBolsaCargo(bolsa.cargo);
        setEditingBolsaValor(bolsa.valorBolsa.toString());
        setEditingBolsaCargaHoraria(bolsa.cargaHoraria.toString());
    };

    const cancelEditingBolsa = () => {
        setEditingBolsaId(null);
        setEditingBolsaCargo('');
        setEditingBolsaValor('');
        setEditingBolsaCargaHoraria('');
    };

    const saveEditedBolsa = () => {
        if (editingBolsaId && editingBolsaCargo.trim() && editingBolsaValor && editingBolsaCargaHoraria) {
            const updatedBolsas = (systemSettings.bolsas || []).map(b => 
                b.id === editingBolsaId 
                    ? { 
                        ...b, 
                        cargo: editingBolsaCargo.trim(), 
                        valorBolsa: parseFloat(editingBolsaValor),
                        cargaHoraria: parseFloat(editingBolsaCargaHoraria),
                        dataAlteracao: new Date().toISOString()
                      } 
                    : b
            );
            
            onUpdateSettings({
                ...systemSettings,
                bolsas: updatedBolsas
            });
            
            setEditingBolsaId(null);
            setEditingBolsaCargo('');
            setEditingBolsaValor('');
            setEditingBolsaCargaHoraria('');
        }
    };

    const handleDeleteBolsa = (id: string) => {
        const updatedBolsas = (systemSettings.bolsas || []).filter(b => b.id !== id);
        onUpdateSettings({
            ...systemSettings,
            bolsas: updatedBolsas
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const generateCsvTemplate = (type: 'partnerships' | 'instruments' | 'users') => {
        let headers: string[] = [];
        if (type === 'partnerships') {
            headers = ['reference', 'title', 'status', 'projectType', 'funder', 'funderCoordinator', 'ctvCoordinatorEmail', 'ctvResearcherEmail', 'ctvBusinessPartnerEmail', 'entryDate', 'executionStartDate', 'approvedValue', 'projectNumber', 'observations'];
        } else if (type === 'instruments') {
            headers = ['id', 'type', 'object', 'signatureDate', 'expirationDate', 'linkedPartnershipReferences', 'signatories', 'observations'];
        } else {
            headers = ['name', 'email', 'role', 'platform'];
        }
        // Using semicolon for Brazilian Excel compatibility
        const csvContent = headers.join(';');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `template_${type}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (currentUser.role !== 'Administrador' && currentUser.role !== 'Administrador Master') {
        return (
            <div className="container mx-auto text-center py-10">
                <h2 className="text-2xl font-semibold text-gray-700">Acesso Negado</h2>
                <p className="text-gray-500 mt-2">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    const isMasterAdmin = currentUser.role === 'Administrador Master';

    return (
        <div className="w-full space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-700">Configurações</h2>
                <button 
                    onClick={onCloudBackup} 
                    disabled={isBackingUp}
                    className="flex items-center px-4 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:bg-teal-400 shadow-sm"
                >
                     {isBackingUp ? (
                        <>
                           <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
                           Salvando Backup...
                        </>
                     ) : (
                        <>
                           <CollectionIcon className="w-4 h-4 mr-2" />
                           Fazer Backup CSV na Nuvem
                        </>
                     )}
                </button>
            </div>

            {/* Painel Exclusivo do Administrador Master: Controle de Acesso e Manutenção */}
            {isMasterAdmin && (
                <div className={`p-6 rounded-xl border shadow-md transition-all ${
                    systemSettings.maintenanceMode?.enabled
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                        : 'bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white border-slate-700'
                }`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{systemSettings.maintenanceMode?.enabled ? '⚠️' : '🛡️'}</span>
                                <h3 className={`text-lg font-bold ${systemSettings.maintenanceMode?.enabled ? 'text-amber-950' : 'text-white'}`}>
                                    Controle de Acesso & Modo Manutenção
                                </h3>
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
                                    Administrador Master
                                </span>
                            </div>
                            <p className={`text-xs max-w-2xl leading-relaxed ${systemSettings.maintenanceMode?.enabled ? 'text-amber-900' : 'text-slate-300'}`}>
                                Como <strong>Administrador Master</strong>, você tem o poder de desabilitar o acesso ao sistema para todos os demais usuários
                                (Administradores, Coordenadores, Pesquisadores e Consulta). Quando ativado, os demais usuários visualizam a tela de
                                <strong> &quot;Sistema em Manutenção&quot;</strong>. Você continuará com acesso total e irrestrito.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {onOpenMaintenanceModal && (
                                <button
                                    type="button"
                                    onClick={onOpenMaintenanceModal}
                                    className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                                        systemSettings.maintenanceMode?.enabled
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                    }`}
                                >
                                    {systemSettings.maintenanceMode?.enabled ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                            <span>Gerenciar / Desativar Manutenção</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>Desabilitar Acesso aos Demais Usuários</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={`mt-4 pt-3 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                        systemSettings.maintenanceMode?.enabled
                            ? 'border-amber-200 text-amber-900'
                            : 'border-slate-700 text-slate-400'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Status Atual:</span>
                            {systemSettings.maintenanceMode?.enabled ? (
                                <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                    EM MANUTENÇÃO (Acesso bloqueado para os demais usuários)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                    OPERACIONAL (Acesso normal liberado para todos)
                                </span>
                            )}
                        </div>
                        {systemSettings.maintenanceMode?.enabled && (
                            <div className="text-right">
                                {systemSettings.maintenanceMode.enabledAt && (
                                    <span>
                                        Ativado em: {new Date(systemSettings.maintenanceMode.enabledAt).toLocaleString('pt-BR')}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

             {/* Logotipos dos Relatórios e Formulários */}
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-2">Logotipos do Cabeçalho (Relatórios PDF e Word)</h3>
                <p className="text-xs text-gray-500 mb-6">
                    Configure os logotipos exibidos no topo dos formulários e relatórios oficiais. O sistema ajusta automaticamente o tamanho das imagens à altura disponível no cabeçalho.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Logo Esquerda */}
                    <div className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center text-center">
                        <span className="text-xs font-bold uppercase text-gray-700 mb-2">Logo Esquerda</span>
                        <div className="w-full h-20 bg-white border rounded flex items-center justify-center p-2 mb-3 shadow-inner">
                            {logoLeft ? (
                                <img src={logoLeft} alt="Logo Esquerda" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-xs text-gray-400 italic">EMBRAPII (Padrão)</span>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => logoLeftRef.current?.click()}
                                className="flex-1 text-xs py-1.5 px-3 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 transition-colors"
                            >
                                Upload
                            </button>
                            {logoLeft && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLogo('left')}
                                    className="text-xs py-1.5 px-2 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 transition-colors"
                                    title="Restaurar padrão"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={logoLeftRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleLogoSelect('left', e)}
                        />
                    </div>

                    {/* Logo Centralizada */}
                    <div className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center text-center">
                        <span className="text-xs font-bold uppercase text-gray-700 mb-2">Logo Centralizada</span>
                        <div className="w-full h-20 bg-white border rounded flex items-center justify-center p-2 mb-3 shadow-inner">
                            {logoCenter ? (
                                <img src={logoCenter} alt="Logo Central" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-xs text-gray-400 italic">Nenhum (Opcional)</span>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => logoCenterRef.current?.click()}
                                className="flex-1 text-xs py-1.5 px-3 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 transition-colors"
                            >
                                Upload
                            </button>
                            {logoCenter && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLogo('center')}
                                    className="text-xs py-1.5 px-2 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 transition-colors"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={logoCenterRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleLogoSelect('center', e)}
                        />
                    </div>

                    {/* Logo Direita */}
                    <div className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center text-center">
                        <span className="text-xs font-bold uppercase text-gray-700 mb-2">Logo Direita</span>
                        <div className="w-full h-20 bg-white border rounded flex items-center justify-center p-2 mb-3 shadow-inner">
                            {logoRight ? (
                                <img src={logoRight} alt="Logo Direita" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-xs text-gray-400 italic">Nenhum (Opcional)</span>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => logoRightRef.current?.click()}
                                className="flex-1 text-xs py-1.5 px-3 bg-teal-600 text-white font-medium rounded hover:bg-teal-700 transition-colors"
                            >
                                Upload
                            </button>
                            {logoRight && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLogo('right')}
                                    className="text-xs py-1.5 px-2 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 transition-colors"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={logoRightRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleLogoSelect('right', e)}
                        />
                    </div>
                </div>
            </div>

             {/* System Configuration */}
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Configurações do Sistema</h3>
                <form onSubmit={handleSaveSettings} className="max-w-2xl">
                    <div className="mb-4">
                        <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700">
                            E-mail do Remetente de Notificações
                        </label>
                        <p className="text-xs text-gray-500 mt-1 mb-2">
                            Este e-mail será usado para enviar notificações automáticas (ex: novas tarefas, parcerias).
                            Para que funcione, os usuários do sistema devem ter permissão de "Enviar Como" (Send As) neste e-mail configurada no Microsoft 365.
                            Deixe em branco para usar o e-mail do usuário logado.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                id="senderEmail"
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                placeholder="ex: cadastro@ctvacinas.org"
                                className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Bolsas Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Tabela de Bolsas</h3>
                <form onSubmit={handleAddBolsa} className="mb-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label htmlFor="bolsaCargo" className="block text-sm font-medium text-gray-700 mb-1">
                                Cargo / Função
                            </label>
                            <input
                                type="text"
                                id="bolsaCargo"
                                value={newBolsaCargo}
                                onChange={(e) => setNewBolsaCargo(e.target.value)}
                                placeholder="ex: Pesquisador I"
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-48">
                            <label htmlFor="bolsaValor" className="block text-sm font-medium text-gray-700 mb-1">
                                Valor da Bolsa (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                id="bolsaValor"
                                value={newBolsaValor}
                                onChange={(e) => setNewBolsaValor(e.target.value)}
                                placeholder="0,00"
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-32">
                            <label htmlFor="bolsaCargaHoraria" className="block text-sm font-medium text-gray-700 mb-1">
                                Horas/Mês
                            </label>
                            <input
                                type="number"
                                id="bolsaCargaHoraria"
                                value={newBolsaCargaHoraria}
                                onChange={(e) => setNewBolsaCargaHoraria(e.target.value)}
                                placeholder="ex: 160"
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors h-[38px]"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Adicionar Bolsa
                        </button>
                    </div>
                </form>

                <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas/Mês</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Alteração</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {systemSettings.bolsas && systemSettings.bolsas.length > 0 ? (
                                systemSettings.bolsas.map(bolsa => (
                                    <tr key={bolsa.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {editingBolsaId === bolsa.id ? (
                                                <input
                                                    type="text"
                                                    value={editingBolsaCargo}
                                                    onChange={(e) => setEditingBolsaCargo(e.target.value)}
                                                    className="block w-full border border-teal-500 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                                />
                                            ) : (
                                                bolsa.cargo
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {editingBolsaId === bolsa.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editingBolsaValor}
                                                    onChange={(e) => setEditingBolsaValor(e.target.value)}
                                                    className="block w-full border border-teal-500 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                                />
                                            ) : (
                                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bolsa.valorBolsa)
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {editingBolsaId === bolsa.id ? (
                                                <input
                                                    type="number"
                                                    value={editingBolsaCargaHoraria}
                                                    onChange={(e) => setEditingBolsaCargaHoraria(e.target.value)}
                                                    className="block w-full border border-teal-500 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                                />
                                            ) : (
                                                `${bolsa.cargaHoraria}h`
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(bolsa.dataAlteracao)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {editingBolsaId === bolsa.id ? (
                                                <div className="flex justify-end space-x-2">
                                                    <button 
                                                        onClick={saveEditedBolsa} 
                                                        className="text-green-600 hover:text-green-900 p-1"
                                                        title="Salvar"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        onClick={cancelEditingBolsa} 
                                                        className="text-gray-500 hover:text-gray-700 p-1"
                                                        title="Cancelar"
                                                    >
                                                        <XIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end space-x-2">
                                                    <button 
                                                        onClick={() => startEditingBolsa(bolsa)} 
                                                        className="text-teal-600 hover:text-teal-900 p-1"
                                                        title="Editar"
                                                    >
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteBolsa(bolsa.id)} 
                                                        className="text-red-600 hover:text-red-900 p-1"
                                                        title="Excluir"
                                                    >
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">Nenhuma bolsa cadastrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Internal Projects Registry */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Cadastro de Projetos Internos / Editais</h3>
                <form onSubmit={handleAddInternalProject} className="mb-6">
                    <div className="flex gap-2 items-end max-w-lg">
                        <div className="flex-1">
                            <label htmlFor="internalProjectName" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Projeto ou Edital
                            </label>
                            <input
                                type="text"
                                id="internalProjectName"
                                value={newInternalProjectName}
                                onChange={(e) => setNewInternalProjectName(e.target.value)}
                                placeholder="Digite o nome..."
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors h-[38px]"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Adicionar
                        </button>
                    </div>
                </form>

                <div className="overflow-x-auto max-h-60 overflow-y-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {internalProjects && internalProjects.length > 0 ? (
                                internalProjects.map(project => (
                                    <tr key={project.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {editingProjectId === project.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProjectName}
                                                    onChange={(e) => setEditingProjectName(e.target.value)}
                                                    className="block w-full border border-teal-500 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                project.name
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {editingProjectId === project.id ? (
                                                <div className="flex justify-end space-x-2">
                                                    <button 
                                                        onClick={saveEditedProject} 
                                                        className="text-green-600 hover:text-green-900 p-1"
                                                        title="Salvar"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        onClick={cancelEditingProject} 
                                                        className="text-gray-500 hover:text-gray-700 p-1"
                                                        title="Cancelar"
                                                    >
                                                        <XIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end space-x-2">
                                                    <button 
                                                        onClick={() => startEditingProject(project)} 
                                                        className="text-teal-600 hover:text-teal-900 p-1"
                                                        title="Editar Nome"
                                                    >
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteInternalProject(project.id)} 
                                                        className="text-red-600 hover:text-red-900 p-1"
                                                        title="Excluir"
                                                    >
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-500">Nenhum registro cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Import Data */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <div className="border-b pb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Importação e Exportação de Dados</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Alimente o sistema ou restaure backups através de arquivos estruturados .JSON ou planilhas CSV.</p>
                </div>

                {/* Destaque Principal: Importação via Arquivo .JSON */}
                <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border border-teal-200 rounded-xl p-5 shadow-xs">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📦</span>
                                <h4 className="text-base font-bold text-teal-950">
                                    Importação Completa via Arquivo .JSON (DatabaseSpabase.json)
                                </h4>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-600 text-white tracking-wider">
                                    Recomendado
                                </span>
                            </div>
                            <p className="text-xs text-teal-900 max-w-2xl leading-relaxed">
                                Importe diretamente seu arquivo <strong>DatabaseSpabase.json</strong> (ou qualquer backup .JSON do sistema) para carregar de uma só vez parcerias, instrumentos, tarefas, usuários, projetos internos e propostas com sincronização imediata no Supabase.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                            {onOpenJsonImportModal && (
                                <button
                                    type="button"
                                    onClick={onOpenJsonImportModal}
                                    className="w-full md:w-auto flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors gap-2"
                                >
                                    <UploadIcon className="w-4 h-4" />
                                    Importar Arquivo .JSON
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Partnerships Import */}
                    <div className="p-4 border rounded-md">
                        <h4 className="font-medium text-gray-700">Parcerias</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Importe múltiplas parcerias de um arquivo CSV.</p>
                        <div className="flex space-x-2">
                             <button onClick={() => generateCsvTemplate('partnerships')} className="flex items-center text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Template
                            </button>
                            <button onClick={() => partnershipFileRef.current?.click()} className="flex items-center text-sm px-3 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600">
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Importar
                            </button>
                            <input type="file" ref={partnershipFileRef} className="hidden" accept=".csv" onChange={(e) => handleFileImport(e, onImportPartnerships)} />
                        </div>
                    </div>

                    {/* Legal Instruments Import */}
                     <div className="p-4 border rounded-md">
                        <h4 className="font-medium text-gray-700">Instrumentos Jurídicos</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Importe múltiplos instrumentos de um arquivo CSV.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => generateCsvTemplate('instruments')} className="flex items-center text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Template
                            </button>
                            <button onClick={() => instrumentFileRef.current?.click()} className="flex items-center text-sm px-3 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600">
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Importar
                            </button>
                             <input type="file" ref={instrumentFileRef} className="hidden" accept=".csv" onChange={(e) => handleFileImport(e, onImportLegalInstruments)} />
                        </div>
                    </div>

                    {/* Users Import */}
                    <div className="p-4 border rounded-md">
                        <h4 className="font-medium text-gray-700">Usuários</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Importe múltiplos usuários de um arquivo CSV.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => generateCsvTemplate('users')} className="flex items-center text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Template
                            </button>
                            <button onClick={() => userFileRef.current?.click()} className="flex items-center text-sm px-3 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600">
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Importar
                            </button>
                             <input type="file" ref={userFileRef} className="hidden" accept=".csv" onChange={(e) => handleFileImport(e, onImportUsers)} />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 italic">* Os templates utilizam ponto e vírgula (;) como separador, padrão do Excel brasileiro.</p>
            </div>

            
            {/* User Management */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Usuários do Sistema</h3>
                     <button
                        onClick={onNewUser}
                        className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Adicionar Novo Usuário
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.role === 'Administrador Master' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                                <span>★</span> Administrador Master
                                            </span>
                                        ) : user.role === 'Administrador' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                Administrador
                                            </span>
                                        ) : user.role === 'Coordenador' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                Coordenador
                                            </span>
                                        ) : user.role === 'Pesquisador' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                                                Pesquisador
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                Consulta
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.platform || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button onClick={() => onEditUser(user)} title="Editar Usuário" className="text-teal-600 hover:text-teal-900">
                                            <PencilIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => onDeleteUser(user.id)} title="Excluir Usuário" className="text-red-600 hover:text-red-900">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
