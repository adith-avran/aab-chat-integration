import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        [env.VITE_LL_API]: {
          target: "https://d3kg6m1lbsayn8.cloudfront.net",
          changeOrigin: true,
        },
        [env.VITE_SF_API]: {
          target: "https://d3kg6m1lbsayn8.cloudfront.net",
          changeOrigin: true,
        },
      },
    },
  };
});
