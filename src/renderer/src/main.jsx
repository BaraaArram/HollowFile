import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import App from './App.jsx'
import { ScanProgressProvider } from './components/ScanProgressContext.jsx'
import { I18nProvider } from './contexts/I18nProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <I18nProvider>
        <ScanProgressProvider>
            <App />
        </ScanProgressProvider>
    </I18nProvider>
);
