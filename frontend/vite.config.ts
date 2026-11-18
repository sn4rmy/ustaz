import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The backend allows CORS only for this origin (CORS_ORIGINS in backend/.env).
  server: { port: 5173, strictPort: true },
})
