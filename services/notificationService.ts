
import { User, Partnership, Task, LegalInstrument, Notification, View } from '../types';

const getSystemLink = () => window.location.origin;

export const generateNewUserEmail = (recipient: User): Omit<Notification, 'id' | 'timestamp' | 'read'> => {
    const link = getSystemLink();
    return {
        recipient: recipient.email,
        subject: `[CTV] Acesso concedido ao Gestor de Parcerias`,
        body: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Olá <strong>${recipient.name}</strong>,</p>
                <p>Seu acesso ao Gestor de Parcerias do CTVacinas foi concedido.</p>
                <p>Você pode acessar o sistema utilizando sua conta Microsoft (${recipient.email}) através do link abaixo:</p>
                <p><a href="${link}" style="color: #4F46E5; font-weight: bold;">${link}</a></p>
            </div>
        `,
    };
};

export const generateNewPartnershipEmail = (recipient: User, partnership: Partnership, roleDescription: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => {
    const link = getSystemLink();
    return {
        recipient: recipient.email,
        subject: `[CTV] Nova Parceria: ${partnership.reference}`,
        body: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Olá <strong>${recipient.name}</strong>,</p>
                <p>Uma nova parceria foi cadastrada no sistema e você foi indicado(a) como <strong>${roleDescription}</strong>.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Título:</strong> ${partnership.title}</p>
                    <p style="margin: 5px 0;"><strong>Referência:</strong> ${partnership.reference}</p>
                    <p style="margin: 5px 0;"><strong>Financiador:</strong> ${partnership.funder}</p>
                </div>
                <p>Acesse os detalhes clicando no link abaixo:</p>
                <p><a href="${link}" style="color: #4F46E5; font-weight: bold;">${link}</a></p>
            </div>
        `,
        link: {
            view: View.Partnerships,
            partnershipId: partnership.id,
        }
    };
};


export const generateNewTaskEmail = (recipient: User, task: Task, partnership: Partnership, creator: User): Omit<Notification, 'id' | 'timestamp' | 'read'> => {
    // Generate deep link for the specific task
    const link = `${getSystemLink()}?taskId=${task.id}`;
    
    return {
        recipient: recipient.email,
        subject: `[CTV] Nova Tarefa: ${task.title}`,
        body: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Olá <strong>${recipient.name}</strong>,</p>
                <p>Uma nova tarefa foi atribuída a você.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Tarefa:</strong> ${task.title}</p>
                    ${task.description ? `<p style="margin: 5px 0;"><strong>Descrição:</strong> ${task.description}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Parceria:</strong> <a href="${link}" style="color: #4F46E5; font-weight: bold;">${partnership.reference}</a></p>
                    ${partnership.projectNumber ? `<p style="margin: 5px 0;"><strong>Nº Projeto:</strong> ${partnership.projectNumber}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Financiador:</strong> ${partnership.funder}</p>
                    <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</p>
                </div>
                <p>Acesse a tarefa diretamente:</p>
                <p><a href="${link}" style="color: #4F46E5; font-weight: bold;">Clique aqui para abrir a tarefa</a></p>
            </div>
        `,
         link: {
            view: View.Tasks, // Although email link handles URL param, internal notification links still need this
            partnershipId: partnership.id,
        }
    };
};

export const generateExpirationWarningEmail = (recipient: User, instrument: LegalInstrument, partnerships: Partnership[], daysLeft: number): Omit<Notification, 'id' | 'timestamp' | 'read'> => {
    const partnershipRefs = partnerships.map(p => p.reference).join(', ');
    const link = getSystemLink();
    const formattedId = String(instrument.id).padStart(4, '0');
    
    return {
        recipient: recipient.email,
        subject: `[CTV] ALERTA: Instrumento Jurídico ${formattedId} vence em ${daysLeft} dias`,
        body: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Atenção <strong>${recipient.name}</strong>,</p>
                <p>Este é um alerta automático de vencimento próximo.</p>
                <div style="background-color: #fff7ed; padding: 15px; border-radius: 5px; border-left: 5px solid #f97316; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Instrumento Nº:</strong> ${formattedId}</p>
                    <p style="margin: 5px 0;"><strong>Tipo:</strong> ${instrument.type}</p>
                    <p style="margin: 5px 0;"><strong>Parcerias:</strong> ${partnershipRefs}</p>
                    <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${new Date(instrument.expirationDate + 'T00:00:00').toLocaleDateString()}</p>
                    <p style="margin: 5px 0; color: #c2410c; font-weight: bold;">Dias Restantes: ${daysLeft}</p>
                </div>
                <p>Por favor, verifique a necessidade de renovação.</p>
                <p><a href="${link}" style="color: #4F46E5; font-weight: bold;">${link}</a></p>
            </div>
        `,
        link: {
            view: View.Partnerships,
            partnershipId: partnerships[0].id, 
            instrumentId: instrument.id,
        }
    };
};

export const generateStatusChangeEmail = (recipient: User, partnership: Partnership): Omit<Notification, 'id' | 'timestamp' | 'read'> => {
    const link = getSystemLink();
    return {
        recipient: recipient.email,
        subject: `[CTV] Status Atualizado: ${partnership.reference} - ${partnership.status}`,
        body: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Olá <strong>${recipient.name}</strong>,</p>
                <p>O status da parceria foi atualizado.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Parceria:</strong> ${partnership.title} (${partnership.reference})</p>
                    <p style="margin: 5px 0;"><strong>Novo Status:</strong> ${partnership.status}</p>
                </div>
                <p>Acesse para mais detalhes:</p>
                <p><a href="${link}" style="color: #4F46E5; font-weight: bold;">${link}</a></p>
            </div>
        `,
        link: {
            view: View.Partnerships,
            partnershipId: partnership.id,
        }
    };
};
