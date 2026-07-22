import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Strip console.*/debugger from production bundles only — dev logging stays intact.
  // This is what keeps candidate PII (answers, emails) that get console.logged during
  // the exam out of the browser console on real, shared exam machines.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
}))
