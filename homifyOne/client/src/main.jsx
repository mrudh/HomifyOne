import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from "./context/AppContext";
import { BasketProvider } from './context/BasketContext';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <BasketProvider>
          <App />
        </BasketProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);