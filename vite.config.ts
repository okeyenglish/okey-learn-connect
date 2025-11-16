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
  },
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          
          // UI libraries
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          forms: ['@hookform/resolvers', 'react-hook-form', 'zod'],
          utils: ['class-variance-authority', 'clsx', 'tailwind-merge', 'date-fns'],
          
          // Landing page chunks - lazy loaded
          'landing-marketing': [
            './src/components/landing/Testimonials.tsx',
            './src/components/landing/CaseStudies.tsx',
            './src/components/landing/ClientLogos.tsx',
          ],
          'landing-features': [
            './src/components/landing/Features.tsx',
            './src/components/landing/RolesTabs.tsx',
            './src/components/landing/HowItWorks.tsx',
            './src/components/landing/WhoIsItFor.tsx',
          ],
          'landing-interactive': [
            './src/components/landing/AIShowcase.tsx',
            './src/components/landing/LiveStats.tsx',
            './src/components/landing/CrossPlatformSection.tsx',
          ],
          'landing-conversion': [
            './src/components/landing/Pricing.tsx',
            './src/components/landing/Comparison.tsx',
            './src/components/landing/FinalCTA.tsx',
          ],
          'landing-info': [
            './src/components/landing/Integrations.tsx',
            './src/components/landing/TechStack.tsx',
            './src/components/landing/FAQ.tsx',
            './src/components/landing/Roadmap.tsx',
            './src/components/landing/HowToStart.tsx',
          ]
        },
        // Optimize chunk loading
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    minify: true,
    // Reduce bundle size
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    exclude: ['lucide-react']
  }
}));
