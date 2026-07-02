import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xyflow/react')) {
            return 'flow';
          }
          if (id.includes('@monaco-editor/react') || id.includes('monaco-editor')) {
            return 'monaco';
          }
        }
      }
    }
  }
})