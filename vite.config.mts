import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import monacoEditorPlugin, {
    type IMonacoEditorOpts,
} from "vite-plugin-monaco-editor";
import svgr from "vite-plugin-svgr";
const monacoEditorPluginDefault = (monacoEditorPlugin as any).default as (
  options: IMonacoEditorOpts,
) => any;

export default defineConfig({
  root: "src",
  server: {
    port: 9097,
    headers: {
      "Content-Security-Policy": `
        default-src 'self' http: https: ws: wss: ipc:;
        script-src 'self' 'unsafe-eval' 'unsafe-inline' http: https:;
        style-src 'self' 'unsafe-inline' http: https:;
        img-src 'self' data: blob: http: https:;
        font-src 'self' data: http: https:;
        connect-src 'self' ws: wss: http: https: ipc: ipc://localhost;
        frame-src 'self' http: https:;
        worker-src 'self' blob:;
        child-src 'self' blob:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'self';
      `.replace(/\s+/g, " ").trim(),
    },
  },
  plugins: [
    svgr(),
    react(),
    legacy({
      renderLegacyChunks: false,
      modernTargets: ["edge>=109", "safari>=13"],
      modernPolyfills: true,
      additionalModernPolyfills: [
        "core-js/modules/es.object.has-own.js",
        "core-js/modules/web.structured-clone.js",
        path.resolve("./src/polyfills/matchMedia.js"),
        path.resolve("./src/polyfills/WeakRef.js"),
        path.resolve("./src/polyfills/RegExp.js"),
      ],
    }),
    monacoEditorPluginDefault({
      languageWorkers: ["editorWorkerService", "typescript", "css"],
      customWorkers: [
        {
          label: "yaml",
          entry: "monaco-yaml/yaml.worker",
        },
      ],
      globalAPI: false,
    }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020",
    minify: "terser",
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: false,
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: true,
    // 减少内存使用
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      treeshake: {
        preset: "recommended",
        moduleSideEffects: (id) => !/\.css$/.test(id),
        tryCatchDeoptimization: false,
      },
      // 优化内存使用
      maxParallelFileOps: 2,
      output: {
        compact: true,
        experimentalMinChunkSize: 30000,
        dynamicImportInCjs: true,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Monaco Editor should be a separate chunk
            if (id.includes("monaco-editor")) return "monaco-editor";

            // React-related libraries (react, react-dom, react-router-dom, etc.)
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              id.includes("react-transition-group") ||
              id.includes("react-error-boundary") ||
              id.includes("react-hook-form") ||
              id.includes("react-markdown") ||
              id.includes("react-virtuoso")
            ) {
              return "react";
            }

            // Utilities chunk: group commonly used utility libraries
            if (
              id.includes("axios") ||
              id.includes("lodash-es") ||
              id.includes("dayjs") ||
              id.includes("js-base64") ||
              id.includes("js-yaml") ||
              id.includes("cli-color") ||
              id.includes("nanoid")
            ) {
              return "utils";
            }

            // Tauri-related plugins: grouping together Tauri plugins
            if (
              id.includes("@tauri-apps/api") ||
              id.includes("@tauri-apps/plugin-clipboard-manager") ||
              id.includes("@tauri-apps/plugin-dialog") ||
              id.includes("@tauri-apps/plugin-fs") ||
              id.includes("@tauri-apps/plugin-global-shortcut") ||
              id.includes("@tauri-apps/plugin-notification") ||
              id.includes("@tauri-apps/plugin-process") ||
              id.includes("@tauri-apps/plugin-shell") ||
              id.includes("@tauri-apps/plugin-updater")
            ) {
              return "tauri-plugins";
            }

            // Material UI libraries (grouped together)
            if (
              id.includes("@mui/material") ||
              id.includes("@mui/icons-material") ||
              id.includes("@mui/lab") ||
              id.includes("@mui/x-data-grid")
            ) {
              return "mui";
            }

            // Small vendor packages
            const pkg = id.match(/node_modules\/([^\/]+)/)?.[1];
            if (pkg && pkg.length < 8) return "small-vendors";

            // Large vendor packages
            return "large-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "@root": path.resolve("."),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  define: {
    OS_PLATFORM: `"${process.platform}"`,
    'process.env': process.env
  },
});
