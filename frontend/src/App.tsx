import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/routes'
import { AuthLayout, Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { Placeholder } from './pages/Placeholder'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<Placeholder titleKey="pages.chat" />} />
              <Route path="/chat/:sessionId" element={<Placeholder titleKey="pages.chat" />} />
              <Route path="/chat/:sessionId/task" element={<Placeholder titleKey="pages.task" />} />
              <Route path="/pricing" element={<Placeholder titleKey="pages.pricing" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
