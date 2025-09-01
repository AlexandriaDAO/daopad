import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import IIProvider from './providers/AuthProvider/IIProvider';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <IIProvider>
        <App />
      </IIProvider>
    </Provider>
  </React.StrictMode>,
);
