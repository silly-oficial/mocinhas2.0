import {HowItWorksPage} from './components/DirectoryInformation';
import {CookiePreferences} from './components/CookiePreferences';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DirectorySafetyFooter, DirectorySafetyPage, LegalVersionHistory, CreditsPage} from './components/DirectorySafety';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './skyglass.css';
import './skyglass-reference.css';
import './orix.css';
import './people.css';
import './directory-safety.css';

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

const publicPath = window.location.pathname.replace(/\/+$/, '');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {publicPath === '/como-funciona' ? <HowItWorksPage/> : publicPath === '/creditos' ? <CreditsPage/> : publicPath === '/pais' ? <DirectorySafetyPage/> : publicPath === '/privacidade' ? <DirectorySafetyPage page="privacy"/> : publicPath === '/termos' ? <DirectorySafetyPage page="terms"/> : publicPath === '/versoes' ? <LegalVersionHistory/> : <App />}
      <DirectorySafetyFooter/><CookiePreferences/>
    </ErrorBoundary>
  </StrictMode>,
);

import './gymnastics.css';



import "./profile-reels.css";
import "./directory-polish.css";


