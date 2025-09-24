// File: src/main.tsx (Updated)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.tsx' // <-- NEW IMPORT

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* <-- WRAP WITH PROVIDER */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)