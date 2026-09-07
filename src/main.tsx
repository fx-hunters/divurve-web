import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./app/root";
import "./styles/tokens.css";
import "./styles/layout.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
