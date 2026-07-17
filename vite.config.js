import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    root: ".",
    build: {
      outDir: "dist",
      minify: "esbuild",
      sourcemap: false,
    },
    server: {
      port: 3000,
      open: false,
    },
    define: {
      __SUPABASE_URL__: JSON.stringify(env.SUPABASE_URL || ""),
      __SUPABASE_ANON__: JSON.stringify(env.SUPABASE_ANON || ""),
      __EMAILJS_PUBLIC_KEY__: JSON.stringify(env.EMAILJS_PUBLIC_KEY || ""),
      __EMAILJS_SERVICE_ID__: JSON.stringify(env.EMAILJS_SERVICE_ID || ""),
      __EMAILJS_TEMPLATE_ID__: JSON.stringify(env.EMAILJS_TEMPLATE_ID || ""),
      __DEVELOPER_EMAIL__: JSON.stringify(env.DEVELOPER_EMAIL || ""),
      __LOGIN_PASSWORD__: JSON.stringify(env.LOGIN_PASSWORD || ""),
      __VITE_PROD_URL__: JSON.stringify(env.VITE_PROD_URL || "https://makro-dash-7bz7.vercel.app"),
    },
  };
});
