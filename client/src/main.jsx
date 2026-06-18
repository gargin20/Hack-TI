import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import store from './store/index.js'
import AuthBootstrap from './components/AuthBootstrap.jsx'

console.log('[BOOT] main.jsx evaluated', {
  href: window.location.href,
  rootExists: Boolean(document.getElementById('root')),
});

window.addEventListener('error', (event) => {
  console.error('[BOOT] window error', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[BOOT] unhandled rejection', event.reason);
});

const rootElement = document.getElementById('root');
console.log('[BOOT] createRoot about to run', { rootElement });



createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <AuthBootstrap />
    </Provider>
  </StrictMode>,
)
