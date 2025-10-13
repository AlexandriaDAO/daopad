import { lazy } from 'react';

/**
 * Lazy loaded route components for code splitting
 * Each route is loaded on-demand to reduce initial bundle size
 */

// Lazy load all major routes
export const DashboardPage = lazy(() =>
    import(/* webpackChunkName: "page-dashboard" */ '../pages/DashboardPage')
);

export const RequestsPage = lazy(() =>
    import(/* webpackChunkName: "page-requests" */ '../pages/RequestsPage')
);

export const AddressBookPage = lazy(() =>
    import(/* webpackChunkName: "page-address-book" */ '../pages/AddressBookPage')
);

export const PermissionsPage = lazy(() =>
    import(/* webpackChunkName: "page-permissions" */ '../pages/PermissionsPage')
);

/**
 * Preload functions for critical routes
 * Call these when user is likely to navigate to a route
 * (e.g., on hover, on mount of navigation component)
 */

let dashboardPreloaded = false;
export const preloadDashboard = () => {
    if (dashboardPreloaded) return;
    dashboardPreloaded = true;
    import('../pages/DashboardPage');
};

let requestsPreloaded = false;
export const preloadRequests = () => {
    if (requestsPreloaded) return;
    requestsPreloaded = true;
    import('../pages/RequestsPage');
};

let addressBookPreloaded = false;
export const preloadAddressBook = () => {
    if (addressBookPreloaded) return;
    addressBookPreloaded = true;
    import('../pages/AddressBookPage');
};

let permissionsPreloaded = false;
export const preloadPermissions = () => {
    if (permissionsPreloaded) return;
    permissionsPreloaded = true;
    import('../pages/PermissionsPage');
};

/**
 * Preload all critical routes at once
 * Use sparingly - typically on app mount or after login
 */
export const preloadCriticalRoutes = () => {
    preloadDashboard();
    preloadRequests();
};

/**
 * Preload all routes
 * Use during idle time or when user is likely to navigate
 */
export const preloadAllRoutes = () => {
    preloadDashboard();
    preloadRequests();
    preloadAddressBook();
    preloadPermissions();
};
