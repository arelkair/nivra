import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/jetbrains-mono/latin-ext-400.css'
import '@fontsource/jetbrains-mono/latin-ext-500.css'
import '@fontsource/jetbrains-mono/latin-ext-700.css'
import '@fontsource/fraunces/latin-500.css'
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-ext-500.css'
import '@fontsource/fraunces/latin-ext-600.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-ext-400.css'
import '@fontsource/space-grotesk/latin-ext-500.css'
import '@fontsource/space-grotesk/latin-ext-600.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import './minimal.css'
import App from './App.tsx'
import { Legal } from './pages/Legal'
import { legalFromPath } from './lib/legal'
import { preloadSections } from './lib/lazy'
import { StandalonePage } from './pages/Standalone'
import { isPublicPage, isStandalone } from './lib/routes'
import { PinGate } from './components/PinLock'
import { purgeExpiredTrash } from './lib/dataLifecycle'

const legal = legalFromPath()

purgeExpiredTrash()
const content = legal ? <Legal kind={legal} /> : isStandalone() ? <StandalonePage /> : <App />
createRoot(document.getElementById('root')!).render(<StrictMode>{legal || (isStandalone() && isPublicPage()) ? content : <PinGate scope="app">{content}</PinGate>}</StrictMode>)

if (!legal && !isStandalone()) preloadSections(localStorage.getItem('nivra-initiative') !== 'false' ? 'initiative' : 'classic')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
