import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { AppState, User } from '../types';
import { parseJsonDatabase, JsonImportSummary } from '../utils/importService';
import { UploadIcon, DownloadIcon, CheckCircleIcon, ExclamationIcon, RefreshIcon } from './Icons';

interface JsonImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAppState: AppState;
    currentUser: User;
    onApplyImportedData: (data: Partial<AppState>, mode: 'replace' | 'merge') => Promise<void>;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
    isOpen,
    onClose,
    currentAppState,
    currentUser,
    onApplyImportedData
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<Partial<AppState> | null>(null);
    const [summary, setSummary] = useState<JsonImportSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setErrorMessage(null);
        setSuccessMessage(null);
        setParsedData(null);
        setSummary(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const result = parseJsonDatabase(content);

            if (result.success && result.data) {
                setParsedData(result.data);
                setSummary(result.summary);
            } else {
                setErrorMessage(result.error || 'Não foi possível ler os dados do arquivo JSON.');
            }
        };

        reader.onerror = () => {
            setErrorMessage('Falha ao ler o arquivo selecionado.');
        };

        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmImport = async () => {
        if (!parsedData) return;
        setIsProcessing(true);
        setErrorMessage(null);
        try {
            await onApplyImportedData(parsedData, importMode);
            setSuccessMessage(
                importMode === 'replace'
                    ? 'Dados restaurados e substituídos com sucesso no sistema e no Supabase!'
                    : 'Dados mesclados com sucesso no sistema e no Supabase!'
            );
            setTimeout(() => {
                onClose();
                setSuccessMessage(null);
                setParsedData(null);
                setSelectedFile(null);
            }, 2000);
        } catch (err: any) {
            setErrorMessage(`Erro ao aplicar dados importados: ${err.message || err}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadCurrentDatabase = () => {
        const blob = new Blob([JSON.stringify(currentAppState, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'DatabaseSpabase.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const resetState = () => {
        setSelectedFile(null);
        setParsedData(null);
        setSummary(null);
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsProcessing(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                resetState();
                onClose();
            }}
            title="Importação e Exportação de Dados (.JSON)"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Cabeçalho informativo */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-1.5">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>📦</span> Arquivo Padrão: <code>DatabaseSpabase.json</code>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Importe um arquivo de dados estruturado em formato <strong>.JSON</strong> para alimentar ou restaurar o banco de dados do sistema e a sincronização em nuvem com o Supabase e SharePoint.
                    </p>
                </div>

                {/* Mensagens de Sucesso / Erro */}
                {successMessage && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center gap-3 animate-fade-in">
                        <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
                        <div>
                            <p className="font-semibold">{successMessage}</p>
                            <p className="text-xs text-green-700 mt-0.5">Sincronização persistida com sucesso.</p>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
                        <ExclamationIcon className="w-6 h-6 text-red-600 shrink-0" />
                        <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                )}

                {/* Seleção de arquivo */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-500 transition-colors bg-white">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".json,application/json"
                        className="hidden"
                    />
                    <UploadIcon className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                    <h4 className="text-base font-bold text-gray-800">
                        {selectedFile ? selectedFile.name : 'Selecione o arquivo .JSON para importar'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                        Suporta <code>DatabaseSpabase.json</code>, <code>database.json</code> ou backups completos do CTVacinas.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                        >
                            <UploadIcon className="w-4 h-4" />
                            {selectedFile ? 'Trocar Arquivo' : 'Escolher Arquivo .JSON'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadCurrentDatabase}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 border border-slate-300"
                            title="Baixar cópia atual em DatabaseSpabase.json"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Exportar .JSON Atual
                        </button>
                    </div>
                </div>

                {/* Resumo dos dados detectados */}
                {summary && parsedData && (
                    <div className="bg-white border rounded-xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-sm font-bold text-gray-800">Dados Detectados no Arquivo:</h4>
                            <span className="text-xs bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-semibold">
                                Válido
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-teal-700">{summary.partnerships}</div>
                                <div className="text-xs text-gray-600 font-medium">Parcerias</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-indigo-700">{summary.legalInstruments}</div>
                                <div className="text-xs text-gray-600 font-medium">Instrumentos</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-amber-700">{summary.tasks}</div>
                                <div className="text-xs text-gray-600 font-medium">Tarefas</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-emerald-700">{summary.users}</div>
                                <div className="text-xs text-gray-600 font-medium">Usuários</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-purple-700">{summary.internalProjects}</div>
                                <div className="text-xs text-gray-600 font-medium">Projetos Internos</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-cyan-700">{summary.proposals}</div>
                                <div className="text-xs text-gray-600 font-medium">Propostas</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-blue-700">{summary.studies + summary.essays}</div>
                                <div className="text-xs text-gray-600 font-medium">Precificação</div>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border">
                                <div className="text-lg font-black text-slate-700">{summary.hasSettings ? 'Sim' : 'Padrão'}</div>
                                <div className="text-xs text-gray-600 font-medium">Configurações</div>
                            </div>
                        </div>

                        {/* Modo de importação */}
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                Modo de Importação:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                                    importMode === 'replace' ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        checked={importMode === 'replace'}
                                        onChange={() => setImportMode('replace')}
                                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">Substituir Base Completa</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Restaura e substitui integralmente os registros atuais com o conteúdo deste arquivo (recomendado para carregar o <code>DatabaseSpabase.json</code>).
                                        </div>
                                    </div>
                                </label>

                                <label className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                                    importMode === 'merge' ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        checked={importMode === 'merge'}
                                        onChange={() => setImportMode('merge')}
                                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">Mesclar com Dados Atuais</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Adiciona novos registros e atualiza os existentes sem apagar os que já estão cadastrados no sistema.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Ações de confirmação */}
                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => {
                                    resetState();
                                    onClose();
                                }}
                                disabled={isProcessing}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                disabled={isProcessing}
                                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshIcon className="w-4 h-4 animate-spin" />
                                        Importando e Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Confirmar Importação de Dados
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default JsonImportModal;
