import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeBrowserCompatibility } from './components/BrowserCompatibility';
import './index.css';

// Initialize browser compatibility system on startup
initializeBrowserCompatibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
