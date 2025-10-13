/**
 * Web Worker for heavy data processing
 * Offloads CPU-intensive tasks from the main thread
 * Keeps UI responsive during complex calculations
 */

/**
 * Process large datasets off the main thread
 */
self.addEventListener('message', (event) => {
    const { type, data, id } = event.data;

    try {
        let result;

        switch (type) {
            case 'PROCESS_VOTING_POWER':
                result = calculateVotingPower(data);
                break;

            case 'AGGREGATE_TRANSACTIONS':
                result = aggregateTransactions(data);
                break;

            case 'FILTER_REQUESTS':
                result = filterAndSortRequests(data.requests, data.filters);
                break;

            case 'CALCULATE_BALANCES':
                result = calculateBalances(data);
                break;

            case 'SORT_LARGE_DATASET':
                result = sortLargeDataset(data.items, data.sortKey, data.sortOrder);
                break;

            case 'SEARCH_DATASET':
                result = searchDataset(data.items, data.query, data.searchFields);
                break;

            case 'GROUP_BY':
                result = groupBy(data.items, data.key);
                break;

            default:
                throw new Error(`Unknown task type: ${type}`);
        }

        self.postMessage({
            type: `${type}_RESULT`,
            data: result,
            id
        });
    } catch (error) {
        self.postMessage({
            type: `${type}_ERROR`,
            error: error.message,
            id
        });
    }
});

/**
 * Calculate total voting power from LP positions
 * Heavy computation moved to worker thread
 */
function calculateVotingPower(positions) {
    if (!Array.isArray(positions)) return 0;

    return positions.reduce((total, position) => {
        try {
            // Handle BigInt calculations
            const amount = BigInt(position.amount || 0);
            const price = BigInt(Math.floor((position.price || 0) * 1e8)); // Convert to integer
            const value = amount * price / BigInt(1e8);
            return total + Number(value);
        } catch (error) {
            console.error('Error calculating voting power for position:', error);
            return total;
        }
    }, 0);
}

/**
 * Aggregate transactions by various criteria
 */
function aggregateTransactions(transactions) {
    if (!Array.isArray(transactions)) return {};

    const grouped = {};

    for (const tx of transactions) {
        const key = `${tx.from}_${tx.to}`;
        if (!grouped[key]) {
            grouped[key] = {
                from: tx.from,
                to: tx.to,
                count: 0,
                totalAmount: 0,
                transactions: [],
                firstTimestamp: tx.timestamp,
                lastTimestamp: tx.timestamp
            };
        }

        grouped[key].count++;
        grouped[key].totalAmount += Number(tx.amount || 0);
        grouped[key].transactions.push(tx);

        if (tx.timestamp < grouped[key].firstTimestamp) {
            grouped[key].firstTimestamp = tx.timestamp;
        }
        if (tx.timestamp > grouped[key].lastTimestamp) {
            grouped[key].lastTimestamp = tx.timestamp;
        }
    }

    return grouped;
}

/**
 * Filter and sort requests by multiple criteria
 */
function filterAndSortRequests(requests, filters = {}) {
    if (!Array.isArray(requests)) return [];

    let filtered = [...requests];

    // Apply status filter
    if (filters.status && filters.status !== 'All') {
        filtered = filtered.filter(r => r.status === filters.status);
    }

    // Apply domain filter
    if (filters.domain && filters.domain !== 'All') {
        filtered = filtered.filter(r => r.domain === filters.domain);
    }

    // Apply date range filter
    if (filters.startDate) {
        filtered = filtered.filter(r =>
            new Date(r.createdAt) >= new Date(filters.startDate)
        );
    }
    if (filters.endDate) {
        filtered = filtered.filter(r =>
            new Date(r.createdAt) <= new Date(filters.endDate)
        );
    }

    // Apply search query
    if (filters.query) {
        const query = filters.query.toLowerCase();
        filtered = filtered.filter(r =>
            (r.title?.toLowerCase().includes(query)) ||
            (r.description?.toLowerCase().includes(query)) ||
            (r.id?.toLowerCase().includes(query))
        );
    }

    // Apply sorting
    if (filters.sortBy) {
        const { key, order = 'asc' } = filters.sortBy;
        filtered.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal === bVal) return 0;

            let comparison = 0;
            if (typeof aVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else {
                comparison = aVal < bVal ? -1 : 1;
            }

            return order === 'asc' ? comparison : -comparison;
        });
    }

    return filtered;
}

/**
 * Calculate balances from multiple sources
 */
function calculateBalances(data) {
    const { accounts = [], transactions = [] } = data;
    const balances = {};

    // Initialize with account balances
    accounts.forEach(account => {
        balances[account.id] = Number(account.balance || 0);
    });

    // Apply transactions
    transactions.forEach(tx => {
        const amount = Number(tx.amount || 0);
        if (tx.from && balances[tx.from] !== undefined) {
            balances[tx.from] -= amount;
        }
        if (tx.to && balances[tx.to] !== undefined) {
            balances[tx.to] += amount;
        }
    });

    return balances;
}

/**
 * Sort large datasets efficiently
 */
function sortLargeDataset(items, sortKey, sortOrder = 'asc') {
    if (!Array.isArray(items)) return [];

    const sorted = [...items];

    sorted.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === bVal) return 0;

        let comparison = 0;
        if (typeof aVal === 'string') {
            comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number') {
            comparison = aVal - bVal;
        } else if (aVal instanceof Date) {
            comparison = aVal.getTime() - bVal.getTime();
        } else {
            comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Search through large datasets
 */
function searchDataset(items, query, searchFields = []) {
    if (!Array.isArray(items) || !query) return items;

    const lowerQuery = query.toLowerCase();

    return items.filter(item => {
        // If specific fields provided, search only those
        if (searchFields.length > 0) {
            return searchFields.some(field => {
                const value = item[field];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(lowerQuery);
            });
        }

        // Otherwise search all string fields
        return Object.values(item).some(value => {
            if (typeof value === 'string') {
                return value.toLowerCase().includes(lowerQuery);
            }
            return false;
        });
    });
}

/**
 * Group items by a specific key
 */
function groupBy(items, key) {
    if (!Array.isArray(items)) return {};

    return items.reduce((acc, item) => {
        const groupKey = item[key] || 'undefined';
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
    }, {});
}
