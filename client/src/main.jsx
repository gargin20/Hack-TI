import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import store from './store/index.js'
import AuthBootstrap from './components/AuthBootstrap.jsx'

// Intercept console.log and console.error to log to the backend
const API_URL = 'http://localhost:5001';
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  if (msg.includes('[RESTORE') || msg.includes('[AUTH WRITE') || msg.includes('[AUTH REMOVE') || msg.includes('Health page mounted') || msg.includes('location.search')) {
    fetch(`${API_URL}/api/auth/log-client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        message: msg
      })
    }).catch(() => {});
  }
};

const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  fetch(`${API_URL}/api/auth/log-client-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: window.location.href,
      message: '[ERROR] ' + msg
    })
  }).catch(() => {});
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AuthBootstrap />
    </Provider>
  </StrictMode>,
)
