import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexIn Meet | Premium Video Conferencing",
  description: "Secure, high-quality, real-time video meetings built with Next.js and WebRTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var originalLog = console.log;
              var originalError = console.error;
              var originalWarn = console.warn;

              window.logToDebugBox = function(text, color) {
                var consoleDiv = document.getElementById("client-debug-console");
                var logsContainer = document.getElementById("client-debug-logs-container");
                if (consoleDiv && logsContainer) {
                  consoleDiv.style.display = "flex";
                  var p = document.createElement("p");
                  p.style.color = color || "#a7f3d0";
                  p.style.margin = "0";
                  p.style.whiteSpace = "pre-wrap";
                  p.style.wordBreak = "break-all";
                  p.innerText = "[" + new Date().toLocaleTimeString() + "] " + text;
                  logsContainer.appendChild(p);
                  logsContainer.scrollTop = logsContainer.scrollHeight;
                }
              };

              function wrapLog(original, color) {
                return function() {
                  if (typeof original === "function") {
                    original.apply(console, arguments);
                  }
                  var msg = Array.from(arguments).map(function(x) {
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
                  window.logToDebugBox(msg, color);
                };
              }

              try {
                var currentLog = originalLog;
                var currentWarn = originalWarn;
                var currentError = originalError;

                var wrappedLog = wrapLog(currentLog, "#a7f3d0");
                var wrappedWarn = wrapLog(currentWarn, "#fde047");
                var wrappedError = wrapLog(currentError, "#f87171");

                Object.defineProperty(console, "log", {
                  get: function() { return wrappedLog; },
                  set: function(newVal) {
                    currentLog = newVal;
                    wrappedLog = wrapLog(currentLog, "#a7f3d0");
                  },
                  configurable: true,
                  enumerable: true
                });

                Object.defineProperty(console, "warn", {
                  get: function() { return wrappedWarn; },
                  set: function(newVal) {
                    currentWarn = newVal;
                    wrappedWarn = wrapLog(currentWarn, "#fde047");
                  },
                  configurable: true,
                  enumerable: true
                });

                Object.defineProperty(console, "error", {
                  get: function() { return wrappedError; },
                  set: function(newVal) {
                    currentError = newVal;
                    wrappedError = wrapLog(currentError, "#f87171");
                  },
                  configurable: true,
                  enumerable: true
                });

                window.onerror = function(message, source, lineno, colno, error) {
                  window.logToDebugBox("Uncaught Error: " + message + " (at " + source + ":" + lineno + ")", "#f87171");
                  return false;
                };

                window.onunhandledrejection = function(event) {
                  window.logToDebugBox("Unhandled Promise: " + event.reason, "#fb923c");
                };
              } catch (e) {
                originalLog && originalLog("Failed to override console", e);
              }
              
              // Document-level native event listeners to bypass React hydration blocks
              document.addEventListener("submit", function(event) {
                var target = event.target;
                if (target && target.tagName === "FORM") {
                  var nameInput = document.getElementById("name-input");
                  if (nameInput) {
                    event.preventDefault();
                    event.stopPropagation();
                    var finalName = nameInput.value.trim() || "Guest_" + Math.floor(1000 + Math.random() * 9000);
                    try {
                      localStorage.setItem("nexin_meet_username", finalName);
                    } catch(e) {}
                    window.location.reload();
                  }
                }
              }, true);

              document.addEventListener("click", function(event) {
                var target = event.target;
                while (target && target !== document.body) {
                  // Create meeting button click interceptor
                  if (target.tagName === "BUTTON" && (target.innerText.includes("Create New Meeting") || target.id === "create-meet-btn")) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    var nameInput = document.getElementById("username-input");
                    var userName = nameInput ? nameInput.value : "";
                    var finalName = userName.trim() || "Guest_" + Math.floor(1000 + Math.random() * 9000);
                    
                    var p1 = Math.random().toString(36).substring(2, 5);
                    var p2 = Math.random().toString(36).substring(2, 6);
                    var p3 = Math.random().toString(36).substring(2, 5);
                    var code = p1 + "-" + p2 + "-" + p3;
                    
                    try {
                      localStorage.setItem("nexin_meet_username", finalName);
                    } catch(e) {}
                    
                    window.location.replace("/room/" + code);
                    return;
                  }
                  
                  // Join meeting arrow button click interceptor
                  if (target.tagName === "BUTTON" && target.ariaLabel === "Join Room") {
                    var codeInput = document.getElementById("roomcode-input");
                    var code = codeInput ? codeInput.value : "";
                    if (code.trim()) {
                      event.preventDefault();
                      event.stopPropagation();
                      
                      var nameInput = document.getElementById("username-input");
                      var userName = nameInput ? nameInput.value : "";
                      var finalName = userName.trim() || "Guest_" + Math.floor(1000 + Math.random() * 9000);
                      var cleanedCode = code.trim().toLowerCase().replace(/\\s+/g, "-");
                      
                      try {
                        localStorage.setItem("nexin_meet_username", finalName);
                      } catch(e) {}
                      
                      window.location.replace("/room/" + cleanedCode);
                      return;
                    }
                  }
                  target = target.parentNode;
                }
              }, true); // Use capture phase so we intercept before React's bubble phase!

              document.addEventListener("DOMContentLoaded", function() {
                var btn = document.getElementById("close-debug-btn");
                if (btn) {
                  btn.onclick = function() {
                    var el = document.getElementById("client-debug-console");
                    if (el) el.style.display = "none";
                  };
                }
              });
            `
          }}
        />
      </head>
      <body>
        {children}
        
        {/* Floating Debug Console Banner for Remote Auditing */}
        <div 
          id="client-debug-console" 
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "360px",
            height: "260px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "2px solid #ef4444",
            borderRadius: "12px",
            padding: "16px",
            color: "#ffffff",
            fontSize: "12px",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            fontFamily: "sans-serif"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "6px", marginBottom: "8px", fontWeight: "bold", flexShrink: 0 }}>
            <span style={{ color: "#ef4444" }}>Console Debug Log</span>
            <button 
              id="close-debug-btn" 
              style={{ color: "#94a3b8", cursor: "pointer", background: "none", border: "none", fontSize: "11px" }}
            >
              Close
            </button>
          </div>
          <div 
            id="client-debug-logs-container" 
            style={{ 
              flexGrow: 1, 
              overflowY: "auto", 
              fontFamily: "monospace", 
              fontSize: "11px",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
              [System] Console hook active. Waiting for logs...
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
