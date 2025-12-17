import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  // Change 'gig-mini-cours' to your repository name if different
  base: process.env.NODE_ENV === 'production' ? '/gig-mini-cours/' : '/',
})

