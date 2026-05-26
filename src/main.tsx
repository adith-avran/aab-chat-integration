import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@cloudscape-design/global-styles/index.css";
// src/main.tsx
// import ABBVoiceReg from './assets/fonts/ABBVoiceReg.woff';
// src/main.tsx
import { applyTheme } from '@cloudscape-design/components/theming';

applyTheme({
  theme: {
    tokens: {
      fontFamilyBase: "'ABBvoice', sans-serif",
    },
  },
});
// import { Amplify } from "aws-amplify";
// import outputs from "../amplify_outputs.json";

// Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
