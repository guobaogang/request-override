import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import App from './pages/app.jsx'
import MainPage from "./pages/mainPage.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MainPage />
  </StrictMode>,
)
