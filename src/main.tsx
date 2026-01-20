import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Best-effort: disable iOS Safari pinch/double-tap zoom to feel like a native app.
// Note: Some iOS accessibility zoom/text settings can't be fully overridden by websites.
(() => {
  const opts: AddEventListenerOptions = { passive: false };

  // iOS Safari pinch zoom emits non-standard gesture events.
  for (const evt of ["gesturestart", "gesturechange", "gestureend"] as const) {
    document.addEventListener(evt, (e) => e.preventDefault(), opts);
  }

  // Prevent double-tap zoom.
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    opts
  );
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
