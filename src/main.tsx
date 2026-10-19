import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { installModuleRecovery } from "@/lib/moduleRecovery";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";

installModuleRecovery();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
