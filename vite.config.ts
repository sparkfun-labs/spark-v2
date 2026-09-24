import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  // HELIUS_RPC_URL has no VITE_ prefix, so it is only read here and never bundled into the client.
  const env = loadEnv(mode, process.cwd(), '')
  const rpc = new URL(env.HELIUS_RPC_URL || 'https://solana-rpc.publicnode.com')

  return {
    plugins: [react(), tailwindcss(), nodePolyfills({ globals: { Buffer: true, process: true } })],
    server: {
      // Mirrors the Cloudflare Pages Function in functions/api/rpc.ts during local dev.
      proxy: {
        '/api/rpc': {
          target: rpc.origin,
          changeOrigin: true,
          rewrite: () => `${rpc.pathname}${rpc.search}`,
        },
      },
    },
  }
})
