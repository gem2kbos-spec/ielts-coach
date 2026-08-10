import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './hooks/useTheme'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider delayDuration={150}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
