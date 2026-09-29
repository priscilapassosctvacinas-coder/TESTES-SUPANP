import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Proposal, ProposalItem, ProposalItemCostBreakdown, Partnership, Essay, Study, User, ProposalStatus, ProposalRevision } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';
import { PlusIcon, TrashIcon, PencilIcon, CalculatorIcon, CollectionIcon, ChevronDownIcon, ChevronRightIcon, XIcon, CopyIcon, EyeIcon } from './Icons';

interface ProposalsViewProps {
    proposals: Proposal[];
    setProposals: React.Dispatch<React.SetStateAction<Proposal[]>>;
    partnerships: Partnership[];
    essays: Essay[];
    studies: Study[];
    currentUser: User;
    addHistoryEntry?: (partnershipId: string, description: string, link?: string) => void;
}

const ProposalsView: React.FC<ProposalsViewProps> = ({ 
    proposals, 
    setProposals, 
    partnerships, 
    essays, 
    studies, 
    currentUser, 
    addHistoryEntry 
}) => {
    const [isAddingProposal, setIsAddingProposal] = useState(false);
    const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
    const [newProposalTitle, setNewProposalTitle] = useState('');
    const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
    const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
    const [safetyMarginPercentage, setSafetyMarginPercentage] = useState(20);
    const [safetyMarginValue, setSafetyMarginValue] = useState(0);
    const [profitMarginPercentage, setProfitMarginPercentage] = useState(0);
    const [profitMarginValue, setProfitMarginValue] = useState(0);
    const [taxesPercentage, setTaxesPercentage] = useState(0);
    const [taxesValue, setTaxesValue] = useState(0);
    const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('Em Elaboração');
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
    const [expandedDetailsProposalId, setExpandedDetailsProposalId] = useState<string | null>(null);
    const [expandedItemDetailKey, setExpandedItemDetailKey] = useState<string | null>(null);
    
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [itemType, setItemType] = useState<'essay' | 'study'>('essay');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [studyEssayQuantities, setStudyEssayQuantities] = useState<Record<string, number>>({});

    const isEditingLoadingRef = useRef(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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

    const baseCost = useMemo(() => {
        return proposalItems.reduce((sum, item) => sum + item.totalCost, 0);
    }, [proposalItems]);

    // Recalculate monetary values automatically when baseCost changes (e.g. items added/removed),
    // but avoid overriding values during the initial load of editing an existing proposal.
    useEffect(() => {
        if (isEditingLoadingRef.current) return;

        const sVal = baseCost * (safetyMarginPercentage / 100);
        setSafetyMarginValue(sVal);

        const baseForProfit = baseCost + sVal;
        const pVal = baseForProfit * (profitMarginPercentage / 100);
        setProfitMarginValue(pVal);

        const netVal = baseCost + sVal + pVal;
        const tVal = taxesPercentage >= 100 ? 0 : netVal * (taxesPercentage / (100 - taxesPercentage));
        setTaxesValue(tVal);
    }, [baseCost]);

    const netValue = useMemo(() => {
        return baseCost + safetyMarginValue + profitMarginValue;
    }, [baseCost, safetyMarginValue, profitMarginValue]);

    const totalValue = useMemo(() => {
        return netValue + taxesValue;
    }, [netValue, taxesValue]);

    const handleSafetyMarginPctChange = (pct: number) => {
        setSafetyMarginPercentage(pct);
        const sVal = baseCost * (pct / 100);
        setSafetyMarginValue(sVal);

        const baseForProfit = baseCost + sVal;
        const pVal = baseForProfit * (profitMarginPercentage / 100);
        setProfitMarginValue(pVal);

        const newNet = baseCost + sVal + pVal;
        const tVal = taxesPercentage >= 100 ? 0 : newNet * (taxesPercentage / (100 - taxesPercentage));
        setTaxesValue(tVal);
    };

    const handleSafetyMarginValChange = (val: number) => {
        setSafetyMarginValue(val);
        const pct = baseCost > 0 ? (val / baseCost) * 100 : 0;
        setSafetyMarginPercentage(Number(pct.toFixed(2)));

        const baseForProfit = baseCost + val;
        const pVal = baseForProfit * (profitMarginPercentage / 100);
        setProfitMarginValue(pVal);

        const newNet = baseCost + val + pVal;
        const tVal = taxesPercentage >= 100 ? 0 : newNet * (taxesPercentage / (100 - taxesPercentage));
        setTaxesValue(tVal);
    };

    const handleProfitMarginPctChange = (pct: number) => {
        setProfitMarginPercentage(pct);
        const baseForProfit = baseCost + safetyMarginValue;
        const pVal = baseForProfit * (pct / 100);
        setProfitMarginValue(pVal);

        const newNet = baseCost + safetyMarginValue + pVal;
        const tVal = taxesPercentage >= 100 ? 0 : newNet * (taxesPercentage / (100 - taxesPercentage));
        setTaxesValue(tVal);
    };

    const handleProfitMarginValChange = (val: number) => {
        setProfitMarginValue(val);
        const baseForProfit = baseCost + safetyMarginValue;
        const pct = baseForProfit > 0 ? (val / baseForProfit) * 100 : 0;
        setProfitMarginPercentage(Number(pct.toFixed(2)));

        const newNet = baseCost + safetyMarginValue + val;
        const tVal = taxesPercentage >= 100 ? 0 : newNet * (taxesPercentage / (100 - taxesPercentage));
        setTaxesValue(tVal);
    };

    const handleTaxesPctChange = (pct: number) => {
        setTaxesPercentage(pct);
        const currentNet = baseCost + safetyMarginValue + profitMarginValue;
        const tVal = pct >= 100 ? 0 : currentNet * (pct / (100 - pct));
        setTaxesValue(tVal);
    };

    const handleTaxesValChange = (val: number) => {
        setTaxesValue(val);
        const currentNet = baseCost + safetyMarginValue + profitMarginValue;
        const grossVal = currentNet + val;
        const pct = grossVal > 0 ? (val / grossVal) * 100 : 0;
        setTaxesPercentage(Number(pct.toFixed(2)));
    };

    const handleSaveProposal = (overrideStatus?: ProposalStatus) => {
        if (!newProposalTitle.trim() || !selectedPartnershipId) {
            alert('Por favor, informe o título da proposta e selecione uma parceria.');
            return;
        }

        const finalStatus = overrideStatus || proposalStatus;
        const now = new Date().toISOString();
        const userName = currentUser?.name || 'Usuário';

        const existingProposal = editingProposalId ? proposals.find(p => p.id === editingProposalId) : null;
        const prevStatus = existingProposal?.status;
        const statusChanged = prevStatus && prevStatus !== finalStatus;

        const revisionEntry: ProposalRevision = {
            id: uuidv4(),
            date: now,
            userName,
            action: editingProposalId 
                ? (statusChanged ? `Status alterado de "${prevStatus}" para "${finalStatus}"` : `Proposta "${newProposalTitle.trim()}" atualizada`)
                : `Proposta criada com status "${finalStatus}"`,
            previousStatus: prevStatus,
            newStatus: finalStatus
        };

        const existingRevisions = existingProposal?.revisionHistory || [];

        // Deep clone items with preserved breakdown snapshots
        const savedItems = proposalItems.map(item => ({
            ...item,
            breakdownSnapshot: item.breakdownSnapshot ? {
                ...item.breakdownSnapshot,
                personnelCosts: item.breakdownSnapshot.personnelCosts.map(p => ({ ...p })),
                inputCosts: item.breakdownSnapshot.inputCosts.map(i => ({ ...i })),
                calibrationCosts: item.breakdownSnapshot.calibrationCosts.map(c => ({ ...c }))
            } : undefined
        }));

        const proposalData: Proposal = {
            id: editingProposalId || uuidv4(),
            title: newProposalTitle.trim(),
            partnershipId: selectedPartnershipId,
            items: savedItems,
            totalValue,
            safetyMarginPercentage,
            safetyMarginValue,
            profitMarginPercentage,
            profitMarginValue,
            taxesPercentage,
            taxesValue,
            status: finalStatus,
            statusChangedAt: statusChanged || !existingProposal ? now : (existingProposal.statusChangedAt || now),
            revisionHistory: [revisionEntry, ...existingRevisions],
            createdAt: existingProposal?.createdAt || now,
            updatedAt: now
        };

        if (editingProposalId) {
            setProposals(prev => prev.map(p => p.id === editingProposalId ? proposalData : p));
        } else {
            setProposals(prev => [proposalData, ...prev]);
        }

        if (addHistoryEntry && selectedPartnershipId) {
            const formattedVal = formatCurrency(totalValue);
            addHistoryEntry(
                selectedPartnershipId,
                `Proposta "${proposalData.title}" salva (${finalStatus}). Valor Total: ${formattedVal}`,
                `#proposal-${proposalData.id}`
            );
        }

        resetForm();
    };

    const handleDuplicateProposal = (proposal: Proposal) => {
        const now = new Date().toISOString();
        const userName = currentUser?.name || 'Usuário';
        const duplicatedTitle = `${proposal.title} (Cópia)`;

        const duplicatedItems: ProposalItem[] = proposal.items.map(item => ({
            ...item,
            id: uuidv4(),
            breakdownSnapshot: item.breakdownSnapshot ? {
                ...item.breakdownSnapshot,
                personnelCosts: item.breakdownSnapshot.personnelCosts.map(p => ({ ...p })),
                inputCosts: item.breakdownSnapshot.inputCosts.map(i => ({ ...i })),
                calibrationCosts: item.breakdownSnapshot.calibrationCosts.map(c => ({ ...c }))
            } : undefined
        }));

        const initialRevision: ProposalRevision = {
            id: uuidv4(),
            date: now,
            userName,
            action: `Proposta duplicada a partir de "${proposal.title}"`,
            newStatus: 'Rascunho'
        };

        const newProposal: Proposal = {
            ...proposal,
            id: uuidv4(),
            title: duplicatedTitle,
            items: duplicatedItems,
            status: 'Rascunho',
            statusChangedAt: now,
            revisionHistory: [initialRevision],
            createdAt: now,
            updatedAt: now
        };

        setProposals(prev => [newProposal, ...prev]);

        if (addHistoryEntry && newProposal.partnershipId) {
            const formattedVal = formatCurrency(newProposal.totalValue);
            addHistoryEntry(
                newProposal.partnershipId,
                `Proposta "${newProposal.title}" duplicada a partir de "${proposal.title}". Valor Total: ${formattedVal}`,
                `#proposal-${newProposal.id}`
            );
        }

        alert(`Proposta duplicada com sucesso como "${duplicatedTitle}"!`);
    };

    const resetForm = () => {
        isEditingLoadingRef.current = false;
        setIsAddingProposal(false);
        setEditingProposalId(null);
        setNewProposalTitle('');
        setSelectedPartnershipId('');
        setProposalItems([]);
        setSafetyMarginPercentage(20);
        setSafetyMarginValue(0);
        setProfitMarginPercentage(0);
        setProfitMarginValue(0);
        setTaxesPercentage(0);
        setTaxesValue(0);
        setProposalStatus('Em Elaboração');
        setIsAddingItem(false);
        setStudyEssayQuantities({});
    };

    const handleEditProposal = (proposal: Proposal) => {
        isEditingLoadingRef.current = true;
        setEditingProposalId(proposal.id);
        setNewProposalTitle(proposal.title);
        setSelectedPartnershipId(proposal.partnershipId);

        // Ensure all items have a snapshot (backfill if missing from older proposals)
        const populatedItems = proposal.items.map(item => {
            if (!item.breakdownSnapshot) {
                const matchEssay = essays.find(e => e.id === item.itemId || e.name === item.name);
                if (matchEssay) {
                    return {
                        ...item,
                        breakdownSnapshot: createItemCostSnapshot(matchEssay)
                    };
                }
            }
            return item;
        });

        setProposalItems(populatedItems);

        const bCost = populatedItems.reduce((sum, item) => sum + item.totalCost, 0);
        const sPct = proposal.safetyMarginPercentage ?? 20;
        const sVal = proposal.safetyMarginValue ?? (bCost * (sPct / 100));
        const baseForProfit = bCost + sVal;

        const pPct = proposal.profitMarginPercentage ?? 0;
        const pVal = proposal.profitMarginValue ?? (baseForProfit * (pPct / 100));

        const netVal = bCost + sVal + pVal;
        const tPct = proposal.taxesPercentage ?? 0;
        const tVal = proposal.taxesValue ?? (tPct >= 100 ? 0 : netVal * (tPct / (100 - tPct)));

        setSafetyMarginPercentage(sPct);
        setSafetyMarginValue(sVal);
        setProfitMarginPercentage(pPct);
        setProfitMarginValue(pVal);
        setTaxesPercentage(tPct);
        setTaxesValue(tVal);

        setProposalStatus(proposal.status);
        setIsAddingProposal(true);

        setTimeout(() => {
            isEditingLoadingRef.current = false;
        }, 100);
    };

    const handleDeleteProposal = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta proposta?')) {
            const proposalToDelete = proposals.find(p => p.id === id);
            setProposals(prev => prev.filter(p => p.id !== id));
            if (proposalToDelete && addHistoryEntry && proposalToDelete.partnershipId) {
                const formattedVal = formatCurrency(proposalToDelete.totalValue);
                addHistoryEntry(
                    proposalToDelete.partnershipId,
                    `Proposta "${proposalToDelete.title}" (Valor: ${formattedVal}, Status: ${proposalToDelete.status}) foi excluída.`
                );
            }
        }
    };

    const handleAddItem = () => {
        if (!selectedItemId) return;

        if (itemType === 'essay') {
            const essay = essays.find(e => e.id === selectedItemId);
            if (essay) {
                const newItem: ProposalItem = {
                    id: uuidv4(),
                    type: 'essay',
                    itemId: selectedItemId,
                    name: essay.name,
                    quantity: itemQuantity,
                    unitCost: essay.totalCost,
                    totalCost: essay.totalCost * itemQuantity,
                    breakdownSnapshot: createItemCostSnapshot(essay)
                };
                setProposalItems(prev => [...prev, newItem]);
            }
        } else {
            const study = studies.find(s => s.id === selectedItemId);
            if (study) {
                const newItems: ProposalItem[] = [];
                Object.entries(studyEssayQuantities).forEach(([essayId, qty]) => {
                    const q = qty as number;
                    if (q > 0) {
                        const essay = essays.find(e => e.id === essayId);
                        if (essay) {
                            newItems.push({
                                id: uuidv4(),
                                type: 'study',
                                itemId: essayId,
                                name: `${essay.name} (Estudo: ${study.name})`,
                                quantity: q,
                                unitCost: essay.totalCost,
                                totalCost: essay.totalCost * q,
                                breakdownSnapshot: createItemCostSnapshot(essay, study.name)
                            });
                        }
                    }
                });
                setProposalItems(prev => [...prev, ...newItems]);
            }
        }

        setIsAddingItem(false);
        setSelectedItemId('');
        setItemQuantity(1);
        setStudyEssayQuantities({});
    };

    const handleRemoveItem = (id: string) => {
        setProposalItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateItemQuantity = (id: string, newQuantity: number) => {
        const qty = Math.max(1, newQuantity);
        setProposalItems(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    quantity: qty,
                    totalCost: item.unitCost * qty
                };
            }
            return item;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Propostas de Preço</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Elabore e gerencie propostas financeiras com valores e detalhamentos de custos protegidos e congelados.</p>
                </div>
                {!isAddingProposal && (
                    <button
                        onClick={() => setIsAddingProposal(true)}
                        className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-semibold text-sm"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Nova Proposta
                    </button>
                )}
            </div>

            {/* Informative Banner */}
            <div className="p-3.5 bg-teal-50/80 border border-teal-200/90 rounded-xl flex items-start gap-3 text-xs text-teal-900">
                <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg shrink-0 mt-0.5">
                    <CalculatorIcon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                    <p className="font-bold">Independência e Reutilização de Precificação:</p>
                    <p className="text-teal-800 leading-relaxed">
                        Os ensaios e estudos da aba <span className="font-semibold">Precificação</span> funcionam como um catálogo permanente e podem ser reutilizados em quantas propostas forem necessárias. Cada proposta armazena um <strong>snapshot completo e imutável</strong> dos custos e itens, garantindo que alterações futuras na precificação não afetem propostas já existentes.
                    </p>
                </div>
            </div>

            {isAddingProposal ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingProposalId ? 'Editar Proposta' : 'Nova Proposta'}
                            </h2>
                            {editingProposalId && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                    Modo Edição
                                </span>
                            )}
                        </div>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Título da Proposta *</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                                value={newProposalTitle}
                                onChange={(e) => setNewProposalTitle(e.target.value)}
                                placeholder="Ex: Proposta de Pesquisa e Desenvolvimento"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Parceria Vinculada *</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                                value={selectedPartnershipId}
                                onChange={(e) => setSelectedPartnershipId(e.target.value)}
                            >
                                <option value="">Selecione uma parceria...</option>
                                {partnerships.map(p => (
                                    <option key={p.id} value={p.id}>{p.reference} - {p.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Status da Proposta</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                                value={proposalStatus}
                                onChange={(e) => setProposalStatus(e.target.value as ProposalStatus)}
                            >
                                <option value="Rascunho">Rascunho</option>
                                <option value="Em Elaboração">Em Elaboração</option>
                                <option value="Enviada">Enviada</option>
                                <option value="Aprovada">Aprovada</option>
                                <option value="Não Aprovada">Não Aprovada</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-bold text-gray-800">Itens e Ensaios da Proposta</h3>
                                <p className="text-xs text-gray-500">Selecione ensaios ou estudos da precificação para compor esta proposta.</p>
                            </div>
                            {!isAddingItem && (
                                <button
                                    onClick={() => setIsAddingItem(true)}
                                    className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg flex items-center shadow-sm transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    Adicionar Item da Precificação
                                </button>
                            )}
                        </div>

                        {isAddingItem && (
                            <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
                                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">Incluir Ensaio ou Estudo do Catálogo</span>
                                    <span className="text-[11px] text-teal-700 italic">O item selecionado permanece disponível para outras propostas</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-700">Tipo de Item</label>
                                        <select
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                            value={itemType}
                                            onChange={(e) => {
                                                setItemType(e.target.value as 'essay' | 'study');
                                                setSelectedItemId('');
                                            }}
                                        >
                                            <option value="essay">Ensaio / Atividade</option>
                                            <option value="study">Estudo Completo</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs font-medium text-gray-700">Selecione o {itemType === 'essay' ? 'Ensaio' : 'Estudo'}</label>
                                        <select
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                            value={selectedItemId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                setSelectedItemId(id);
                                                if (itemType === 'study' && id) {
                                                    const study = studies.find(s => s.id === id);
                                                    if (study) {
                                                        const initialQuants: Record<string, number> = {};
                                                        (study.essayIds || []).forEach(eid => {
                                                            initialQuants[eid] = 1;
                                                        });
                                                        setStudyEssayQuantities(initialQuants);
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {itemType === 'essay' ? (
                                                essays.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name} — {formatCurrency(e.totalCost)}</option>
                                                ))
                                            ) : (
                                                studies.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.totalCost)}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    {itemType === 'essay' ? (
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-700">Quantidade</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                                value={itemQuantity}
                                                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-end pb-1">
                                            <span className="text-[10px] text-gray-500 italic">Defina as quantidades dos ensaios do estudo abaixo</span>
                                        </div>
                                    )}
                                </div>

                                {itemType === 'study' && selectedItemId && (
                                    <div className="mt-4 space-y-2 border-t border-teal-200/60 pt-3">
                                        <label className="text-xs font-bold text-teal-900 uppercase tracking-wider">Ensaios do Estudo (Defina as quantidades a incluir)</label>
                                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                            {studies.find(s => s.id === selectedItemId)?.essayIds.map(essayId => {
                                                const essay = essays.find(e => e.id === essayId);
                                                if (!essay) return null;
                                                return (
                                                    <div key={essayId} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200">
                                                        <span className="text-sm font-medium text-gray-800">{essay.name}</span>
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-xs text-gray-500">{formatCurrency(essay.totalCost)} un.</span>
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-[11px] text-gray-500 font-medium">Qtd:</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center font-bold"
                                                                    value={studyEssayQuantities[essayId] || 0}
                                                                    onChange={(e) => setStudyEssayQuantities(prev => ({
                                                                        ...prev,
                                                                        [essayId]: parseInt(e.target.value) || 0
                                                                    }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-2 pt-2">
                                    <button
                                        onClick={() => setIsAddingItem(false)}
                                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddItem}
                                        className="px-4 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                                    >
                                        Incluir na Proposta
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="space-y-4">
                            {proposalItems.length > 0 ? (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3">Item / Ensaio</th>
                                                <th className="px-4 py-3 text-center">Tipo</th>
                                                <th className="px-4 py-3 text-right">Custo Unitário</th>
                                                <th className="px-4 py-3 text-center">Quantidade</th>
                                                <th className="px-4 py-3 text-right">Custo Total</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-800">
                                            {proposalItems.map(item => {
                                                const hasSnapshot = !!item.breakdownSnapshot;
                                                const isItemExpanded = expandedItemDetailKey === item.id;

                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr className="hover:bg-teal-50/40 transition-colors">
                                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                                <div className="flex items-center space-x-2">
                                                                    <span>{item.name}</span>
                                                                    {hasSnapshot && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedItemDetailKey(isItemExpanded ? null : item.id)}
                                                                            className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"
                                                                            title="Ver detalhamento congelado deste item"
                                                                        >
                                                                            <EyeIcon className="w-3 h-3" />
                                                                            {isItemExpanded ? 'Ocultar Custos' : 'Ver Custos'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                    item.type === 'study' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {item.type === 'study' ? 'Estudo' : 'Ensaio'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                                {formatCurrency(item.unitCost)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                                                    className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-teal-700">
                                                                {formatCurrency(item.totalCost)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleRemoveItem(item.id)} 
                                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                    title="Remover item da proposta"
                                                                >
                                                                    <TrashIcon className="w-4 h-4 inline" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {isItemExpanded && item.breakdownSnapshot && (
                                                            <tr className="bg-gray-50/80">
                                                                <td colSpan={6} className="p-4 border-b border-gray-200">
                                                                    <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-3 text-xs">
                                                                        <div className="flex items-center justify-between border-b pb-2">
                                                                            <span className="font-bold text-teal-900">
                                                                                Composição de Custos do Item (Snapshot Congelado): {item.name}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                                Registrado em: {new Date(item.breakdownSnapshot.capturedAt).toLocaleString('pt-BR')}
                                                                            </span>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                            {/* RH */}
                                                                            <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <span className="font-bold text-blue-900">Recursos Humanos</span>
                                                                                    <span className="font-bold text-blue-700">{formatCurrency(item.breakdownSnapshot.subtotalPersonnel)}</span>
                                                                                </div>
                                                                                {item.breakdownSnapshot.personnelCosts.length > 0 ? (
                                                                                    <div className="space-y-1">
                                                                                        {item.breakdownSnapshot.personnelCosts.map(p => (
                                                                                            <div key={p.id} className="flex justify-between text-[11px] text-gray-600">
                                                                                                <span>{p.personName} ({p.dedicationHours}h)</span>
                                                                                                <span>{formatCurrency(p.totalValue)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-gray-400 italic">Sem custos de RH</span>
                                                                                )}
                                                                            </div>

                                                                            {/* Insumos */}
                                                                            <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <span className="font-bold text-emerald-900">Insumos e Reagentes</span>
                                                                                    <span className="font-bold text-emerald-700">{formatCurrency(item.breakdownSnapshot.subtotalInputs)}</span>
                                                                                </div>
                                                                                {item.breakdownSnapshot.inputCosts.length > 0 ? (
                                                                                    <div className="space-y-1">
                                                                                        {item.breakdownSnapshot.inputCosts.map(i => (
                                                                                            <div key={i.id} className="flex justify-between text-[11px] text-gray-600">
                                                                                                <span>{i.description} ({i.quantity}x)</span>
                                                                                                <span>{formatCurrency(i.totalValue)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-gray-400 italic">Sem custos de insumos</span>
                                                                                )}
                                                                            </div>

                                                                            {/* Calibração */}
                                                                            <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <span className="font-bold text-amber-900">Equipamentos / Calibração</span>
                                                                                    <span className="font-bold text-amber-700">{formatCurrency(item.breakdownSnapshot.subtotalCalibration)}</span>
                                                                                </div>
                                                                                {item.breakdownSnapshot.calibrationCosts.length > 0 ? (
                                                                                    <div className="space-y-1">
                                                                                        {item.breakdownSnapshot.calibrationCosts.map(c => (
                                                                                            <div key={c.id} className="flex justify-between text-[11px] text-gray-600">
                                                                                                <span>{c.equipmentName} ({c.quantity}x)</span>
                                                                                                <span>{formatCurrency(c.totalValue)}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-gray-400 italic">Sem custos de calibração</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-400 italic border border-dashed rounded-xl bg-gray-50/50">
                                    Nenhum item adicionado à proposta ainda. Clique em "Adicionar Item da Precificação" acima.
                                </div>
                            )}

                            {proposalItems.length > 0 && (
                                <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Reserva Card */}
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700">Reserva de Contingência</label>
                                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">Sobre Custo Base</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Porcentagem (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white pr-6 font-semibold"
                                                            value={safetyMarginPercentage || ''}
                                                            onChange={(e) => handleSafetyMarginPctChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-2 text-xs text-gray-400 font-medium">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Valor (R$)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-2 text-xs text-gray-400 font-medium">R$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white font-semibold"
                                                            value={safetyMarginValue ? Number(safetyMarginValue.toFixed(2)) : ''}
                                                            onChange={(e) => handleSafetyMarginValChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-right text-gray-500 pt-1 border-t border-gray-200/60">
                                                Reserva: <span className="font-semibold text-gray-700">{formatCurrency(safetyMarginValue)}</span>
                                            </div>
                                        </div>

                                        {/* Margem Card */}
                                        <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-teal-900">Margem de Lucro</label>
                                                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-medium">Lucro Líquido</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] text-teal-700 font-medium block mb-1">Porcentagem (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            className="w-full px-2 py-1.5 text-sm border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white pr-6 font-bold text-teal-900"
                                                            value={profitMarginPercentage || ''}
                                                            onChange={(e) => handleProfitMarginPctChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-2 text-xs text-teal-500 font-medium">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-teal-700 font-medium block mb-1">Valor (R$)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-2 text-xs text-teal-500 font-medium">R$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white font-bold text-teal-900"
                                                            value={profitMarginValue ? Number(profitMarginValue.toFixed(2)) : ''}
                                                            onChange={(e) => handleProfitMarginValChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-right text-teal-800 pt-1 border-t border-teal-200/80">
                                                Margem: <span className="font-bold text-teal-900">{formatCurrency(profitMarginValue)}</span>
                                            </div>
                                        </div>

                                        {/* Taxas Card */}
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700">Taxas e Impostos</label>
                                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">Tributos</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Porcentagem (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="99"
                                                            step="0.1"
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white pr-6 font-semibold"
                                                            value={taxesPercentage || ''}
                                                            onChange={(e) => handleTaxesPctChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-2 text-xs text-gray-400 font-medium">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Valor (R$)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-2 text-xs text-gray-400 font-medium">R$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white font-semibold"
                                                            value={taxesValue ? Number(taxesValue.toFixed(2)) : ''}
                                                            onChange={(e) => handleTaxesValChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-right text-gray-500 pt-1 border-t border-gray-200/60">
                                                Taxas: <span className="font-semibold text-gray-700">{formatCurrency(taxesValue)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-teal-50 rounded-xl border border-teal-100 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold text-teal-900">Total da Proposta</span>
                                            <span className="text-xs text-teal-700 font-medium">
                                                Custo Base ({formatCurrency(baseCost)}) + Reserva ({formatCurrency(safetyMarginValue)}) + Margem ({formatCurrency(profitMarginValue)}) + Taxas ({formatCurrency(taxesValue)})
                                            </span>
                                        </div>
                                        <span className="text-2xl font-black text-teal-700">
                                            {formatCurrency(totalValue)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveProposal('Rascunho')}
                            className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors text-sm font-semibold shadow-sm"
                            title="Salvar como rascunho para editar depois"
                        >
                            Salvar Rascunho
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveProposal(proposalStatus)}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-bold shadow-sm"
                        >
                            {editingProposalId ? 'Salvar Alterações' : 'Salvar Proposta'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {proposals.map(proposal => {
                        const partnership = partnerships.find(p => p.id === proposal.partnershipId);
                        const isHistoryExpanded = expandedHistoryId === proposal.id;
                        const isDetailsExpanded = expandedDetailsProposalId === proposal.id;
                        const statusChangeDate = proposal.statusChangedAt 
                            ? new Date(proposal.statusChangedAt).toLocaleString('pt-BR')
                            : new Date(proposal.updatedAt).toLocaleString('pt-BR');

                        const proposalBaseCost = proposal.items.reduce((sum, item) => sum + item.totalCost, 0);

                        return (
                            <div 
                                key={proposal.id} 
                                id={`proposal-${proposal.id}`}
                                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 transition-all space-y-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                            <h3 className="text-lg font-bold text-gray-800">{proposal.title}</h3>
                                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                                                proposal.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                                proposal.status === 'Não Aprovada' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                                proposal.status === 'Enviada' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                proposal.status === 'Rascunho' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                'bg-purple-100 text-purple-800 border-purple-300'
                                            }`}>
                                                {proposal.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500 space-x-4 flex-wrap gap-y-1">
                                            <div className="flex items-center">
                                                <CollectionIcon className="w-4 h-4 mr-1 text-teal-500" />
                                                {partnership ? `${partnership.reference} - ${partnership.title}` : 'Parceria não vinculada'}
                                            </div>
                                            <div className="flex items-center">
                                                <CalculatorIcon className="w-4 h-4 mr-1 text-teal-500" />
                                                {proposal.items.length} item(ns) incluído(s)
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium pt-1">
                                            Status alterado em: <span className="text-gray-700 font-semibold">{statusChangeDate}</span>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                                        <div className="text-xl font-bold text-teal-700">{formatCurrency(proposal.totalValue)}</div>
                                        <div className="text-[11px] text-gray-500">Custo Base: {formatCurrency(proposalBaseCost)}</div>
                                        {proposal.safetyMarginValue > 0 && (
                                            <div className="text-[10px] text-teal-600 font-medium">Reserva: {formatCurrency(proposal.safetyMarginValue)} ({proposal.safetyMarginPercentage}%)</div>
                                        )}
                                        {proposal.profitMarginValue > 0 && (
                                            <div className="text-[10px] text-teal-600 font-medium">Margem: {formatCurrency(proposal.profitMarginValue)} ({proposal.profitMarginPercentage}%)</div>
                                        )}
                                        {proposal.taxesValue > 0 && (
                                            <div className="text-[10px] text-teal-600 font-medium">Taxas: {formatCurrency(proposal.taxesValue)} ({proposal.taxesPercentage}%)</div>
                                        )}
                                        <div className="text-[10px] text-gray-400 mt-1">Atualizado em: {new Date(proposal.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedDetailsProposalId(isDetailsExpanded ? null : proposal.id)}
                                            className="text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors flex items-center border border-teal-200/80"
                                        >
                                            <EyeIcon className="w-3.5 h-3.5 mr-1.5" />
                                            {isDetailsExpanded ? 'Ocultar Detalhamento e Custos' : 'Ver Detalhamento e Custos'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : proposal.id)}
                                            className="text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                                        >
                                            {isHistoryExpanded ? <ChevronDownIcon className="w-3.5 h-3.5 mr-1" /> : <ChevronRightIcon className="w-3.5 h-3.5 mr-1" />}
                                            Histórico ({proposal.revisionHistory?.length || 0})
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDuplicateProposal(proposal)}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-teal-50 hover:text-teal-800 rounded-lg transition-colors border border-gray-200"
                                            title="Duplicar esta proposta"
                                        >
                                            <CopyIcon className="w-3.5 h-3.5 mr-1.5" />
                                            Duplicar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEditProposal(proposal)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                                            title="Editar proposta"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteProposal(proposal.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                            title="Excluir proposta"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Cost Breakdown Details */}
                                {isDetailsExpanded && (
                                    <div className="mt-3 bg-gray-50 border border-teal-200/80 rounded-xl p-4 text-xs space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-teal-900 text-sm">Detalhamento e Composição de Custos da Proposta</h4>
                                                <p className="text-[11px] text-gray-500">
                                                    🔒 Estes valores e detalhamentos estão permanentemente congelados nesta proposta e são imutáveis diante de alterações na precificação original.
                                                </p>
                                            </div>
                                            <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-lg shrink-0">
                                                Total: {formatCurrency(proposal.totalValue)}
                                            </span>
                                        </div>

                                        {/* Table of items inside proposal */}
                                        <div className="space-y-3">
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-3 py-2.5">Item / Ensaio</th>
                                                            <th className="px-3 py-2.5 text-center">Tipo</th>
                                                            <th className="px-3 py-2.5 text-right">Custo Unitário</th>
                                                            <th className="px-3 py-2.5 text-center">Qtd</th>
                                                            <th className="px-3 py-2.5 text-right">Custo Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {proposal.items.map((item, idx) => {
                                                            const snapshot = item.breakdownSnapshot;
                                                            return (
                                                                <React.Fragment key={item.id || idx}>
                                                                    <tr className="hover:bg-teal-50/30">
                                                                        <td className="px-3 py-2.5 font-bold text-gray-800">{item.name}</td>
                                                                        <td className="px-3 py-2.5 text-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                                item.type === 'study' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                                            }`}>
                                                                                {item.type === 'study' ? 'Estudo' : 'Ensaio'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2.5 text-right text-gray-600 font-mono">{formatCurrency(item.unitCost)}</td>
                                                                        <td className="px-3 py-2.5 text-center font-bold text-gray-800">{item.quantity}</td>
                                                                        <td className="px-3 py-2.5 text-right font-bold text-teal-700 font-mono">{formatCurrency(item.totalCost)}</td>
                                                                    </tr>
                                                                    {snapshot && (
                                                                        <tr className="bg-gray-50/60">
                                                                            <td colSpan={5} className="px-3 py-2">
                                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                                                                                    <div className="bg-white p-2 rounded border border-gray-200">
                                                                                        <div className="font-semibold text-blue-900 flex justify-between">
                                                                                            <span>👥 Recursos Humanos:</span>
                                                                                            <span>{formatCurrency(snapshot.subtotalPersonnel)}</span>
                                                                                        </div>
                                                                                        <div className="text-[10px] text-gray-500 mt-1">
                                                                                            {snapshot.personnelCosts.map(p => `${p.personName} (${p.dedicationHours}h)`).join(', ') || 'Nenhum'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="bg-white p-2 rounded border border-gray-200">
                                                                                        <div className="font-semibold text-emerald-900 flex justify-between">
                                                                                            <span>🧪 Insumos e Reagentes:</span>
                                                                                            <span>{formatCurrency(snapshot.subtotalInputs)}</span>
                                                                                        </div>
                                                                                        <div className="text-[10px] text-gray-500 mt-1">
                                                                                            {snapshot.inputCosts.map(i => `${i.description} (${i.quantity}x)`).join(', ') || 'Nenhum'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="bg-white p-2 rounded border border-gray-200">
                                                                                        <div className="font-semibold text-amber-900 flex justify-between">
                                                                                            <span>⚙️ Equipamentos / Calibração:</span>
                                                                                            <span>{formatCurrency(snapshot.subtotalCalibration)}</span>
                                                                                        </div>
                                                                                        <div className="text-[10px] text-gray-500 mt-1">
                                                                                            {snapshot.calibrationCosts.map(c => `${c.equipmentName} (${c.quantity}x)`).join(', ') || 'Nenhum'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Financial Summary Box */}
                                            <div className="bg-white p-3.5 rounded-lg border border-teal-200/90 space-y-2">
                                                <span className="font-bold text-gray-800 text-xs block border-b pb-1.5">Resumo Financeiro da Proposta</span>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                                        <span className="text-gray-500 block text-[10px]">Custo Base dos Ensaios</span>
                                                        <span className="font-bold text-gray-800 text-sm">{formatCurrency(proposalBaseCost)}</span>
                                                    </div>
                                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                                        <span className="text-gray-500 block text-[10px]">Reserva de Contingência ({proposal.safetyMarginPercentage}%)</span>
                                                        <span className="font-bold text-gray-800 text-sm">{formatCurrency(proposal.safetyMarginValue)}</span>
                                                    </div>
                                                    <div className="p-2 bg-teal-50 rounded border border-teal-200">
                                                        <span className="text-teal-700 block text-[10px]">Margem de Lucro ({proposal.profitMarginPercentage}%)</span>
                                                        <span className="font-bold text-teal-900 text-sm">{formatCurrency(proposal.profitMarginValue)}</span>
                                                    </div>
                                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                                        <span className="text-gray-500 block text-[10px]">Taxas e Impostos ({proposal.taxesPercentage}%)</span>
                                                        <span className="font-bold text-gray-800 text-sm">{formatCurrency(proposal.taxesValue)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Revision History */}
                                {isHistoryExpanded && (
                                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
                                        <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2">Histórico de Alteração de Status e Revisão</h4>
                                        {proposal.revisionHistory && proposal.revisionHistory.length > 0 ? (
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {proposal.revisionHistory.map(rev => (
                                                    <div key={rev.id} className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{rev.action}</p>
                                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                                                Por: <span className="font-medium text-gray-700">{rev.userName}</span>
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                                            {new Date(rev.date).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 italic">Nenhum histórico registrado até o momento.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {proposals.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <CalculatorIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nenhuma proposta cadastrada.</p>
                            <button
                                type="button"
                                onClick={() => setIsAddingProposal(true)}
                                className="mt-4 text-teal-600 font-medium hover:underline text-sm"
                            >
                                Criar minha primeira proposta
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProposalsView;
