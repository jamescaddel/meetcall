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
              window.onerror = function(message, source, lineno, colno, error) {
                var consoleDiv = document.getElementById("client-debug-console");
                if (consoleDiv) {
                  consoleDiv.style.display = "block";
                  var p = document.createElement("p");
                  p.style.color = "#f87171";
                  p.style.margin = "4px 0";
                  p.style.fontFamily = "monospace";
                  p.style.whiteSpace = "pre-wrap";
                  p.innerText = "[" + new Date().toLocaleTimeString() + "] Error: " + message + " (at " + source + ":" + lineno + ")";
                  consoleDiv.appendChild(p);
                }
                return false;
              };
              window.onunhandledrejection = function(event) {
                var consoleDiv = document.getElementById("client-debug-console");
                if (consoleDiv) {
                  consoleDiv.style.display = "block";
                  var p = document.createElement("p");
                  p.style.color = "#fb923c";
                  p.style.margin = "4px 0";
                  p.style.fontFamily = "monospace";
                  p.style.whiteSpace = "pre-wrap";
                  p.innerText = "[" + new Date().toLocaleTimeString() + "] Promise Rejection: " + event.reason;
                  consoleDiv.appendChild(p);
                }
              };
              
              // Document-level native event listeners to bypass React hydration blocks
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
            maxHeight: "260px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "2px solid #ef4444",
            borderRadius: "12px",
            padding: "16px",
            color: "#ffffff",
            fontSize: "12px",
            overflowY: "auto",
            zIndex: 999999,
            display: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            fontFamily: "sans-serif"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "6px", marginBottom: "8px", fontWeight: "bold" }}>
            <span style={{ color: "#ef4444" }}>Console Debug Log</span>
            <button 
              id="close-debug-btn" 
              style={{ color: "#94a3b8", cursor: "pointer", background: "none", border: "none", fontSize: "11px" }}
            >
              Close
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
