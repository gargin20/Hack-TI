import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import store from './store/index.js'
import AuthBootstrap from './components/AuthBootstrap.jsx'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('React root element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <AuthBootstrap />
    </Provider>
  </StrictMode>,
)
