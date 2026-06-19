import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let API_URL;
  if (env.VITE_CHAT_APP_BRANCH === "DEV") {
    API_URL = "https://www.dev.gccchat.abb.com";
  } else if (env.VITE_CHAT_APP_BRANCH === "TEST") {
    API_URL = "https://www.test.gccchat.abb.com";
  } else if (env.VITE_CHAT_APP_BRANCH === "PROD") {
    API_URL = "https://www.gccchat.abb.com";
  // (env.VITE_CHAT_APP_BRANCH === "STAGE")
  } else {
    API_URL = "https://www.stage.gccchat.abb.com";
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
