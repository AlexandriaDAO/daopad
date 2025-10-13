import { useCallback, useRef } from 'react';

/**
 * Optimized callback hook with dependency tracking
 * Only updates the callback when dependencies actually change (shallow equality)
 * Provides stable reference to prevent unnecessary re-renders
 */
export function useOptimizedCallback(callback, deps = []) {
    const callbackRef = useRef(callback);
    const depsRef = useRef(deps);

    // Only update if deps actually changed
    if (!shallowEqual(deps, depsRef.current)) {
        callbackRef.current = callback;
        depsRef.current = deps;
    }

    return useCallback((...args) => {
        return callbackRef.current(...args);
    }, []); // Empty deps, stable reference
}

/**
 * Shallow equality check for dependency arrays
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean} True if arrays are shallowly equal
 */
function shallowEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
