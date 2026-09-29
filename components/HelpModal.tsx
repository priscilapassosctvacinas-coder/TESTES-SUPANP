
import React from 'react';
import Modal from './Modal';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manual de Funcionalidades e Perfis">
            <div className="space-y-6 text-gray-700 overflow-y-auto max-h-[70vh]">
                <section>
                    <h4 className="text-lg font-bold text-teal-800 mb-2 border-b border-teal-100 pb-1">1. Funcionalidades Principais</h4>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>
                            <strong>Gestão de Parcerias:</strong> Cadastro completo do ciclo de vida (negociação, execução, encerramento). Inclui criação automática de pastas no SharePoint e histórico detalhado de eventos.
                        </li>
                        <li>
                            <strong>Instrumentos Jurídicos:</strong> Controle de contratos, acordos e MOUs com monitoramento de vigência. Permite adicionar termos aditivos e envia alertas automáticos de vencimento (60, 30 e 7 dias).
                        </li>
                        <li>
                            <strong>Gestão de Tarefas:</strong> Atribuição de responsabilidades vinculadas a parcerias com controle de prazos.
                        </li>
                        <li>
                            <strong>Dashboard:</strong> Visão geral com indicadores de parcerias ativas, contratos a vencer e tarefas pendentes.
                        </li>
                    </ul>
                </section>

                <section>
                    <h4 className="text-lg font-bold text-teal-800 mb-2 border-b border-teal-100 pb-1">2. Perfis de Acesso</h4>
                    <div className="space-y-3">
                        <div>
                            <h5 className="font-semibold text-gray-800">Administrador</h5>
                            <p className="text-sm text-gray-600">Acesso total ao sistema. Além das funções operacionais, pode gerenciar usuários, importar dados em massa e ajustar configurações globais.</p>
                        </div>
                        <div>
                            <h5 className="font-semibold text-gray-800">Coordenador</h5>
                            <p className="text-sm text-gray-600">Foco na gestão e supervisão. Pode criar e editar parcerias, instrumentos e tarefas. Não acessa configurações de sistema.</p>
                        </div>
                        <div>
                            <h5 className="font-semibold text-gray-800">Pesquisador</h5>
                            <p className="text-sm text-gray-600">Perfil operacional focado na execução. Visualiza e interage com projetos e tarefas pertinentes às suas atividades.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="text-lg font-bold text-teal-800 mb-2 border-b border-teal-100 pb-1">3. Integrações</h4>
                    <p className="text-sm mb-2">O sistema opera integrado ao ambiente Microsoft 365:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                        <li><strong>SharePoint:</strong> Armazenamento seguro de documentos.</li>
                        <li><strong>Outlook:</strong> Envio de notificações e alertas.</li>
                    </ul>
                </section>

                <div className="mt-6 bg-teal-50 p-4 rounded-md border border-teal-200 text-sm text-teal-800">
                    <p><strong>Dúvidas?</strong> Entre em contato com a equipe de administração do CTVacinas.</p>
                </div>
            </div>
        </Modal>
    );
};

export default HelpModal;
