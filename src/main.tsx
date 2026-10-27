import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DirectorySafetyFooter, DirectorySafetyPage} from './components/DirectorySafety';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './skyglass.css';
import './skyglass-reference.css';
import './orix.css';
import './people.css';

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration failed: ', err);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {window.location.pathname.replace(/\/+$/, '') === '/pais' ? <DirectorySafetyPage/> : window.location.pathname.replace(/\/+$/, '') === '/privacidade' ? <DirectorySafetyPage privacy/> : <App />}
      <DirectorySafetyFooter/>
    </ErrorBoundary>
  </StrictMode>,
);

import './gymnastics.css';



import "./profile-reels.css";

