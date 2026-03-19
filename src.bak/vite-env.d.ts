/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LL_API: string;
  readonly VITE_SALESFORCE_ORG_ID: string;
  readonly VITE_SALESFORCE_DEV_NAME: string;
  readonly VITE_SALESFORCE_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
