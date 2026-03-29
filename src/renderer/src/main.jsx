import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import App from './App.jsx'
import { ScanProgressProvider } from './components/ScanProgressContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <ScanProgressProvider>
        <App />
    </ScanProgressProvider>
);
