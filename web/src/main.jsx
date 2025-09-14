import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import App from "./app.jsx"
import { ToastProvider } from "./components/Toast.jsx"

createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <App />
  </ToastProvider>
  <HashRouter>
    <App />
  </HashRouter>
)
