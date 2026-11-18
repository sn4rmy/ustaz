import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { GuestOnly, RequireAuth } from './auth/routes'
import { AuthLayout, Layout } from './components/Layout'
import { ChatPage } from './pages/ChatPage'
import { ChatStartPage } from './pages/ChatStartPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PricingPage } from './pages/PricingPage'
import { RegisterPage } from './pages/RegisterPage'
import { TaskPage } from './pages/TaskPage'

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
              <Route path="/chat" element={<ChatStartPage />} />
              <Route path="/chat/:sessionId" element={<ChatPage />} />
              <Route path="/chat/:sessionId/task" element={<TaskPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
