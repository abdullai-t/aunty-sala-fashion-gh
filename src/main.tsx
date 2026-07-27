
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { applyClientTheme } from "./config/client";
  import { clientConfig } from "./config/clients";
  import "./styles/index.css";

  applyClientTheme(clientConfig);
  createRoot(document.getElementById("root")!).render(<App />);
