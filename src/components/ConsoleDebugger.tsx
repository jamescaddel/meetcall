"use client";

import { useEffect } from "react";

export function ConsoleDebugger() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A helper to append logs to the UI debug box
    const logToDebugBox = (text: string, color?: string) => {
      const consoleDiv = document.getElementById("client-debug-console");
      const logsContainer = document.getElementById("client-debug-logs-container");
      if (consoleDiv && logsContainer) {
        // Automatically make sure it is shown as flex
        consoleDiv.style.display = "flex";
        
        const p = document.createElement("p");
        p.style.color = color || "#a7f3d0";
        p.style.margin = "0";
        p.style.whiteSpace = "pre-wrap";
        p.style.wordBreak = "break-all";
        p.innerText = "[" + new Date().toLocaleTimeString() + "] " + text;
        
        logsContainer.appendChild(p);
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    };

    // Keep references to the original ones
    let lastKnownLog = console.log;
    let lastKnownWarn = console.warn;
    let lastKnownError = console.error;

    const wrapLog = (original: any, color: string) => {
      // If it's already wrapped by us, don't wrap it again
      if (original && original.__isNexInHooked) {
        return original;
      }

      const wrapper = function(...args: any[]) {
        if (typeof original === "function") {
          original.apply(console, args);
        }
        const msg = args.map((x) => {
          if (x instanceof Error) {
            return x.stack || x.message || String(x);
          }
          if (typeof x === "object" && x !== null) {
            try {
              return JSON.stringify(x);
            } catch (e) {
              return "[Object]";
            }
          }
          return String(x);
        }).join(" ");
        logToDebugBox(msg, color);
      };

      (wrapper as any).__isNexInHooked = true;
      return wrapper;
    };

    let wrappedLog = wrapLog(lastKnownLog, "#a7f3d0");
    let wrappedWarn = wrapLog(lastKnownWarn, "#fde047");
    let wrappedError = wrapLog(lastKnownError, "#f87171");

    const applyHook = () => {
      try {
        if (console.log !== wrappedLog) {
          lastKnownLog = console.log;
          wrappedLog = wrapLog(lastKnownLog, "#a7f3d0");
          console.log = wrappedLog;
        }
        if (console.warn !== wrappedWarn) {
          lastKnownWarn = console.warn;
          wrappedWarn = wrapLog(lastKnownWarn, "#fde047");
          console.warn = wrappedWarn;
        }
        if (console.error !== wrappedError) {
          lastKnownError = console.error;
          wrappedError = wrapLog(lastKnownError, "#f87171");
          console.error = wrappedError;
        }
      } catch (e) {
        // fallback
      }
    };

    applyHook();

    // Check/re-apply every 200ms to override any libraries that replace console log
    const interval = setInterval(applyHook, 200);

    // Global uncaught error handlers
    const handleError = (event: ErrorEvent) => {
      logToDebugBox(`Uncaught Error: ${event.message} (at ${event.filename}:${event.lineno})`, "#f87171");
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      let reasonMsg = "";
      if (event.reason instanceof Error) {
        reasonMsg = event.reason.stack || event.reason.message;
      } else {
        try {
          reasonMsg = typeof event.reason === "object" ? JSON.stringify(event.reason) : String(event.reason);
        } catch (e) {
          reasonMsg = String(event.reason);
        }
      }
      logToDebugBox(`Unhandled Promise: ${reasonMsg}`, "#fb923c");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Attach click handler for closing the panel
    const btn = document.getElementById("close-debug-btn");
    const closeHandler = () => {
      const el = document.getElementById("client-debug-console");
      if (el) el.style.display = "none";
    };
    if (btn) {
      btn.addEventListener("click", closeHandler);
    }

    // Expose logToDebugBox globally so other hooks can call it directly
    (window as any).logToDebugBox = logToDebugBox;

    return () => {
      clearInterval(interval);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      if (btn) {
        btn.removeEventListener("click", closeHandler);
      }
    };
  }, []);

  return null;
}
