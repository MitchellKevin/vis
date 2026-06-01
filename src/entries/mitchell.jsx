import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Mitchell from '../pages/Mitchell.jsx';
import '../styles/visdeurbel-tokens.css';
import '../styles/nav-shared.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Mitchell />
    </BrowserRouter>
  </StrictMode>
);
