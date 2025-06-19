// Clear cache and service workers programmatically
(async function clearAllCaches() {
    try {
        console.log('🧹 Starting cache cleanup...');
        
        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log(`Found ${registrations.length} service worker(s)`);
            
            for (let registration of registrations) {
                const success = await registration.unregister();
                console.log(`Service worker unregistered: ${registration.scope} - ${success ? 'SUCCESS' : 'FAILED'}`);
            }
        }
        
        // 2. Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log(`Found ${cacheNames.length} cache(s):`, cacheNames);
            
            for (let name of cacheNames) {
                await caches.delete(name);
                console.log(`Cache deleted: ${name}`);
            }
        }
        
        // 3. Clear localStorage and sessionStorage
        if (window.localStorage) {
            const localStorageKeys = Object.keys(localStorage);
            localStorage.clear();
            console.log(`LocalStorage cleared (${localStorageKeys.length} items)`);
        }
        
        if (window.sessionStorage) {
            const sessionStorageKeys = Object.keys(sessionStorage);
            sessionStorage.clear();
            console.log(`SessionStorage cleared (${sessionStorageKeys.length} items)`);
        }
        
        // 4. Clear IndexedDB (if any)
        if (window.indexedDB) {
            // Note: IndexedDB clearing would require more complex code
            console.log('IndexedDB found but not cleared (would require manual cleanup)');
        }
        
        console.log('✅ Cache cleanup complete! Refresh the page to see changes.');
        
        // Auto-refresh after cleanup
        setTimeout(() => {
            console.log('🔄 Auto-refreshing page...');
            window.location.reload(true);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Cache cleanup failed:', error);
    }
})();