import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ParkingProvider } from './store.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<ParkingProvider><App /></ParkingProvider>)
