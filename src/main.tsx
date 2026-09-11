import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

const updateSW=registerSW({immediate:false,onNeedRefresh(){window.dispatchEvent(new CustomEvent('pwa-update',{detail:updateSW}));},onOfflineReady(){window.dispatchEvent(new Event('pwa-offline'));}});
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
