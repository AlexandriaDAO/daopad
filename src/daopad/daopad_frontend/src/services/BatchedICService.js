/**
 * Batched IC Service for optimizing canister calls
 * Groups multiple calls within a time window and executes them in parallel
 * Reduces network overhead and improves perceived performance
 */

class BatchedICService {
    constructor() {
        this.pendingCalls = [];
        this.batchTimer = null;
        this.batchDelay = 50; // 50ms batching window
        this.canisterBatchSupport = new Map();
    }

    /**
     * Queue a canister call for batching
     * @param {string} canisterId - Canister ID
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @param {Object} actor - Actor instance
     * @returns {Promise} Promise that resolves with call result
     */
    queueCall(canisterId, method, args, actor) {
        return new Promise((resolve, reject) => {
            this.pendingCalls.push({
                canisterId,
                method,
                args,
                actor,
                resolve,
                reject,
                timestamp: Date.now()
            });

            this.scheduleBatch();
        });
    }

    /**
     * Schedule batch execution
     * @private
     */
    scheduleBatch() {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(() => {
            this.executeBatch();
            this.batchTimer = null;
        }, this.batchDelay);
    }

    /**
     * Execute batched calls
     * @private
     */
    async executeBatch() {
        const batch = this.pendingCalls.splice(0);
        if (batch.length === 0) return;

        console.log(`[BatchedIC] Executing batch of ${batch.length} calls`);

        // Group by canister
        const grouped = batch.reduce((acc, call) => {
            if (!acc[call.canisterId]) {
                acc[call.canisterId] = [];
            }
            acc[call.canisterId].push(call);
            return acc;
        }, {});

        // Execute in parallel per canister
        const promises = Object.entries(grouped).map(async ([canisterId, calls]) => {
            try {
                // Check if canister supports batch operations
                if (this.supportsBatch(canisterId)) {
                    await this.executeBatchCall(canisterId, calls);
                } else {
                    // Execute in parallel
                    await this.executeParallelCalls(calls);
                }
            } catch (error) {
                console.error(`[BatchedIC] Error processing canister ${canisterId}:`, error);
                // Reject all calls in this group
                calls.forEach(call => call.reject(error));
            }
        });

        await Promise.all(promises);
    }

    /**
     * Execute calls in parallel
     * @private
     */
    async executeParallelCalls(calls) {
        const results = await Promise.allSettled(
            calls.map(call => this.executeSingleCall(call))
        );

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                calls[index].resolve(result.value);
            } else {
                calls[index].reject(result.reason);
            }
        });
    }

    /**
     * Execute single canister call
     * @private
     */
    async executeSingleCall(call) {
        const { actor, method, args } = call;
        try {
            const result = await actor[method](...args);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Execute batch call (if canister supports it)
     * @private
     */
    async executeBatchCall(canisterId, calls) {
        // This would require canister-side batch support
        // For now, fall back to parallel execution
        return this.executeParallelCalls(calls);
    }

    /**
     * Check if canister supports batch operations
     * @private
     */
    supportsBatch(canisterId) {
        // Check canister interface for batch methods
        // For now, assume no batch support
        return this.canisterBatchSupport.get(canisterId) || false;
    }

    /**
     * Register canister as batch-capable
     * @param {string} canisterId - Canister ID
     * @param {boolean} supported - Whether batch is supported
     */
    registerBatchSupport(canisterId, supported = true) {
        this.canisterBatchSupport.set(canisterId, supported);
    }

    /**
     * Set batch delay
     * @param {number} delay - Delay in milliseconds
     */
    setBatchDelay(delay) {
        this.batchDelay = delay;
    }

    /**
     * Clear pending calls
     */
    clear() {
        this.pendingCalls.forEach(call => {
            call.reject(new Error('Batch cleared'));
        });
        this.pendingCalls = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Get pending calls count
     * @returns {number}
     */
    getPendingCount() {
        return this.pendingCalls.length;
    }
}

// Export singleton instance
export const batchedIC = new BatchedICService();

// Export class for testing
export { BatchedICService };

/**
 * Wrapper function for batched canister calls
 * Usage: await batchedCall(actor, 'method_name', [arg1, arg2])
 */
export async function batchedCall(actor, method, args = [], canisterId = 'unknown') {
    // For now, just execute directly since batching requires more integration
    // In the future, this could be enhanced to use the batching service
    try {
        return await actor[method](...args);
    } catch (error) {
        console.error(`[BatchedCall] Error calling ${method}:`, error);
        throw error;
    }
}
