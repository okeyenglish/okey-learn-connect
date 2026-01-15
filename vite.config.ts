import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent multiple React copies (fixes "Invalid hook call" / dispatcher is null)
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          // DO NOT separate react/react-dom - they must stay together to avoid dispatcher issues
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          forms: ['@hookform/resolvers', 'react-hook-form', 'zod'],
          utils: ['class-variance-authority', 'clsx', 'tailwind-merge', 'date-fns']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    minify: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000
  },
  // Force React to be bundled once
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    exclude: ['lucide-react'],
    force: true
  }
}));
