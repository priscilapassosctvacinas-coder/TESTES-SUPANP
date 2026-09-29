
import { AppState } from "../types";

const CLIENT_ID = '2901bc81-e843-462e-a260-ff59eefd9654';
const TENANT_ID = 'ctvacinas974.onmicrosoft.com'; // Use a tenant-specific domain for single-tenant apps
const SHAREPOINT_HOST = 'ctvacinas974.sharepoint.com';
const SITE_NAME = 'sites/NegcioseParcerias';
const DRIVE_NAME = 'Documentos';
export const DATABASE_FILE_PATH = '/General/DatabaseSpabase.json';
export const LEGACY_DATABASE_FILE_PATH = '/General/database.json';
const FALLBACK_DATABASE_PATHS = [
    '/General/DatabaseSpabase.json',
    '/General/DatabaseSupabase.jason',
    '/General/DatabaseSupabase.json',
    '/General/database.json'
];
const BACKUP_FOLDER_PATH = '/General'; // Where backup CSVs will go

const msalConfig: any = {
    auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

const loginRequest = {
    scopes: ["User.Read", "Sites.ReadWrite.All", "Files.ReadWrite.All", "Mail.Send", "Mail.Send.Shared"],
};

let Msal: any = null;
let msalInstance: any | null = null;

export const initializeMsal = async (): Promise<any> => {
    if (!Msal) {
        try {
            Msal = await import('@azure/msal-browser');
        } catch (e) {
            console.error("Failed to dynamically import MSAL library:", e);
            throw new Error("Could not load authentication library. Please check your internet connection and try again.");
        }
    }

    if (!msalInstance) {
        if (!Msal || !Msal.PublicClientApplication) {
            throw new Error("MSAL library failed to load or is not a valid module.");
        }
        msalInstance = new Msal.PublicClientApplication(msalConfig);
        await msalInstance.initialize();
    }
    return msalInstance;
};

export const signInSilently = async (instance: any): Promise<any | null> => {
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
        const request = { ...loginRequest, account: accounts[0] };
        try {
            return await instance.acquireTokenSilent(request);
        } catch (error: any) {
            if (error.name === 'InteractionRequiredAuthError') {
                console.log("Silent token acquisition failed, interaction required.");
                return null;
            }
            console.error("Silent token acquisition error:", error);
            return null;
        }
    }
    return null;
};

export const signInInteractive = (instance: any): Promise<any> => {
    return instance.loginPopup(loginRequest);
};

export const signOut = async (instance: any): Promise<void> => {
    const logoutRequest = {
        account: instance.getActiveAccount(),
        postLogoutRedirectUri: window.location.origin,
    };
    siteIdCache = null; // Clear cache on sign out
    driveIdCache = null;
    await instance.logoutPopup(logoutRequest);
};

async function getGraphToken(instance: any): Promise<string> {
    let account: any | null = instance.getActiveAccount();
    
    // FIX: Race condition where getActiveAccount() is null right after login.
    // Fallback to checking all accounts if no active account is set.
    if (!account && instance.getAllAccounts().length > 0) {
        account = instance.getAllAccounts()[0];
        instance.setActiveAccount(account);
    }

    if (!account) {
        throw new Error("No active account! User needs to sign in.");
    }

    const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account,
    });

    return response.accessToken;
}

// Cache for Site ID and Drive ID to avoid repeated lookups
let siteIdCache: string | null = null;
let driveIdCache: string | null = null;

async function getSiteId(instance: any): Promise<string> {
    if (siteIdCache) return siteIdCache;

    const token = await getGraphToken(instance);
    const headers = new Headers({ 'Authorization': `Bearer ${token}` });
    const response = await fetch(`https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:/${SITE_NAME}`, { headers });

    if (!response.ok) throw new Error(`Failed to get site ID: ${response.statusText}`);
    const data = await response.json();
    siteIdCache = data.id;
    return siteIdCache;
}

async function getDriveId(instance: any, siteId: string): Promise<string> {
    if (driveIdCache) return driveIdCache;

    const token = await getGraphToken(instance);
    const headers = new Headers({ 'Authorization': `Bearer ${token}` });
    const response = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, { headers });

    if (!response.ok) throw new Error(`Failed to get drives: ${response.statusText}`);
    const data = await response.json();
    const drive = data.value.find((d: any) => d.name === DRIVE_NAME);

    if (!drive) throw new Error(`Drive "${DRIVE_NAME}" not found.`);
    driveIdCache = drive.id;
    return driveIdCache;
}

export const downloadDatabase = async (instance: any): Promise<AppState> => {
    const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);

    // Try download from DatabaseSpabase.json and fallback paths
    let response: any = null;
    for (const filePath of FALLBACK_DATABASE_PATHS) {
        response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:${filePath}:/content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            console.log(`Dados encontrados no SharePoint em: ${filePath}`);
            break;
        }
    }

    if (!response || response.status === 404) {
        const notFoundError = new Error("Database file not found on SharePoint.") as Error & { isNotFound?: boolean };
        notFoundError.isNotFound = true;
        throw notFoundError;
    }
    if (!response.ok) throw new Error(`Failed to download database: ${response.statusText}`);
    return response.json();
};




export const uploadDatabase = async (instance: any, appState: AppState): Promise<void> => {
    const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);
    const dbContent = JSON.stringify(appState, null, 2);

    const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:${DATABASE_FILE_PATH}:/content`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: dbContent
    });

    if (!response.ok) throw new Error(`Failed to upload database: ${response.statusText}`);
};

export const uploadBackupFiles = async (instance: any, files: {name: string, content: string}[]): Promise<void> => {
    const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);

    for (const file of files) {
        const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:${BACKUP_FOLDER_PATH}/${file.name}:/content`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/csv; charset=utf-8'
            },
            body: file.content
        });
        if (!response.ok) {
            console.error(`Failed to backup file ${file.name}:`, response.statusText);
        }
    }
};


async function createFolder(instance: any, parentPath: string, folderName: string) {
    const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);

    const folderData = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
    };

    // Note: parentPath should be URL encoded if it contains special chars, but simple spaces are usually handled by the API or browser.
    const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:${parentPath}:/children`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderData)
    });
    
    if (!response.ok) throw new Error(`Failed to create folder: ${response.statusText}`);
    return response.json();
}

async function getFolderByPath(instance: any, path: string) {
    const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Using URL encoding for path segments to handle spaces properly in the URL construction
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${cleanPath}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 404) {
            return null; 
        }
        
        if (!response.ok) {
            console.warn(`Failed to check folder existence at ${cleanPath}: ${response.statusText}`);
            return null;
        }

        return response.json();
    } catch (error) {
        console.error("Error fetching folder by path:", error);
        return null;
    }
}

export const createPartnershipFolder = (instance: any, folderName: string) => {
    // Path relative to 'Documentos' drive root
    return createFolder(instance, '/Negócios e Parcerias/Arquivos de Parceiros e Clientes', folderName);
}

export const getOrCreatePartnershipFolder = async (instance: any, folderName: string) => {
    const parentPath = '/Negócios e Parcerias/Arquivos de Parceiros e Clientes';
    // Construct path. Assuming folderName doesn't have slashes (validated in UI).
    const fullPath = `${parentPath}/${folderName}`;
    
    const existingFolder = await getFolderByPath(instance, fullPath);
    
    if (existingFolder) {
        return { ...existingFolder, _isExisting: true };
    }
    
    return createPartnershipFolder(instance, folderName);
}

export const createLegalInstrumentFolder = (instance: any, folderName: string) => {
    // Path relative to 'Documentos' drive root
    return createFolder(instance, '/Instrumentos Jurídicos', folderName);
}

async function uploadFile(instance: any, folderPath: string, file: File) {
     const siteId = await getSiteId(instance);
    const driveId = await getDriveId(instance, siteId);
    const token = await getGraphToken(instance);

    const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:${folderPath}/${file.name}:/content`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': file.type
        },
        body: file
    });
    if (!response.ok) throw new Error(`Failed to upload file: ${response.statusText}`);
    return response.json();
}

export const uploadFileToPartnership = (instance: any, partnershipFolderName: string, file: File) => {
    return uploadFile(instance, `/Negócios e Parcerias/Arquivos de Parceiros e Clientes/${partnershipFolderName}`, file);
}

export const uploadFileToLegalInstrument = (instance: any, instrumentFolderName: string, file: File) => {
    return uploadFile(instance, `/Instrumentos Jurídicos/${instrumentFolderName}`, file);
}

export const uploadExternalQuoteFile = async (instance: any, file: File) => {
    const parentFolder = '/Negócios e Parcerias/cotação externa de serviços';
    const folder = await getFolderByPath(instance, parentFolder);
    if (!folder) {
        try {
            await createFolder(instance, '/Negócios e Parcerias', 'cotação externa de serviços');
        } catch (e) {
            console.warn("Could not create folder directly, attempting upload:", e);
        }
    }
    return uploadFile(instance, parentFolder, file);
}

export const sendEmail = async (instance: any, to: string, subject: string, bodyHtml: string, fromEmail?: string): Promise<void> => {
    const token = await getGraphToken(instance);
    const headers = new Headers({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    });

    // Determine endpoint based on sender configuration
    const endpoint = fromEmail && fromEmail.trim() !== '' 
        ? `https://graph.microsoft.com/v1.0/users/${fromEmail.trim()}/sendMail`
        : 'https://graph.microsoft.com/v1.0/me/sendMail';

    const emailPayload: any = {
        message: {
            subject: subject,
            body: {
                contentType: "HTML",
                content: bodyHtml
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to
                    }
                }
            ]
        },
        saveToSentItems: "false"
    };

    // If sending as another user, explicitly set the From address in the message payload as well
    if (fromEmail && fromEmail.trim() !== '') {
        emailPayload.message.from = {
            emailAddress: {
                address: fromEmail.trim()
            }
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error details:", errorText);
        
        // Fallback: If sending as specific user fails (e.g., permission denied), try sending as 'me' but warn
        if (endpoint.includes('/users/')) {
            console.warn(`Failed to send as ${fromEmail}. Retrying as logged-in user...`);
            return sendEmail(instance, to, subject, bodyHtml, undefined); // Retry without 'fromEmail'
        }

        throw new Error(`Failed to send email: ${response.statusText} - ${errorText}`);
    }
};
