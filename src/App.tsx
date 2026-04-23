import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const SalesWithProvider = lazy(() => import('@/sales/SalesWithProvider'))
const ClientIntakePage = lazy(() => import('@/sales/intake/ClientIntakePage'))

const suspenseFallback = <div className="min-h-dvh w-full animate-pulse bg-surface-1" />

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/intake"
          element={
            <Suspense fallback={suspenseFallback}>
              <ClientIntakePage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={suspenseFallback}>
              <SalesWithProvider />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
