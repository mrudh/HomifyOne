import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from "./context/AppContext";
import { BasketProvider } from './context/BasketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <ChatProvider>
            <BasketProvider>
              <App />
            </BasketProvider>
          </ChatProvider>
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);