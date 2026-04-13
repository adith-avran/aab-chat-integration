import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let API_URL;
  if (env.VITE_CHAT_APP_BRANCH === "DEV") {
    API_URL = "https://dg3aic71lh9nz.cloudfront.net";
  } else if (env.VITE_CHAT_APP_BRANCH === "TEST") {
    API_URL = "https://d3kg6m1lbsayn8.cloudfront.net";
  }
  // (env.VITE_CHAT_APP_BRANCH === "STAGE")
  else {
    API_URL = "https://d19bupr2o85mtq.cloudfront.net";
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        [env.VITE_LL_API]: {
          target: API_URL,
          changeOrigin: true,
        },
        [env.VITE_SF_API]: {
          target: API_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
