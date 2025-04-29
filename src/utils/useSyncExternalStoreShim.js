
// This is a shim to provide a default export for use-sync-external-store/shim/with-selector
// which is required by zustand and other packages

import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

// Export the specific function directly as the default export
// This ensures that when code tries to import the default, it gets the correct implementation
export default useSyncExternalStoreWithSelector;
