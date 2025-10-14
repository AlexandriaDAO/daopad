import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import IIProvider from './providers/AuthProvider/IIProvider';
import ErrorBoundary from './components/errors/ErrorBoundary';
import './globals.css';

// Import testing utilities (exposes window.testTransferFlow)
import './utils/mainnetTesting';

// Only expose in development or with explicit debug flag
if (import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true') {
  // Make store read-only to prevent manipulation
  window.__DEBUG__ = {
    getState: () => store.getState(),
    testTransferFlow: () => import('./utils/mainnetTesting').then(m => m.testTransferFlow()),
    enableDebug: () => localStorage.setItem('DEBUG_MODE', 'true'),
    disableDebug: () => localStorage.removeItem('DEBUG_MODE')
  };
  console.log('🧪 Debug mode available. Use window.__DEBUG__.enableDebug() to activate.');
} else {
  // Production: No exposure at all
  console.log('Production mode. Debug tools disabled for security.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary level="app">
      <Provider store={store}>
        <IIProvider>
          <App />
        </IIProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register service worker for cache management
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);

        // Check for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
