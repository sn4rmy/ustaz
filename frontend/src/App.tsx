import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthLayout, Layout } from './components/Layout'
import { NotFoundPage } from './pages/NotFoundPage'
import { Placeholder } from './pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Placeholder titleKey="pages.login" />} />
          <Route path="/register" element={<Placeholder titleKey="pages.register" />} />
        </Route>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<Placeholder titleKey="pages.chat" />} />
          <Route path="/chat/:sessionId" element={<Placeholder titleKey="pages.chat" />} />
          <Route path="/chat/:sessionId/task" element={<Placeholder titleKey="pages.task" />} />
          <Route path="/pricing" element={<Placeholder titleKey="pages.pricing" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
