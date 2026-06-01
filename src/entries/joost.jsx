import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import WorldMap from '../components/world-map/index.jsx';
import '../styles/visdeurbel-tokens.css';
import '../styles/nav-shared.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <WorldMap />
    </BrowserRouter>
  </StrictMode>
);