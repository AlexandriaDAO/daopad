import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import IIProvider from './providers/AuthProvider/IIProvider';
import ErrorBoundary from './components/errors/ErrorBoundary';
import './globals.css';

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
