// This is a shim to provide the useSyncExternalStoreWithSelector functionality
// which is required by zustand and other packages

import { useSyncExternalStore } from 'use-sync-external-store';

export function useSyncExternalStoreWithSelector(
  subscribe,
  getSnapshot,
  selector,
  isEqual
) {
  const getSelection = () => selector(getSnapshot());
  return useSyncExternalStore(subscribe, getSelection, getSelection);
}

export default useSyncExternalStoreWithSelector;
