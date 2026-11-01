import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import './store/ui'
import './store/sessionSync'
import './store/quizWiring'
import './store/hypothesis'
import App from './App'
import { initMonitoring } from './lib/monitoring'
import { registerServiceWorker } from './lib/pwa'

initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
