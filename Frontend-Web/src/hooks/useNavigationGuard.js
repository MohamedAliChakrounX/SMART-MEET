import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * useNavigationGuard
 * Blocks navigation when `shouldBlock()` returns true at navigation time.
 * Accepts a FUNCTION (not a value) so it reads the latest ref/state when evaluated.
 *
 * @param {() => boolean} shouldBlock - Getter called at navigation time
 * @param {string}        message     - Confirmation message
 */
const useNavigationGuard = (shouldBlock, message) => {
    // Block react-router in-app navigation (evaluated lazily at navigation time)
    useBlocker(() => {
        const blocked = typeof shouldBlock === 'function' ? shouldBlock() : shouldBlock;
        if (blocked) {
            return !window.confirm(message);
        }
        return false;
    });

    // Block browser refresh / tab close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const blocked = typeof shouldBlock === 'function' ? shouldBlock() : shouldBlock;
            if (!blocked) return;
            e.preventDefault();
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [shouldBlock, message]);
};

export default useNavigationGuard;
