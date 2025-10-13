/**
 * Intelligent query caching system for IC canister calls
 * Provides automatic cache invalidation, TTL management, and tag-based invalidation
 */

class QueryCache {
    constructor() {
        this.cache = new Map();
        this.subscribers = new Map();
        this.gcTimer = null;
    }

    /**
     * Store data in cache with TTL and tags
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {Object} options - Cache options
     * @param {number} options.ttl - Time to live in milliseconds (default: 30000)
     * @param {Array<string>} options.tags - Tags for group invalidation (default: [])
     */
    set(key, data, options = {}) {
        const { ttl = 30000, tags = [] } = options;

        const entry = {
            data,
            timestamp: Date.now(),
            ttl,
            tags,
            hitCount: 0
        };

        this.cache.set(key, entry);
        this.scheduleGC();

        // Notify subscribers of cache update
        this.notifySubscribers(key, data);
    }

    /**
     * Retrieve data from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if expired/missing
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        // Track usage for smart eviction (LRU)
        entry.hitCount++;
        entry.lastAccess = Date.now();
        return entry.data;
    }

    /**
     * Get age of cached entry
     * @param {string} key - Cache key
     * @returns {number} Age in milliseconds
     */
    getAge(key) {
        const entry = this.cache.get(key);
        if (!entry) return Infinity;
        return Date.now() - entry.timestamp;
    }

    /**
     * Check if cache has valid entry
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Invalidate specific cache entry
     * @param {string} key - Cache key
     */
    invalidate(key) {
        this.cache.delete(key);
        this.notifySubscribers(key, null);
    }

    /**
     * Invalidate all entries matching a tag
     * Useful for bulk invalidation (e.g., all 'orbit' queries after mutation)
     * @param {string} tag - Tag to invalidate
     */
    invalidateByTag(tag) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags.includes(tag)) {
                this.cache.delete(key);
                this.notifySubscribers(key, null);
            }
        }
    }

    /**
     * Invalidate all entries matching pattern
     * @param {RegExp} pattern - Pattern to match keys
     */
    invalidateByPattern(pattern) {
        for (const [key] of this.cache.entries()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
                this.notifySubscribers(key, null);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        // Notify all subscribers
        for (const [key] of this.subscribers.entries()) {
            this.notifySubscribers(key, null);
        }
    }

    /**
     * Subscribe to cache updates for a specific key
     * @param {string} key - Cache key to watch
     * @param {Function} callback - Callback function (data) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    /**
     * Notify all subscribers of cache update
     * @private
     */
    notifySubscribers(key, data) {
        const subs = this.subscribers.get(key);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in cache subscriber:', error);
                }
            });
        }
    }

    /**
     * Schedule garbage collection
     * @private
     */
    scheduleGC() {
        if (this.gcTimer) return;

        this.gcTimer = setTimeout(() => {
            this.runGC();
            this.gcTimer = null;
        }, 60000); // Run every minute
    }

    /**
     * Run garbage collection
     * Removes expired entries and evicts LRU entries if over size limit
     * @private
     */
    runGC() {
        const now = Date.now();
        const maxSize = 100; // Max cache entries

        // Remove expired entries
        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
            }
        }

        // If still over limit, remove least recently used
        if (this.cache.size > maxSize) {
            const sorted = Array.from(this.cache.entries())
                .sort((a, b) => {
                    // Sort by last access time, then by hit count
                    const aLastAccess = a[1].lastAccess || a[1].timestamp;
                    const bLastAccess = b[1].lastAccess || b[1].timestamp;
                    if (aLastAccess !== bLastAccess) {
                        return aLastAccess - bLastAccess;
                    }
                    return a[1].hitCount - b[1].hitCount;
                });

            // Remove oldest entries
            const toRemove = sorted.length - maxSize;
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(sorted[i][0]);
            }
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        let totalHits = 0;
        let expiredCount = 0;
        const now = Date.now();

        for (const [, entry] of this.cache.entries()) {
            totalHits += entry.hitCount;
            if (now - entry.timestamp > entry.ttl) {
                expiredCount++;
            }
        }

        return {
            size: this.cache.size,
            totalHits,
            expiredCount,
            subscribers: this.subscribers.size
        };
    }
}

// Export singleton instance
export const queryCache = new QueryCache();

// Export class for testing
export { QueryCache };
