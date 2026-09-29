import { AppState } from '../types';

const LOCAL_STORAGE_KEY = 'ctvPartnershipManagerAppState';

export const saveStateToLocalStorage = (state: AppState): void => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Could not save state to local storage", error);
    }
};

export const loadStateFromLocalStorage = (): AppState | null => {
    try {
        const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        return JSON.parse(serializedState) as AppState;
    } catch (error) {
        console.error("Could not load state from local storage", error);
        return null;
    }
};
