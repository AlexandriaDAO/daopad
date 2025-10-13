import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for using Web Workers in React components
 * Provides easy interface for offloading heavy computations
 *
 * @param {string|Function} workerPath - Path to worker file or worker function
 * @returns {Object} Worker interface with postMessage, result, error, and loading state
 */
export function useWorker(workerPath) {
    const workerRef = useRef(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const isMounted = useRef(true);
    const messageIdRef = useRef(0);
    const pendingCallbacks = useRef(new Map());

    useEffect(() => {
        isMounted.current = true;

        // Create worker
        try {
            if (typeof workerPath === 'string') {
                workerRef.current = new Worker(new URL(workerPath, import.meta.url), {
                    type: 'module'
                });
            } else if (typeof workerPath === 'function') {
                // Create inline worker from function
                const blob = new Blob([`(${workerPath.toString()})()`], {
                    type: 'application/javascript'
                });
                const url = URL.createObjectURL(blob);
                workerRef.current = new Worker(url);
            }

            // Handle messages from worker
            workerRef.current.addEventListener('message', (event) => {
                if (!isMounted.current) return;

                const { type, data, error: workerError, id } = event.data;

                // Handle callback-based messages
                if (id && pendingCallbacks.current.has(id)) {
                    const { resolve, reject } = pendingCallbacks.current.get(id);
                    pendingCallbacks.current.delete(id);

                    if (type.endsWith('_ERROR')) {
                        reject(new Error(workerError));
                    } else {
                        resolve(data);
                    }
                    return;
                }

                // Handle state-based messages
                if (type.endsWith('_ERROR')) {
                    setError(new Error(workerError));
                    setLoading(false);
                } else {
                    setResult(data);
                    setError(null);
                    setLoading(false);
                }
            });

            // Handle worker errors
            workerRef.current.addEventListener('error', (error) => {
                if (!isMounted.current) return;
                setError(error);
                setLoading(false);
            });
        } catch (err) {
            setError(err);
        }

        return () => {
            isMounted.current = false;
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, [workerPath]);

    /**
     * Post message to worker (state-based)
     */
    const postMessage = useCallback((type, data) => {
        if (!workerRef.current) {
            setError(new Error('Worker not initialized'));
            return;
        }

        setLoading(true);
        setError(null);
        workerRef.current.postMessage({ type, data });
    }, []);

    /**
     * Post message to worker (promise-based)
     */
    const execute = useCallback((type, data) => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const id = messageIdRef.current++;
            pendingCallbacks.current.set(id, { resolve, reject });

            workerRef.current.postMessage({ type, data, id });
        });
    }, []);

    /**
     * Terminate worker manually
     */
    const terminate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
    }, []);

    return {
        postMessage,
        execute,
        terminate,
        result,
        error,
        loading,
        isReady: !!workerRef.current
    };
}

/**
 * Hook for using the data processor worker
 * Provides typed methods for common data processing tasks
 */
export function useDataProcessor() {
    const { execute, loading, error } = useWorker('../workers/dataProcessor.worker.js');

    const processVotingPower = useCallback(async (positions) => {
        return execute('PROCESS_VOTING_POWER', positions);
    }, [execute]);

    const aggregateTransactions = useCallback(async (transactions) => {
        return execute('AGGREGATE_TRANSACTIONS', transactions);
    }, [execute]);

    const filterRequests = useCallback(async (requests, filters) => {
        return execute('FILTER_REQUESTS', { requests, filters });
    }, [execute]);

    const calculateBalances = useCallback(async (data) => {
        return execute('CALCULATE_BALANCES', data);
    }, [execute]);

    const sortDataset = useCallback(async (items, sortKey, sortOrder) => {
        return execute('SORT_LARGE_DATASET', { items, sortKey, sortOrder });
    }, [execute]);

    const searchDataset = useCallback(async (items, query, searchFields) => {
        return execute('SEARCH_DATASET', { items, query, searchFields });
    }, [execute]);

    const groupBy = useCallback(async (items, key) => {
        return execute('GROUP_BY', { items, key });
    }, [execute]);

    return {
        processVotingPower,
        aggregateTransactions,
        filterRequests,
        calculateBalances,
        sortDataset,
        searchDataset,
        groupBy,
        loading,
        error
    };
}

/**
 * Hook for creating a worker pool
 * Distributes work across multiple workers for parallel processing
 */
export function useWorkerPool(workerPath, poolSize = 4) {
    const workers = useRef([]);
    const currentWorker = useRef(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Create worker pool
        workers.current = Array.from({ length: poolSize }, () => {
            try {
                return new Worker(new URL(workerPath, import.meta.url), {
                    type: 'module'
                });
            } catch (err) {
                setError(err);
                return null;
            }
        }).filter(Boolean);

        return () => {
            workers.current.forEach(worker => worker.terminate());
            workers.current = [];
        };
    }, [workerPath, poolSize]);

    /**
     * Execute task in next available worker (round-robin)
     */
    const execute = useCallback((type, data) => {
        return new Promise((resolve, reject) => {
            if (workers.current.length === 0) {
                reject(new Error('No workers available'));
                return;
            }

            const worker = workers.current[currentWorker.current];
            currentWorker.current = (currentWorker.current + 1) % workers.current.length;

            const handleMessage = (event) => {
                if (event.data.type.endsWith('_ERROR')) {
                    worker.removeEventListener('message', handleMessage);
                    reject(new Error(event.data.error));
                } else {
                    worker.removeEventListener('message', handleMessage);
                    resolve(event.data.data);
                }
            };

            const handleError = (error) => {
                worker.removeEventListener('error', handleError);
                reject(error);
            };

            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);
            worker.postMessage({ type, data });
        });
    }, []);

    /**
     * Execute tasks in parallel across pool
     */
    const executeParallel = useCallback(async (tasks) => {
        const results = await Promise.all(
            tasks.map(({ type, data }) => execute(type, data))
        );
        return results;
    }, [execute]);

    return {
        execute,
        executeParallel,
        loading,
        error,
        poolSize: workers.current.length
    };
}

export default useWorker;
