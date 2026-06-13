"use client";

import { useState, useEffect } from "react";
import { Video, Keyboard, Sparkles, ArrowRight, User } from "lucide-react";

export default function Home() {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  // Safely load username after mounting to avoid hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexin_meet_username");
      if (saved) {
        setTimeout(() => {
          setUserName(saved);
        }, 0);
      }
    } catch (e) {
      console.warn("LocalStorage blocked:", e);
    }
  }, []);

  const saveName = (name: string) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("nexin_meet_username", name);
      }
    } catch (e) {
      console.warn("LocalStorage write blocked:", e);
    }
  };

  const handleCreateMeeting = (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      console.log("[Lobby] Create meeting requested");
      const finalName = userName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      
      const p1 = Math.random().toString(36).substring(2, 5);
      const p2 = Math.random().toString(36).substring(2, 6);
      const p3 = Math.random().toString(36).substring(2, 5);
      const generatedCode = `${p1}-${p2}-${p3}`;
      
      console.log(`[Lobby] Saving name: ${finalName}, generated code: ${generatedCode}`);
      saveName(finalName);
      
      console.log("[Lobby] Redirecting natively (replace) to /room/" + generatedCode);
      window.location.replace(`/room/${generatedCode}`);
    } catch (err) {
      console.error("[Lobby] Error during Create Meeting click:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Create Meeting Error: " + msg);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      console.log("[Lobby] Join meeting requested");
      if (!roomCode.trim()) {
        setError("Please enter a valid room code");
        return;
      }

      const finalName = userName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanedCode = roomCode.trim().toLowerCase().replace(/\s+/g, "-");
      
      console.log(`[Lobby] Saving name: ${finalName}, joining code: ${cleanedCode}`);
      saveName(finalName);
      
      console.log("[Lobby] Redirecting natively (replace) to /room/" + cleanedCode);
      window.location.replace(`/room/${cleanedCode}`);
    } catch (err) {
      console.error("[Lobby] Error during Join Meeting submit:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Join Meeting Error: " + msg);
    }
  };

  return (
    <div className="lobby-wrapper">
      {/* Visual background gradient lights */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div className="lobby-card glass-panel">
        
        {/* Branding header */}
        <div className="logo-section">
          <div className="logo-icon">
            <Video size={24} color="#ffffff" />
          </div>
          <span className="logo-text">NexIn Meet</span>
          <span className="logo-badge">P2P v1.0</span>
        </div>

        <div className="lobby-header-text">
          <h2>Premium Video Meetings</h2>
          <p>Completely free, secure, and running peer-to-peer.</p>
        </div>

        {/* Error alert if any */}
        {error && (
          <div 
            style={{ 
              background: "rgba(244, 63, 94, 0.1)", 
              border: "1px solid rgba(244, 63, 94, 0.3)", 
              color: "#f43f5e", 
              padding: "10px 14px", 
              borderRadius: "8px", 
              fontSize: "13px",
              textAlign: "center" 
            }}
          >
            {error}
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* User Name input */}
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">
              <span>Your Name</span>
              <span style={{ fontSize: "11px", color: "var(--primary)" }}>Required</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="username-input"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (e.target.value.trim()) setError("");
                }}
                style={{ width: "100%", paddingLeft: "42px" }}
                maxLength={24}
              />
              <User 
                size={18} 
                style={{ 
                  position: "absolute", 
                  left: "14px", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  color: "var(--text-muted)" 
                }} 
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {/* Create Meeting Button */}
            <button 
              className="btn btn-primary" 
              onClick={handleCreateMeeting}
              style={{ width: "100%" }}
            >
              <Sparkles size={18} />
              Create New Meeting
            </button>
          </div>

          <div className="divider">OR</div>

          {/* Join Meeting input & action */}
          <form onSubmit={handleJoinMeeting} className="form-group">
            <label className="form-label" htmlFor="roomcode-input">
              Join with Code
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  id="roomcode-input"
                  type="text"
                  placeholder="abc-defg-hij"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value);
                    if (e.target.value.trim()) setError("");
                  }}
                  style={{ width: "100%", paddingLeft: "42px" }}
                />
                <Keyboard 
                  size={18} 
                  style={{ 
                    position: "absolute", 
                    left: "14px", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    color: "var(--text-muted)" 
                  }} 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-secondary" 
                style={{ padding: "12px" }}
                aria-label="Join Room"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </form>

        </div>

        {/* Footer info */}
        <div style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}>
          By joining, you agree to secure peer-to-peer data transmission.
        </div>

      </div>
    </div>
  );
}
