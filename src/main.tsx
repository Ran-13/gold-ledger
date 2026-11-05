import './lib/bufferPolyfill';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { installZawgyiToUnicodeInputs } from './lib/zawgyiInput';
import { useStore } from './store';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

installZawgyiToUnicodeInputs();
useStore.getState().bootstrap();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
