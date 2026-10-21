import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';
import 'leaflet/dist/leaflet.css';
import './styles/app.css';
import App from './App';
import { StoreProvider } from './lib/store';

// The single-file snapshot opens from disk, where only hash routes work.
const Router = import.meta.env.VITE_SNAPSHOT ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Router>
  </StrictMode>,
);
