import { User } from '../types';

/**
 * Checks if the user has administrative privileges (Administrador or Administrador Master).
 */
export const isAdmin = (user?: User | null): boolean => {
    if (!user) return false;
    return user.role === 'Administrador' || user.role === 'Administrador Master';
};

/**
 * Checks if the user is a Master Administrator.
 */
export const isMasterAdmin = (user?: User | null): boolean => {
    if (!user) return false;
    return user.role === 'Administrador Master';
};
