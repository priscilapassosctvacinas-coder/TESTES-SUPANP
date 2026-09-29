
import React, { useState, useMemo } from 'react';
import { Study, Essay, PersonnelCost, InputCost, CalibrationCost, User, SystemSettings, PricingAuditEntry, Proposal, ProposalItem, ProposalItemCostBreakdown, Partnership } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';
import { PlusIcon, TrashIcon, PencilIcon, ChevronRightIcon, ChevronDownIcon, CalculatorIcon, UserCircleIcon, ArrowLeftIcon, CollectionIcon, DocumentAddIcon, CheckCircleIcon, ClipboardListIcon, CashIcon, XIcon } from './Icons';
import * as MicrosoftApi from '../utils/microsoftApi';

interface PricingViewProps {
    studies: Study[];
    setStudies: React.Dispatch<React.SetStateAction<Study[]>>;
    essays: Essay[];
    setEssays: React.Dispatch<React.SetStateAction<Essay[]>>;
    users: User[];
    systemSettings: SystemSettings;
    currentUser?: User;
    isMicrosoftSignedIn?: boolean;
    msalInstance?: any;
    proposals?: Proposal[];
    setProposals?: React.Dispatch<React.SetStateAction<Proposal[]>>;
    partnerships?: Partnership[];
    addHistoryEntry?: (partnershipId: string, description: string, linkId?: string) => void;
    onNavigateToProposals?: () => void;
}

const PricingView: React.FC<PricingViewProps> = ({ 
    studies, 
    setStudies, 
    essays, 
    setEssays, 
    users, 
    systemSettings, 
    currentUser, 
    isMicrosoftSignedIn, 
    msalInstance,
    proposals,
    setProposals,
    partnerships,
    addHistoryEntry,
    onNavigateToProposals
}) => {
    const [activeTab, setActiveTab] = useState<'studies' | 'essays'>('essays');
    const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
    const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
    const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
    const [studyFilter, setStudyFilter] = useState<string>('all');
    const [isSelectingEssays, setIsSelectingEssays] = useState(false);
    const [pricingViewMode, setPricingViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadingQuote, setIsUploadingQuote] = useState(false);

    // States for Generating Proposal directly from Pricing
    const [generatingItem, setGeneratingItem] = useState<{ type: 'study' | 'essay'; item: Study | Essay } | null>(null);
    const [proposalTitle, setProposalTitle] = useState('');
    const [proposalPartnershipId, setProposalPartnershipId] = useState('');
    const [studyEssayQuantities, setStudyEssayQuantities] = useState<Record<string, number>>({});
    const [essayQuantity, setEssayQuantity] = useState(1);
    const [toastNotification, setToastNotification] = useState<{ title: string; message: string; proposalId?: string } | null>(null);

    const addEssayAuditEntry = (essayId: string, category: 'Recursos Humanos' | 'Insumos' | 'Calibração' | 'Geral' | 'Cotação Externa', action: string) => {
        const entry: PricingAuditEntry = {
            id: uuidv4(),
            date: new Date().toISOString(),
            userName: currentUser?.name || 'Usuário',
            category,
            action
        };
        setEssays(prev => prev.map(e => {
            if (e.id === essayId) {
                const currentHist = e.history || [];
                return {
                    ...e,
                    history: [entry, ...currentHist],
                    updatedAt: new Date().toISOString()
                };
            }
            return e;
        }));
    };

    const researchers = useMemo(() => 
        (users || []).filter(u => u.role !== 'Consulta'),
    [users]);

    const selectedStudy = useMemo(() => 
        studies.find(s => s.id === selectedStudyId), 
    [studies, selectedStudyId]);

    const selectedEssay = useMemo(() => 
        essays.find(e => e.id === selectedEssayId),
    [essays, selectedEssayId]);

    const studyEssays = useMemo(() => {
        if (!selectedStudy) return [];
        return (selectedStudy.essayIds || []).map(id => essays.find(e => e.id === id)).filter(Boolean) as Essay[];
    }, [selectedStudy, essays]);

    const handleAddStudy = () => {
        const name = prompt('Nome do novo estudo:');
        if (!name || !name.trim()) return;

        const newStudy: Study = {
            id: uuidv4(),
            name: name.trim(),
            essayIds: [],
            totalCost: 0
        };
        setStudies([...studies, newStudy]);
        setSelectedStudyId(newStudy.id);
    };

    const handleEditStudy = (studyId: string, currentName: string) => {
        const newName = prompt('Novo nome do estudo:', currentName);
        if (!newName || newName === currentName) return;

        setStudies(prev => prev.map(s => s.id === studyId ? { ...s, name: newName } : s));
    };

    const handleDeleteStudy = (studyId: string) => {
        if (!confirm('Tem certeza que deseja excluir este estudo? Os ensaios permanecerão na lista de Ensaios/Atividades.')) return;

        setStudies(prev => prev.filter(s => s.id !== studyId));
        if (selectedStudyId === studyId) {
            setSelectedStudyId(null);
            setSelectedEssayId(null);
        }
    };

    const handleAddEssay = () => {
        const name = prompt('Nome do novo ensaio/atividade:');
        if (!name || !name.trim()) return;

        const now = new Date().toISOString();
        const initialHistEntry: PricingAuditEntry = {
            id: uuidv4(),
            date: now,
            userName: currentUser?.name || 'Usuário',
            category: 'Geral',
            action: `Ensaio/Atividade "${name.trim()}" criado`
        };

        const newEssay: Essay = {
            id: uuidv4(),
            name: name.trim(),
            responsibleUser: researchers[0],
            personnelCosts: [],
            inputCosts: [],
            calibrationCosts: [],
            totalCost: 0,
            history: [initialHistEntry],
            createdAt: now,
            updatedAt: now
        };

        setEssays(prev => [...prev, newEssay]);
        setSelectedEssayId(newEssay.id);
    };

    const handleEditEssay = (essayId: string, currentName: string) => {
        const newName = prompt('Novo nome do ensaio:', currentName);
        if (!newName || newName === currentName) return;

        setEssays(prev => prev.map(e => e.id === essayId ? { ...e, name: newName, updatedAt: new Date().toISOString() } : e));
        addEssayAuditEntry(essayId, 'Geral', `Nome do ensaio alterado de "${currentName}" para "${newName.trim()}"`);
    };

    const handleDeleteEssay = (essayId: string) => {
        if (!confirm('Tem certeza que deseja excluir este ensaio da lista de Ensaios/Atividades? Ele será removido de todos os estudos.')) return;

        setEssays(prev => prev.filter(e => e.id !== essayId));
        setStudies(prev => prev.map(s => ({
            ...s,
            essayIds: (s.essayIds || []).filter(id => id !== essayId)
        })));
        
        if (selectedEssayId === essayId) {
            setSelectedEssayId(null);
        }
    };

    const handleToggleEssayInStudy = (essayId: string) => {
        if (!selectedStudyId) return;

        setStudies(prev => prev.map(s => {
            if (s.id === selectedStudyId) {
                const essayIds = s.essayIds || [];
                const alreadyIn = essayIds.includes(essayId);
                return {
                    ...s,
                    essayIds: alreadyIn 
                        ? essayIds.filter(id => id !== essayId)
                        : [...essayIds, essayId]
                };
            }
            return s;
        }));
    };

    const updateEssayCosts = (essayId: string, updates: Partial<Essay>) => {
        setEssays(prev => prev.map(e => {
            if (e.id === essayId) {
                const updatedEssay = { ...e, ...updates, updatedAt: new Date().toISOString() };
                // Recalculate essay total
                const personnelTotal = (updatedEssay.personnelCosts || []).reduce((sum, c) => sum + (c.totalValue || 0), 0);
                const inputTotal = (updatedEssay.inputCosts || []).reduce((sum, c) => sum + (c.totalValue || 0), 0);
                const calibrationTotal = (updatedEssay.calibrationCosts || []).reduce((sum, c) => sum + (c.totalValue || 0), 0);
                updatedEssay.totalCost = personnelTotal + inputTotal + calibrationTotal;
                return updatedEssay;
            }
            return e;
        }));
    };

    const handleAddPersonnel = () => {
        if (!selectedEssayId || !selectedEssay) return;
        const newPersonnel: PersonnelCost = {
            id: uuidv4(),
            personName: '',
            monthlyValue: 0,
            dedicationHours: 0,
            totalValue: 0
        };
        updateEssayCosts(selectedEssayId, {
            personnelCosts: [...selectedEssay.personnelCosts, newPersonnel]
        });
        addEssayAuditEntry(selectedEssayId, 'Recursos Humanos', 'Adicionou novo item de Recursos Humanos');
    };

    const handleAddInput = () => {
        if (!selectedEssayId || !selectedEssay) return;
        const newInput: InputCost = {
            id: uuidv4(),
            description: '',
            unitValue: 0,
            quantity: 0,
            totalValue: 0
        };
        updateEssayCosts(selectedEssayId, {
            inputCosts: [...selectedEssay.inputCosts, newInput]
        });
        addEssayAuditEntry(selectedEssayId, 'Insumos', 'Adicionou novo item de Insumo');
    };

    const handleAddCalibration = () => {
        if (!selectedEssayId || !selectedEssay) return;
        const newCalibration: CalibrationCost = {
            id: uuidv4(),
            equipmentName: '',
            value: 0,
            quantity: 0,
            totalValue: 0
        };
        updateEssayCosts(selectedEssayId, {
            calibrationCosts: [...selectedEssay.calibrationCosts, newCalibration]
        });
        addEssayAuditEntry(selectedEssayId, 'Calibração', 'Adicionou novo item de Calibração/Equipamento');
    };

    const handleUploadExternalQuote = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedEssayId) return;

        setIsUploadingQuote(true);
        try {
            let webUrl = '';
            if (isMicrosoftSignedIn && msalInstance) {
                const uploaded = await MicrosoftApi.uploadExternalQuoteFile(msalInstance, file);
                webUrl = uploaded.webUrl || uploaded.data?.webUrl || '';
            }
            if (!webUrl) {
                const encodedName = encodeURIComponent(file.name);
                webUrl = `https://ctvacinas974.sharepoint.com/sites/NegcioseParcerias/Documentos/Cota%C3%A7%C3%A3o%20Externa%20de%20Servi%C3%A7os/${encodedName}`;
            }

            const externalQuoteFile = {
                id: uuidv4(),
                fileName: file.name,
                webUrl,
                uploadedAt: new Date().toISOString()
            };

            updateEssayCosts(selectedEssayId, { externalQuoteFile });
            addEssayAuditEntry(selectedEssayId, 'Cotação Externa', `Anexou cotação externa do valor de mercado: "${file.name}"`);
            alert('Cotação externa do valor de mercado para o ensaio anexada com sucesso!');
        } catch (error) {
            console.error('Failed to upload external quote:', error);
            const encodedName = encodeURIComponent(file.name);
            const fallbackUrl = `https://ctvacinas974.sharepoint.com/sites/NegcioseParcerias/Documentos/Cota%C3%A7%C3%A3o%20Externa%20de%20Servi%C3%A7os/${encodedName}`;
            
            const externalQuoteFile = {
                id: uuidv4(),
                fileName: file.name,
                webUrl: fallbackUrl,
                uploadedAt: new Date().toISOString()
            };
            updateEssayCosts(selectedEssayId, { externalQuoteFile });
            addEssayAuditEntry(selectedEssayId, 'Cotação Externa', `Anexou cotação externa (SharePoint fallback): "${file.name}"`);
            alert('Arquivo anexado com link para a pasta no SharePoint!');
        } finally {
            setIsUploadingQuote(false);
            e.target.value = '';
        }
    };

    const handleRemoveExternalQuote = (essayId: string) => {
        if (confirm('Tem certeza que deseja remover o anexo de cotação externa?')) {
            updateEssayCosts(essayId, { externalQuoteFile: undefined });
            addEssayAuditEntry(essayId, 'Cotação Externa', 'Removeu anexo de cotação externa de valor de mercado');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper to generate a complete immutable cost breakdown snapshot from an essay
    const createItemCostSnapshot = (essay: Essay, studyName?: string): ProposalItemCostBreakdown => {
        const personnel = (essay.personnelCosts || []).map(p => ({ ...p }));
        const inputs = (essay.inputCosts || []).map(i => ({ ...i }));
        const calibrations = (essay.calibrationCosts || []).map(c => ({ ...c }));

        const subtotalPersonnel = personnel.reduce((sum, p) => sum + (p.totalValue || 0), 0);
        const subtotalInputs = inputs.reduce((sum, i) => sum + (i.totalValue || 0), 0);
        const subtotalCalibration = calibrations.reduce((sum, c) => sum + (c.totalValue || 0), 0);

        return {
            personnelCosts: personnel,
            inputCosts: inputs,
            calibrationCosts: calibrations,
            subtotalPersonnel,
            subtotalInputs,
            subtotalCalibration,
            responsibleUserName: essay.responsibleUser?.name,
            studyName: studyName,
            originalEssayName: essay.name,
            capturedAt: new Date().toISOString()
        };
    };

    const getProposalsForStudy = (study: Study) => {
        if (!proposals) return [];
        return proposals.filter(p => p.items.some(item => 
            (item.type === 'study' && (item.breakdownSnapshot?.studyName === study.name || item.name.includes(study.name))) ||
            (study.essayIds && study.essayIds.includes(item.itemId))
        ));
    };

    const getProposalsForEssay = (essay: Essay) => {
        if (!proposals) return [];
        return proposals.filter(p => p.items.some(item => item.itemId === essay.id || item.name === essay.name || item.breakdownSnapshot?.originalEssayName === essay.name));
    };

    const handleOpenGenerateProposal = (type: 'study' | 'essay', item: Study | Essay, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setGeneratingItem({ type, item });
        setProposalTitle(`Proposta - ${item.name}`);
        setProposalPartnershipId((partnerships && partnerships.length > 0) ? partnerships[0].id : '');
        if (type === 'study') {
            const study = item as Study;
            const initQuants: Record<string, number> = {};
            (study.essayIds || []).forEach(eid => {
                initQuants[eid] = 1;
            });
            setStudyEssayQuantities(initQuants);
        } else {
            setEssayQuantity(1);
        }
    };

    const handleConfirmGenerateProposal = () => {
        if (!generatingItem || !setProposals) return;
        if (!proposalTitle.trim()) {
            alert('Por favor, informe o título da proposta.');
            return;
        }
        if (!proposalPartnershipId) {
            alert('Por favor, selecione uma parceria para vincular a proposta.');
            return;
        }

        const now = new Date().toISOString();
        const userName = currentUser?.name || 'Usuário';
        const proposalItems: ProposalItem[] = [];

        if (generatingItem.type === 'essay') {
            const essay = generatingItem.item as Essay;
            const qty = Math.max(1, essayQuantity);
            proposalItems.push({
                id: uuidv4(),
                type: 'essay',
                itemId: essay.id,
                name: essay.name,
                quantity: qty,
                unitCost: essay.totalCost,
                totalCost: essay.totalCost * qty,
                breakdownSnapshot: createItemCostSnapshot(essay)
            });
        } else {
            const study = generatingItem.item as Study;
            (study.essayIds || []).forEach(essayId => {
                const qty = studyEssayQuantities[essayId] || 0;
                if (qty > 0) {
                    const essay = essays.find(e => e.id === essayId);
                    if (essay) {
                        proposalItems.push({
                            id: uuidv4(),
                            type: 'study',
                            itemId: essayId,
                            name: `${essay.name} (Estudo: ${study.name})`,
                            quantity: qty,
                            unitCost: essay.totalCost,
                            totalCost: essay.totalCost * qty,
                            breakdownSnapshot: createItemCostSnapshot(essay, study.name)
                        });
                    }
                }
            });
        }

        if (proposalItems.length === 0) {
            alert('A proposta precisa conter ao menos 1 item com quantidade maior que zero.');
            return;
        }

        const baseCost = proposalItems.reduce((sum, item) => sum + item.totalCost, 0);
        const safetyMarginPercentage = 20;
        const safetyMarginValue = baseCost * 0.20;
        const profitMarginPercentage = 0;
        const profitMarginValue = 0;
        const taxesPercentage = 0;
        const taxesValue = 0;
        const totalValue = baseCost + safetyMarginValue;

        const newProposalId = uuidv4();
        const newProposal: Proposal = {
            id: newProposalId,
            title: proposalTitle.trim(),
            partnershipId: proposalPartnershipId,
            items: proposalItems,
            totalValue,
            safetyMarginPercentage,
            safetyMarginValue,
            profitMarginPercentage,
            profitMarginValue,
            taxesPercentage,
            taxesValue,
            status: 'Em Elaboração',
            statusChangedAt: now,
            revisionHistory: [{
                id: uuidv4(),
                date: now,
                userName,
                action: `Proposta gerada a partir da precificação "${generatingItem.item.name}". Custo base: ${formatCurrency(baseCost)}, Total: ${formatCurrency(totalValue)}`,
                newStatus: 'Em Elaboração'
            }],
            createdAt: now,
            updatedAt: now
        };

        setProposals(prev => [newProposal, ...prev]);

        if (addHistoryEntry && proposalPartnershipId) {
            addHistoryEntry(
                proposalPartnershipId,
                `Proposta "${newProposal.title}" gerada a partir da precificação "${generatingItem.item.name}". Valor Total: ${formatCurrency(totalValue)}`,
                `#proposal-${newProposal.id}`
            );
        }

        const itemName = generatingItem.item.name;
        setGeneratingItem(null);
        setToastNotification({
            title: 'Proposta Gerada com Sucesso!',
            message: `A proposta "${newProposal.title}" foi criada com valor congelado de ${formatCurrency(totalValue)}. A precificação original "${itemName}" permanece intacta no catálogo e pode gerar novas propostas.`,
            proposalId: newProposalId
        });
    };

    const filteredStudies = useMemo(() => {
        let result = (studies || []).map(s => {
            const studyEssays = (s.essayIds || []).map(id => (essays || []).find(e => e.id === id)).filter(Boolean) as Essay[];
            const totalCost = studyEssays.reduce((sum, e) => sum + e.totalCost, 0);
            return { ...s, totalCost };
        });
        
        if (studyFilter !== 'all') {
            result = result.filter(s => s.id === studyFilter);
        }

        if (responsibleFilter !== 'all') {
            result = result.filter(s => {
                const studyEssays = (s.essayIds || []).map(id => essays.find(e => e.id === id)).filter(Boolean) as Essay[];
                return studyEssays.some(e => e.responsibleUser?.id === responsibleFilter);
            });
        }

        return result;
    }, [studies, essays, studyFilter, responsibleFilter]);

    const filteredEssays = useMemo(() => {
        let result = essays || [];
        if (responsibleFilter !== 'all') {
            result = result.filter(e => e.responsibleUser?.id === responsibleFilter);
        }
        return result;
    }, [essays, responsibleFilter]);

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <div className="flex-none p-6 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-teal-900">Ensaios/Atividades</h1>
                        <p className="text-sm text-gray-500">Mapeamento de estudos e custos para desenvolvimento de vacinas</p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleAddEssay}
                            className="flex items-center px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Novo Ensaio
                        </button>
                        <button
                            onClick={handleAddStudy}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Novo Estudo
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* List View - Full Screen when no selection */}
                <div className={`flex-1 bg-white flex flex-col overflow-hidden transition-all duration-300 ${
                    (selectedStudyId || selectedEssayId) ? 'hidden' : 'block'
                }`}>
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-teal-900">Precificação</h2>
                            <p className="text-sm text-gray-500">Catálogo permanente de custos de estudos e ensaios</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-200 p-1 rounded-lg">
                                <button
                                    onClick={() => { setActiveTab('studies'); setSelectedStudyId(null); setSelectedEssayId(null); }}
                                    className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${
                                        activeTab === 'studies' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Estudos
                                </button>
                                <button
                                    onClick={() => { setActiveTab('essays'); setSelectedStudyId(null); setSelectedEssayId(null); }}
                                    className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${
                                        activeTab === 'essays' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Ensaios/Atividades
                                </button>
                            </div>
                            
                            <button 
                                onClick={activeTab === 'studies' ? handleAddStudy : handleAddEssay}
                                className="flex items-center px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                {activeTab === 'studies' ? "Novo Estudo" : "Novo Ensaio"}
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-b border-teal-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-teal-900 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold shadow-xs">
                                <ClipboardListIcon className="w-5 h-5" />
                            </span>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-teal-950 text-sm">Catálogo Permanente & Reutilizável:</span>
                                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">Independência Total</span>
                                </div>
                                <p className="text-teal-800 text-xs">
                                    ✓ <strong>A precificação permanece intacta</strong> no catálogo após gerar propostas. &nbsp;|&nbsp;
                                    ✓ <strong>Uma mesma precificação pode gerar várias propostas</strong> para diferentes parceiros ou volumes. &nbsp;|&nbsp;
                                    ✓ <strong>A proposta NÃO altera seu valor</strong> se esta precificação for alterada posteriormente (valores congelados).
                                </p>
                            </div>
                        </div>
                        {onNavigateToProposals && (
                            <button
                                onClick={onNavigateToProposals}
                                className="shrink-0 px-3.5 py-1.5 bg-white border border-teal-300 hover:bg-teal-50 text-teal-800 font-bold rounded-lg transition-all shadow-xs text-xs flex items-center"
                            >
                                <CalculatorIcon className="w-3.5 h-3.5 mr-1 text-teal-600" />
                                Ver Propostas Emitidas ({proposals?.length || 0})
                            </button>
                        )}
                    </div>

                    <div className="p-6 bg-white border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="max-w-md w-full relative">
                            <input
                                type="text"
                                placeholder={`Buscar ${activeTab === 'studies' ? 'estudo' : 'ensaio'}...`}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3.5 top-3 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                            {/* Responsible Filter */}
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Responsável:</label>
                                <select
                                    value={responsibleFilter}
                                    onChange={(e) => setResponsibleFilter(e.target.value)}
                                    className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">Todos os Responsáveis</option>
                                    {researchers.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                                <button
                                    onClick={() => setPricingViewMode('grid')}
                                    className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        pricingViewMode === 'grid' ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Visualização em Quadro"
                                >
                                    <CollectionIcon className="w-4 h-4 mr-1" />
                                    Quadro
                                </button>
                                <button
                                    onClick={() => setPricingViewMode('list')}
                                    className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        pricingViewMode === 'list' ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Visualização em Lista"
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                    Lista
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
                        {pricingViewMode === 'grid' ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {activeTab === 'studies' ? (
                                    (filteredStudies || []).map(study => {
                                        const studyProposals = getProposalsForStudy(study);
                                        return (
                                            <div
                                                key={study.id}
                                                onClick={() => setSelectedStudyId(study.id)}
                                                className="group bg-white p-6 rounded-2xl border border-gray-200 text-left transition-all hover:shadow-xl hover:border-teal-200 flex flex-col h-full cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                                        <CalculatorIcon className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                        <button 
                                                            onClick={() => handleEditStudy(study.id, study.name)}
                                                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                            title="Editar nome do estudo"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteStudy(study.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Excluir estudo"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">{study.name}</h3>
                                                
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                                    <span>{study.essayIds?.length || 0} ensaio(s)</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        studyProposals.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {studyProposals.length > 0 ? `${studyProposals.length} proposta(s)` : '0 propostas'}
                                                    </span>
                                                </div>

                                                <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custo Total</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-2xl font-black text-teal-600">{formatCurrency(study.totalCost)}</span>
                                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                            <ChevronRightIcon className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action to Generate Proposal */}
                                                <button
                                                    onClick={(e) => handleOpenGenerateProposal('study', study, e)}
                                                    className="mt-3 w-full py-2 px-3 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-transparent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                                    title="Gerar Proposta Comercial a partir deste estudo (a precificação permanecerá intacta)"
                                                >
                                                    <DocumentAddIcon className="w-4 h-4" />
                                                    Gerar Proposta
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    (filteredEssays || []).map(essay => {
                                        const essayProposals = getProposalsForEssay(essay);
                                        return (
                                            <div
                                                key={essay.id}
                                                onClick={() => setSelectedEssayId(essay.id)}
                                                className="group bg-white p-6 rounded-2xl border border-gray-200 text-left transition-all hover:shadow-xl hover:border-teal-200 flex flex-col h-full cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                        <UserCircleIcon className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                        <button 
                                                            onClick={() => handleEditEssay(essay.id, essay.name)}
                                                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                            title="Editar nome do ensaio"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteEssay(essay.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Excluir ensaio"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-orange-700 transition-colors">{essay.name}</h3>
                                                
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                                    <span className="truncate max-w-[130px]">{essay.responsibleUser?.name || 'Sem responsável'}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        essayProposals.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {essayProposals.length > 0 ? `${essayProposals.length} proposta(s)` : '0 propostas'}
                                                    </span>
                                                </div>

                                                <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custo Unitário</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-2xl font-black text-teal-600">{formatCurrency(essay.totalCost)}</span>
                                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                                            <ChevronRightIcon className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action to Generate Proposal */}
                                                <button
                                                    onClick={(e) => handleOpenGenerateProposal('essay', essay, e)}
                                                    className="mt-3 w-full py-2 px-3 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-transparent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                                    title="Gerar Proposta Comercial a partir deste ensaio (a precificação permanecerá intacta)"
                                                >
                                                    <DocumentAddIcon className="w-4 h-4" />
                                                    Gerar Proposta
                                                </button>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Empty State */}
                                {((activeTab === 'studies' && filteredStudies.length === 0) || (activeTab === 'essays' && filteredEssays.length === 0)) && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                            <CalculatorIcon className="w-10 h-10 text-gray-300" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-600">Nenhum item encontrado</p>
                                        <p className="text-gray-400 mt-1">Tente ajustar sua busca ou adicionar um novo item.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* LIST / TABLE VIEW */
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700 border-b border-gray-200 font-bold uppercase tracking-wider">
                                            <th className="px-4 py-3">Nome do {activeTab === 'studies' ? 'Estudo' : 'Ensaio'}</th>
                                            {activeTab === 'essays' && <th className="px-4 py-3">Responsável</th>}
                                            <th className="px-4 py-3 text-right">Custo Total</th>
                                            <th className="px-4 py-3 text-center">Última Alteração</th>
                                            <th className="px-4 py-3 text-center">Propostas Geradas</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-800">
                                        {activeTab === 'studies' ? (
                                            filteredStudies.map(study => {
                                                const studyProposals = getProposalsForStudy(study);
                                                return (
                                                    <tr 
                                                        key={study.id} 
                                                        onClick={() => setSelectedStudyId(study.id)}
                                                        className="hover:bg-teal-50/60 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-4 py-3 font-bold text-gray-900">
                                                            {study.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-black text-teal-700">
                                                            {formatCurrency(study.totalCost)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500 font-mono">
                                                            {study.essayIds?.length || 0} ensaio(s) vinculados
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                studyProposals.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {studyProposals.length > 0 ? `${studyProposals.length} vinculada(s)` : '0 vinculadas'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => handleOpenGenerateProposal('study', study, e)}
                                                                className="px-2 py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-transparent rounded font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                                                                title="Gerar Proposta a partir deste estudo"
                                                            >
                                                                <DocumentAddIcon className="w-3.5 h-3.5" />
                                                                Proposta
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditStudy(study.id, study.name)}
                                                                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                                                                title="Editar nome"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteStudy(study.id)}
                                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                                title="Excluir"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            filteredEssays.map(essay => {
                                                const essayProposals = getProposalsForEssay(essay);
                                                return (
                                                    <tr 
                                                        key={essay.id} 
                                                        onClick={() => setSelectedEssayId(essay.id)}
                                                        className="hover:bg-orange-50/60 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-4 py-3 font-bold text-gray-900">
                                                            {essay.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 font-medium">
                                                            {essay.responsibleUser?.name || 'Sem responsável'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-black text-teal-700">
                                                            {formatCurrency(essay.totalCost)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500 font-mono">
                                                            {formatDate(essay.updatedAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                essayProposals.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {essayProposals.length > 0 ? `${essayProposals.length} vinculada(s)` : '0 vinculadas'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => handleOpenGenerateProposal('essay', essay, e)}
                                                                className="px-2 py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-transparent rounded font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                                                                title="Gerar Proposta a partir deste ensaio"
                                                            >
                                                                <DocumentAddIcon className="w-3.5 h-3.5" />
                                                                Proposta
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditEssay(essay.id, essay.name)}
                                                                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                                                                title="Editar nome"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteEssay(essay.id)}
                                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                                title="Excluir"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details View - Full Screen when selection exists */}
                <div className={`flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 transition-all duration-300 ${
                    (selectedStudyId || selectedEssayId) ? 'block' : 'hidden'
                }`}>
                    {(selectedStudyId || selectedEssayId) && (
                        <button 
                            onClick={() => { setSelectedStudyId(null); setSelectedEssayId(null); }}
                            className="mb-8 flex items-center text-teal-600 hover:text-teal-800 font-bold transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center mr-3 group-hover:border-teal-200 group-hover:bg-teal-50 transition-all">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </div>
                            Voltar para a lista
                        </button>
                    )}

                    {selectedStudy && !selectedEssay ? (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-teal-900">{selectedStudy.name}</h2>
                                    <p className="text-sm text-gray-500 mt-1">Resumo dos ensaios e atividades mapeados</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Custo Total do Estudo</p>
                                        <p className="text-3xl font-bold text-teal-600">{formatCurrency(selectedStudy.totalCost)}</p>
                                    </div>
                                    <button
                                        onClick={(e) => handleOpenGenerateProposal('study', selectedStudy, e)}
                                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-xs flex items-center transition-all"
                                        title="Gerar Proposta Comercial a partir deste estudo"
                                    >
                                        <DocumentAddIcon className="w-4 h-4 mr-1.5" />
                                        Gerar Proposta
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Ensaios e Atividades</h3>
                                    <button 
                                        onClick={() => setIsSelectingEssays(true)}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1" /> Vincular Ensaios
                                    </button>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Nome do Ensaio</th>
                                                <th className="px-6 py-3">Responsável</th>
                                                <th className="px-6 py-3">Última Alteração</th>
                                                <th className="px-6 py-3 text-right">Custo Total (R$)</th>
                                                <th className="px-6 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(studyEssays || [])
                                                .filter(e => responsibleFilter === 'all' || e.responsibleUser?.id === responsibleFilter)
                                                .map(essay => (
                                                <tr 
                                                    key={essay.id} 
                                                    className="hover:bg-teal-50 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedEssayId(essay.id)}
                                                >
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {essay.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {essay.responsibleUser?.name || <span className="text-gray-300 italic">Não definido</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {formatDate(essay.updatedAt || essay.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-teal-700">
                                                        {formatCurrency(essay.totalCost)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                                                    </td>
                                                </tr>
                                            ))}
                                            {studyEssays.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                                        Nenhum ensaio vinculado a este estudo.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Propostas Comerciais Geradas a partir deste Estudo */}
                            {(() => {
                                const linkedProposals = getProposalsForStudy(selectedStudy);
                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 bg-teal-50/60 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-teal-950 flex items-center gap-2">
                                                    <ClipboardListIcon className="w-5 h-5 text-teal-600" />
                                                    Propostas Comerciais Geradas a partir deste Estudo
                                                    <span className="px-2 py-0.5 text-xs font-black bg-teal-200 text-teal-900 rounded-full">
                                                        {linkedProposals.length}
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-teal-800 mt-0.5">
                                                    🔒 <strong>Imutabilidade garantida:</strong> Cada proposta gravou seu snapshot de custos no momento da emissão. Alterações futuras neste estudo ou em seus ensaios não alteram o valor dessas propostas.
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleOpenGenerateProposal('study', selectedStudy, e)}
                                                className="shrink-0 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center transition-all"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                                Nova Proposta com este Estudo
                                            </button>
                                        </div>

                                        {linkedProposals.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-3">Título da Proposta</th>
                                                            <th className="px-6 py-3">Parceria / Cliente</th>
                                                            <th className="px-6 py-3">Data de Emissão</th>
                                                            <th className="px-6 py-3">Status</th>
                                                            <th className="px-6 py-3 text-right">Valor Congelado</th>
                                                            <th className="px-6 py-3 text-center">Proteção</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 text-gray-800">
                                                        {linkedProposals.map(prop => {
                                                            const partner = partnerships?.find(p => p.id === prop.partnershipId);
                                                            return (
                                                                <tr key={prop.id} className="hover:bg-teal-50/40 transition-colors">
                                                                    <td className="px-6 py-3.5 font-bold text-gray-900">
                                                                        {prop.title}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-gray-600">
                                                                        {partner?.companyName || 'Sem parceria'}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-gray-500 font-mono">
                                                                        {formatDate(prop.createdAt)}
                                                                    </td>
                                                                    <td className="px-6 py-3.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            prop.status === 'Aprovada' ? 'bg-green-100 text-green-800' :
                                                                            prop.status === 'Recusada' ? 'bg-red-100 text-red-800' :
                                                                            prop.status === 'Enviada' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-amber-100 text-amber-800'
                                                                        }`}>
                                                                            {prop.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-right font-black text-teal-700">
                                                                        {formatCurrency(prop.totalValue)}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-center">
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium" title="Custos e itens protegidos por snapshot">
                                                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                                            Snapshot Ativo
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                <ClipboardListIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                <p className="font-medium text-sm text-gray-700">Nenhuma proposta gerada a partir deste estudo ainda.</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Clique no botão acima para gerar a primeira proposta mantendo este estudo intacto.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : selectedEssay ? (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedEssay.name}</h2>
                                    <div className="flex items-center mt-2 text-sm text-gray-500 space-x-6">
                                        <div className="flex items-center">
                                            <UserCircleIcon className="w-4 h-4 mr-2" />
                                            <span className="mr-2">Responsável:</span>
                                            <select
                                                className="bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-teal-700 cursor-pointer"
                                                value={selectedEssay.responsibleUser?.id || ''}
                                                onChange={(e) => {
                                                    const user = researchers.find(u => u.id === e.target.value);
                                                    updateEssayCosts(selectedEssayId!, { responsibleUser: user });
                                                    addEssayAuditEntry(selectedEssayId!, 'Geral', `Responsável alterado para "${user?.name || 'Sem responsável'}"`);
                                                }}
                                            >
                                                <option value="">Selecione um responsável...</option>
                                                {researchers.map(user => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center text-gray-400">
                                            <span className="mr-2">Inclusão:</span>
                                            <span className="font-medium">{formatDate(selectedEssay.createdAt)}</span>
                                        </div>
                                        {selectedEssay.updatedAt && selectedEssay.updatedAt !== selectedEssay.createdAt && (
                                            <div className="flex items-center text-gray-400">
                                                <span className="mr-2">Última Alteração:</span>
                                                <span className="font-medium">{formatDate(selectedEssay.updatedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Custo Total do Ensaio</p>
                                        <p className="text-3xl font-bold text-teal-600">{formatCurrency(selectedEssay.totalCost)}</p>
                                    </div>
                                    <button
                                        onClick={(e) => handleOpenGenerateProposal('essay', selectedEssay, e)}
                                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-xs flex items-center transition-all"
                                        title="Gerar Proposta Comercial a partir deste ensaio"
                                    >
                                        <DocumentAddIcon className="w-4 h-4 mr-1.5" />
                                        Gerar Proposta
                                    </button>
                                </div>
                            </div>

                            {/* Personnel Costs */}
                            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center">
                                        <span className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mr-3 text-sm">01</span>
                                        Recursos Humanos (Dedicação)
                                    </h3>
                                    <button 
                                        onClick={handleAddPersonnel}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Pessoa
                                    </button>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Cargo (Bolsa)</th>
                                                <th className="px-6 py-3">Valor da Bolsa (R$)</th>
                                                <th className="px-6 py-3">Horas Dedicação</th>
                                                <th className="px-6 py-3">Total (R$)</th>
                                                <th className="px-6 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(selectedEssay.personnelCosts || []).map(cost => (
                                                <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <select
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-teal-700 cursor-pointer"
                                                            value={cost.personName}
                                                            onChange={(e) => {
                                                                const selectedCargo = e.target.value;
                                                                const bolsa = systemSettings.bolsas?.find(b => b.cargo === selectedCargo);
                                                                if (bolsa) {
                                                                    const val = bolsa.valorBolsa;
                                                                    const cargaHoraria = bolsa.cargaHoraria || 160;
                                                                    const total = (val / cargaHoraria) * cost.dedicationHours;
                                                                    const updated = (selectedEssay.personnelCosts || []).map(c => 
                                                                        c.id === cost.id ? { ...c, personName: selectedCargo, monthlyValue: val, totalValue: total } : c
                                                                    );
                                                                    updateEssayCosts(selectedEssayId!, { personnelCosts: updated });
                                                                } else {
                                                                    const updated = (selectedEssay.personnelCosts || []).map(c => 
                                                                        c.id === cost.id ? { ...c, personName: selectedCargo, monthlyValue: 0, totalValue: 0 } : c
                                                                    );
                                                                    updateEssayCosts(selectedEssayId!, { personnelCosts: updated });
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Selecione um cargo...</option>
                                                            {systemSettings.bolsas?.map(b => (
                                                                <option key={b.id} value={b.cargo}>{b.cargo}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500">
                                                        {formatCurrency(cost.monthlyValue)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            value={cost.dedicationHours || ''}
                                                            onChange={(e) => {
                                                                const hours = parseFloat(e.target.value) || 0;
                                                                const bolsa = systemSettings.bolsas?.find(b => b.cargo === cost.personName);
                                                                const val = bolsa?.valorBolsa || 0;
                                                                const cargaHoraria = bolsa?.cargaHoraria || 160;
                                                                const total = (val / cargaHoraria) * hours;
                                                                
                                                                const updated = (selectedEssay.personnelCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, dedicationHours: hours, totalValue: total } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { personnelCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 font-bold text-teal-700">
                                                        {formatCurrency(cost.totalValue)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <button 
                                                            onClick={() => {
                                                                const updated = (selectedEssay.personnelCosts || []).filter(c => c.id !== cost.id);
                                                                updateEssayCosts(selectedEssayId!, { personnelCosts: updated });
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(selectedEssay.personnelCosts || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                                                        Nenhum recurso humano adicionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Input Costs */}
                            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center">
                                        <span className="w-8 h-8 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center mr-3 text-sm">02</span>
                                        Insumos e Materiais
                                    </h3>
                                    <button 
                                        onClick={handleAddInput}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Insumo
                                    </button>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Descrição</th>
                                                <th className="px-6 py-3">Valor Unitário (R$)</th>
                                                <th className="px-6 py-3">Quantidade</th>
                                                <th className="px-6 py-3">Total (R$)</th>
                                                <th className="px-6 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(selectedEssay.inputCosts || []).map(cost => (
                                                <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            placeholder="Ex: Reagente X"
                                                            value={cost.description}
                                                            onChange={(e) => {
                                                                const updated = (selectedEssay.inputCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, description: e.target.value } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { inputCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            value={cost.unitValue || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const updated = (selectedEssay.inputCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, unitValue: val, totalValue: val * c.quantity } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { inputCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            value={cost.quantity || ''}
                                                            onChange={(e) => {
                                                                const qty = parseFloat(e.target.value) || 0;
                                                                const updated = (selectedEssay.inputCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, quantity: qty, totalValue: c.unitValue * qty } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { inputCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 font-bold text-teal-700">
                                                        {formatCurrency(cost.totalValue)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <button 
                                                            onClick={() => {
                                                                const updated = (selectedEssay.inputCosts || []).filter(c => c.id !== cost.id);
                                                                updateEssayCosts(selectedEssayId!, { inputCosts: updated });
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(selectedEssay.inputCosts || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                                                        Nenhum insumo adicionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Calibration Costs */}
                            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center">
                                        <span className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center mr-3 text-sm">03</span>
                                        Calibração de Equipamentos
                                    </h3>
                                    <button 
                                        onClick={handleAddCalibration}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Equipamento
                                    </button>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Equipamento</th>
                                                <th className="px-6 py-3">Valor Calibração (R$)</th>
                                                <th className="px-6 py-3">Quantidade</th>
                                                <th className="px-6 py-3">Total (R$)</th>
                                                <th className="px-6 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(selectedEssay.calibrationCosts || []).map(cost => (
                                                <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            placeholder="Ex: Centrífuga"
                                                            value={cost.equipmentName}
                                                            onChange={(e) => {
                                                                const updated = (selectedEssay.calibrationCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, equipmentName: e.target.value } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { calibrationCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            value={cost.value || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const updated = (selectedEssay.calibrationCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, value: val, totalValue: val * c.quantity } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { calibrationCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                            value={cost.quantity || ''}
                                                            onChange={(e) => {
                                                                const qty = parseFloat(e.target.value) || 0;
                                                                const updated = (selectedEssay.calibrationCosts || []).map(c => 
                                                                    c.id === cost.id ? { ...c, quantity: qty, totalValue: c.value * qty } : c
                                                                );
                                                                updateEssayCosts(selectedEssayId!, { calibrationCosts: updated });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 font-bold text-teal-700">
                                                        {formatCurrency(cost.totalValue)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <button 
                                                            onClick={() => {
                                                                const updated = (selectedEssay.calibrationCosts || []).filter(c => c.id !== cost.id);
                                                                updateEssayCosts(selectedEssayId!, { calibrationCosts: updated });
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(selectedEssay.calibrationCosts || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                                                        Nenhuma calibração adicionada.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* External Quote / Market Value Section */}
                            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center">
                                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3 text-sm">04</span>
                                        Valor de Mercado (Cotação Externa)
                                    </h3>
                                    {selectedEssay.externalQuoteFile && (
                                        <button
                                            onClick={() => handleRemoveExternalQuote(selectedEssay.id)}
                                            className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Remover Anexo
                                        </button>
                                    )}
                                </div>
                                <div className="p-6">
                                    {selectedEssay.externalQuoteFile ? (
                                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-3 bg-teal-100 text-teal-700 rounded-lg flex-shrink-0">
                                                    <CollectionIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 break-all">{selectedEssay.externalQuoteFile.fileName}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Data de inclusão: <span className="font-semibold text-gray-700">{formatDate(selectedEssay.externalQuoteFile.uploadedAt)}</span>
                                                    </p>
                                                    <p className="text-xs text-teal-700 mt-0.5 font-medium">Pasta: Negócios e Parcerias / Documentos / cotação externa de serviços</p>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedEssay.externalQuoteFile.webUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                            >
                                                <CollectionIcon className="w-4 h-4 mr-2" />
                                                Acessar Arquivo
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors bg-gray-50/50">
                                            <CollectionIcon className="mx-auto h-10 w-10 text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-700 font-medium">Nenhum anexo com valor de mercado adicionado para este ensaio.</p>
                                            <p className="text-xs text-gray-400 mb-4">O arquivo será salvo no SharePoint em "Negócios e Parcerias/Documentos/cotação externa de serviços"</p>
                                            <label className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
                                                {isUploadingQuote ? 'Enviando e Salvando...' : 'Anexar Cotação Externa (Valor de Mercado)'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleUploadExternalQuote}
                                                    disabled={isUploadingQuote}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Audit Trail Section for Pricing Adjustments */}
                            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <h3 className="font-bold text-gray-800 flex items-center">
                                        <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mr-3 text-sm">05</span>
                                        Histórico de Registro de Alterações nos Itens do Orçamento
                                    </h3>
                                </div>
                                <div className="p-6">
                                    {selectedEssay.history && selectedEssay.history.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs text-gray-600">
                                                <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-3">Data e Hora</th>
                                                        <th className="px-4 py-3">Usuário que fez o ajuste</th>
                                                        <th className="px-4 py-3">Categoria</th>
                                                        <th className="px-4 py-3">Registro da Alteração / Ajuste</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {selectedEssay.history.map(entry => (
                                                        <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                                                                {new Date(entry.date).toLocaleString('pt-BR')}
                                                            </td>
                                                            <td className="px-4 py-3 font-semibold text-gray-800">
                                                                {entry.userName}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                                    entry.category === 'Recursos Humanos' ? 'bg-amber-100 text-amber-800' :
                                                                    entry.category === 'Insumos' ? 'bg-blue-100 text-blue-800' :
                                                                    entry.category === 'Calibração' ? 'bg-indigo-100 text-indigo-800' :
                                                                    entry.category === 'Cotação Externa' ? 'bg-teal-100 text-teal-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {entry.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-800 font-medium">
                                                                {entry.action}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-xs italic text-center py-4">Nenhum registro de alteração para este ensaio até o momento.</p>
                                    )}
                                </div>
                            </section>
                                    {/* Propostas Comerciais Geradas com este Ensaio */}
                            {(() => {
                                const linkedProposals = getProposalsForEssay(selectedEssay);
                                return (
                                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 bg-teal-50/60 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-teal-950 flex items-center gap-2">
                                                    <ClipboardListIcon className="w-5 h-5 text-teal-600" />
                                                    Propostas Comerciais Geradas com este Ensaio
                                                    <span className="px-2 py-0.5 text-xs font-black bg-teal-200 text-teal-900 rounded-full">
                                                        {linkedProposals.length}
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-teal-800 mt-0.5">
                                                    🔒 <strong>Imutabilidade garantida:</strong> Cada proposta armazena o detalhamento de custos (RH, Insumos, Calibrações) de forma congelada. Edições posteriores neste ensaio não afetam o valor já contratado.
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleOpenGenerateProposal('essay', selectedEssay, e)}
                                                className="shrink-0 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center transition-all"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                                Nova Proposta com este Ensaio
                                            </button>
                                        </div>

                                        {linkedProposals.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-3">Título da Proposta</th>
                                                            <th className="px-6 py-3">Parceria / Cliente</th>
                                                            <th className="px-6 py-3">Data de Emissão</th>
                                                            <th className="px-6 py-3">Status</th>
                                                            <th className="px-6 py-3 text-right">Valor Congelado</th>
                                                            <th className="px-6 py-3 text-center">Proteção</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 text-gray-800">
                                                        {linkedProposals.map(prop => {
                                                            const partner = partnerships?.find(p => p.id === prop.partnershipId);
                                                            return (
                                                                <tr key={prop.id} className="hover:bg-teal-50/40 transition-colors">
                                                                    <td className="px-6 py-3.5 font-bold text-gray-900">
                                                                        {prop.title}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-gray-600">
                                                                        {partner?.companyName || 'Sem parceria'}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-gray-500 font-mono">
                                                                        {formatDate(prop.createdAt)}
                                                                    </td>
                                                                    <td className="px-6 py-3.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            prop.status === 'Aprovada' ? 'bg-green-100 text-green-800' :
                                                                            prop.status === 'Recusada' ? 'bg-red-100 text-red-800' :
                                                                            prop.status === 'Enviada' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-amber-100 text-amber-800'
                                                                        }`}>
                                                                            {prop.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-right font-black text-teal-700">
                                                                        {formatCurrency(prop.totalValue)}
                                                                    </td>
                                                                    <td className="px-6 py-3.5 text-center">
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium" title="Custos e itens protegidos por snapshot">
                                                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                                            Snapshot Ativo
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                <ClipboardListIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                <p className="font-medium text-sm text-gray-700">Nenhuma proposta gerada a partir deste ensaio até o momento.</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Você pode gerar múltiplas propostas utilizando este ensaio a qualquer momento.
                                                </p>
                                            </div>
                                        )}
                                    </section>
                                );
                            })()}
                        </div>
                    ) : null}
                </div>

                {/* Essay Selection Modal */}
                {isSelectingEssays && selectedStudy && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-teal-900">Vincular Ensaios</h3>
                                    <p className="text-sm text-gray-500">Selecione os ensaios da lista de Ensaios/Atividades para o estudo {selectedStudy.name}</p>
                                </div>
                                <button 
                                    onClick={() => setIsSelectingEssays(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <PlusIcon className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-2">
                                    {(essays || []).map(essay => {
                                        const isSelected = (selectedStudy.essayIds || []).includes(essay.id);
                                        return (
                                            <button
                                                key={essay.id}
                                                onClick={() => handleToggleEssayInStudy(essay.id)}
                                                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                                                    isSelected 
                                                        ? 'bg-teal-50 border-teal-200 text-teal-900' 
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-teal-200'
                                                }`}
                                            >
                                                <div className="flex items-center">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                                        isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <PlusIcon className="w-3 h-3" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold">{essay.name}</p>
                                                        <p className="text-xs text-gray-500">{essay.responsibleUser?.name || 'Sem responsável'}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold">{formatCurrency(essay.totalCost)}</span>
                                            </button>
                                        );
                                    })}
                                    {essays.length === 0 && (
                                        <div className="text-center py-12 text-gray-400 italic">
                                            Nenhum ensaio cadastrado na lista de Ensaios/Atividades.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setIsSelectingEssays(false)}
                                    className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors"
                                >
                                    Concluído
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generate Proposal Modal */}
                {generatingItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
                            {/* Modal Header */}
                            <div className="px-6 py-5 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <DocumentAddIcon className="w-6 h-6 text-teal-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Gerar Proposta Comercial</h3>
                                        <p className="text-xs text-teal-200">
                                            Criar proposta a partir de: <span className="font-bold text-white">{generatingItem.item.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setGeneratingItem(null)}
                                    className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Informational Guarantee Banner */}
                            <div className="px-6 py-3 bg-teal-50 border-b border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
                                <CheckCircleIcon className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-teal-950">Garantias de Imutabilidade e Reutilização:</p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-teal-800">
                                        <li><strong>A precificação permanece intacta no catálogo</strong> e você poderá gerar quantas propostas quiser a partir dela.</li>
                                        <li><strong>A proposta congelará os valores (snapshot)</strong>: alterações futuras nos custos de insumos, RH ou ensaios NÃO afetarão o valor desta proposta.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Título da Proposta <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={proposalTitle}
                                        onChange={(e) => setProposalTitle(e.target.value)}
                                        placeholder="Ex: Proposta Técnica Comercial - Ensaio de Eficácia"
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Parceria / Cliente Destinatário <span className="text-red-500">*</span>
                                    </label>
                                    {partnerships && partnerships.length > 0 ? (
                                        <select
                                            value={proposalPartnershipId}
                                            onChange={(e) => setProposalPartnershipId(e.target.value)}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                                        >
                                            <option value="">Selecione uma parceria / empresa...</option>
                                            {partnerships.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.companyName} {p.projectTitle ? `— ${p.projectTitle}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                            Nenhuma parceria cadastrada. Cadastre uma parceria na aba "Parcerias" ou utilize um identificador temporário.
                                        </div>
                                    )}
                                </div>

                                {/* Items / Quantities Configuration */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            {generatingItem.type === 'study' ? 'Ensaios deste Estudo a Incluir' : 'Quantidade do Ensaio'}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">Valores base do catálogo</span>
                                    </div>

                                    {generatingItem.type === 'essay' ? (
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{(generatingItem.item as Essay).name}</p>
                                                <p className="text-xs text-gray-500">Custo Unitário: {formatCurrency((generatingItem.item as Essay).totalCost)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-600 font-bold">Quantidade:</span>
                                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEssayQuantity(prev => Math.max(1, prev - 1))}
                                                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={essayQuantity}
                                                        onChange={(e) => setEssayQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-14 text-center py-1 text-sm font-bold border-none outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEssayQuantity(prev => prev + 1)}
                                                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="font-black text-teal-700 text-sm w-28 text-right">
                                                    {formatCurrency((generatingItem.item as Essay).totalCost * essayQuantity)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                                            {((generatingItem.item as Study).essayIds || []).map(eid => {
                                                const essay = essays.find(e => e.id === eid);
                                                if (!essay) return null;
                                                const qty = studyEssayQuantities[eid] || 0;
                                                return (
                                                    <div key={eid} className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                                                        <div className="max-w-xs">
                                                            <p className="font-bold text-gray-900 text-xs">{essay.name}</p>
                                                            <p className="text-[11px] text-gray-500">Unitário: {formatCurrency(essay.totalCost)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStudyEssayQuantities(prev => ({ ...prev, [eid]: Math.max(0, (prev[eid] || 0) - 1) }))}
                                                                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={qty}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                        setStudyEssayQuantities(prev => ({ ...prev, [eid]: val }));
                                                                    }}
                                                                    className="w-12 text-center py-0.5 text-xs font-bold border-none outline-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStudyEssayQuantities(prev => ({ ...prev, [eid]: (prev[eid] || 0) + 1 }))}
                                                                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                            <span className="font-black text-teal-700 text-xs w-24 text-right">
                                                                {formatCurrency(essay.totalCost * qty)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {((generatingItem.item as Study).essayIds || []).length === 0 && (
                                                <div className="p-4 text-center text-xs text-gray-400 italic">
                                                    Este estudo ainda não possui ensaios vinculados.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Financial Preview */}
                                {(() => {
                                    let calcBase = 0;
                                    if (generatingItem.type === 'essay') {
                                        calcBase = (generatingItem.item as Essay).totalCost * Math.max(1, essayQuantity);
                                    } else {
                                        const study = generatingItem.item as Study;
                                        (study.essayIds || []).forEach(eid => {
                                            const essay = essays.find(e => e.id === eid);
                                            const qty = studyEssayQuantities[eid] || 0;
                                            if (essay) calcBase += essay.totalCost * qty;
                                        });
                                    }
                                    const safety = calcBase * 0.20;
                                    const total = calcBase + safety;

                                    return (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-500">
                                                    Custo Base ({formatCurrency(calcBase)}) + Margem de Segurança 20% ({formatCurrency(safety)})
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Valores poderão ser revisados e ajustados na visualização de Propostas.
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valor Inicial da Proposta</span>
                                                <span className="text-2xl font-black text-teal-700">{formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setGeneratingItem(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmGenerateProposal}
                                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Gerar Proposta & Congelar Valores
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toastNotification && (
                    <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border border-teal-200 rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm text-gray-900">{toastNotification.title}</h4>
                                <p className="text-xs text-gray-600 leading-relaxed">{toastNotification.message}</p>
                                <div className="pt-2 flex items-center gap-2">
                                    {onNavigateToProposals && (
                                        <button
                                            onClick={() => {
                                                setToastNotification(null);
                                                onNavigateToProposals();
                                            }}
                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                                        >
                                            <CalculatorIcon className="w-3.5 h-3.5" />
                                            Ir para Propostas
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setToastNotification(null)}
                                        className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingView;
