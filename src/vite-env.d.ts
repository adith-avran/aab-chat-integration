/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LL_API: string;
  readonly VITE_SF_API: string;
  readonly VITE_CHAT_APP_BRANCH: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
