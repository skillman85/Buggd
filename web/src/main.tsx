import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/google-sans-code/latin-400.css";
import "@fontsource/google-sans-code/latin-500.css";
import "./styles/shadcn.css";
import "./styles/tokens.css";
import "./styles/app.css";
import { ThemeProvider } from "./theme/ThemeProvider";
import { PreferencesProvider } from "./contexts/Preferences";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
