import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "sonner";

// Global handler for unhandled promise rejections - prevents white screen crashes
window.addEventListener("unhandledrejection", (event) => {
  console.error("[UnhandledRejection]", event.reason);
  
  // Extract meaningful message
  let message = "Произошла непредвиденная ошибка";
  if (event.reason instanceof Error) {
    message = event.reason.message;
  } else if (typeof event.reason === "string") {
    message = event.reason;
  } else if (event.reason?.message) {
    message = event.reason.message;
  }
  
  // Show toast instead of crashing
  toast.error("Ошибка", {
    description: message.slice(0, 150),
    duration: 5000,
  });
  
  // Prevent default browser error handling (which can crash React)
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
