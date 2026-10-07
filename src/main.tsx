import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import '@fontsource/ibm-plex-mono/latin-400.css'
import './styles/index.css'
import App from './App'

// Use hash routing on static hosts without rewrite support, e.g. GitHub Pages.
const useHashRouting = import.meta.env.VITE_ROUTER_MODE === 'hash'
const Router = useHashRouting ? HashRouter : BrowserRouter
const basename = useHashRouting ? undefined : import.meta.env.BASE_URL

createRoot(document.getElementById('root')!).render(
  <StrictMode><Router basename={basename}><App /></Router></StrictMode>,
)
