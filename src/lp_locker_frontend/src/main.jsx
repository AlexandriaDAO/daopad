import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import IIProvider from './providers/AuthProvider/IIProvider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <IIProvider>
        <App />
      </IIProvider>
    </Provider>
  </React.StrictMode>
);