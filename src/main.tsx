import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeHttpInterceptors } from '@/lib/http-interceptor';
import { App } from './App';

initializeHttpInterceptors();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
