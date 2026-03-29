import { createContext, useContext } from 'react';

export const OfflineContext = createContext({ isOffline: false, setOffline: () => {} });

export function useOffline() {
  return useContext(OfflineContext);
}