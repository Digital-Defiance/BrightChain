import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeBrowserCompatibility } from './components/BrowserCompatibility';

// Initialize browser compatibility system on startup
initializeBrowserCompatibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
