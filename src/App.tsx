import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const SalesWithProvider = lazy(() => import('@/sales/SalesWithProvider'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={
            <Suspense
              fallback={<div className="h-full w-full animate-pulse bg-surface-1" />}
            >
              <SalesWithProvider />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
