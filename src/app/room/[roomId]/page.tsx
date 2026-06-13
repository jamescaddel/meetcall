"use client";

import { use, useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Video as CameraIcon, 
  VideoOff, 
  MonitorUp, 
  MessageSquare, 
  PhoneOff, 
  Copy, 
  Check, 
  Send, 
  X,
  Sparkles,
  User
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoFeed } from "@/components/VideoFeed";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  
  const [userName, setUserName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load username from storage after mounting to avoid hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexin_meet_username");
      if (saved) {
        setTimeout(() => {
          setUserName(saved);
        }, 0);
      } else {
        setTimeout(() => {
          setUserName("");
        }, 0);
      }
    } catch (e) {
      console.warn("LocalStorage access blocked:", e);
      setTimeout(() => {
        setUserName("");
      }, 0);
    }
  }, []);

  // Submit name prompt if name is not set
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = tempName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("nexin_meet_username", finalName);
      }
    } catch (e) {
      console.warn("LocalStorage write blocked:", e);
    }
    setUserName(finalName);
  };

  // If name is not set yet, show name prompt
  if (userName === null) {
    return (
      <div className="lobby-wrapper">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        
        <div className="lobby-card glass-panel">
          <div className="logo-section">
            <span className="logo-text">NexIn Meet</span>
          </div>

          <div className="lobby-header-text">
            <h2>Joining Meeting</h2>
            <p>Please enter your name to connect with others.</p>
          </div>

          {nameError && (
            <div style={{ color: "#f43f5e", fontSize: "13px", textAlign: "center" }}>
              {nameError}
            </div>
          )}

          <form onSubmit={handleNameSubmit} className="form-group">
            <label className="form-label" htmlFor="name-input">Your Name</label>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <input
                id="name-input"
                type="text"
                placeholder="Enter your name"
                value={tempName}
                onChange={(e) => {
                  setTempName(e.target.value);
                  if (e.target.value.trim()) setNameError("");
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
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Join Meeting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active meeting room layout
  return <MeetingRoomContent roomId={roomId} userName={userName} showChat={showChat} setShowChat={setShowChat} chatInput={chatInput} setChatInput={setChatInput} copied={copied} setCopied={setCopied} chatBottomRef={chatBottomRef} />;
}

// Separate component for room content once username is guaranteed
function MeetingRoomContent({
  roomId,
  userName,
  showChat,
  setShowChat,
  chatInput,
  setChatInput,
  copied,
  setCopied,
  chatBottomRef
}: {
  roomId: string;
  userName: string;
  showChat: boolean;
  setShowChat: (val: boolean) => void;
  chatInput: string;
  setChatInput: (val: string) => void;
  copied: boolean;
  setCopied: (val: boolean) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    localStream,
    participants,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    chatMessages,
    notification,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    localUserId,
    isSimulated
  } = useWebRTC(roomId, userName);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat, chatBottomRef]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
  };

  const handleLeaveMeeting = () => {
    // Redirection cleans up all states and effects automatically
    window.location.href = "/";
  };

  // Determine dynamic CSS grid classes based on user counts
  const totalParticipants = participants.length + 1; // +1 for local stream
  let gridClass = "peers-many";
  if (totalParticipants === 1) gridClass = "peers-1";
  else if (totalParticipants === 2) gridClass = "peers-2";
  else if (totalParticipants === 3) gridClass = "peers-3";
  else if (totalParticipants === 4) gridClass = "peers-4";

  return (
    <div className="meeting-layout">
      {/* Toast Notification for connections/alerts */}
      {notification && (
        <div className="toast-notification">
          {notification}
        </div>
      )}

      {/* Main Video Stream Interface */}
      <div className="main-conference-area">
        
        {/* Dynamic Responsive Grid of video frames */}
        <div className={`video-grid ${gridClass}`}>
          
          {/* Local participant video card */}
          <div className={`video-card ${isScreenSharing ? "sharing-screen" : ""}`}>
            {localStream && !isVideoMuted ? (
              <VideoFeed 
                stream={localStream} 
                muted={true} 
                mirrored={!isScreenSharing && !isSimulated} // don't mirror screen shares or simulated text feeds
              />
            ) : (
              <div className="avatar-placeholder">
                {userName.substring(0, 2)}
              </div>
            )}
            
            <div className="video-card-overlay">
              <div className="video-card-top">
                {isAudioMuted && (
                  <span className="overlay-badge-icon">
                    <MicOff size={12} color="#ffffff" />
                  </span>
                )}
                {isScreenSharing && (
                  <span className="overlay-badge" style={{ background: "rgba(99,102,241,0.8)" }}>
                    <MonitorUp size={12} /> Presenting
                  </span>
                )}
              </div>
              <div className="video-card-bottom">
                <span className="overlay-badge">
                  {userName} (You)
                </span>
              </div>
            </div>
          </div>

          {/* Remote participants video cards */}
          {participants.map((p) => (
            <div key={p.userId} className={`video-card ${p.isScreenSharing ? "sharing-screen" : ""}`}>
              {p.stream && !p.isMutedVideo ? (
                <VideoFeed stream={p.stream} />
              ) : (
                <div className="avatar-placeholder">
                  {p.userName.substring(0, 2)}
                </div>
              )}
              
              <div className="video-card-overlay">
                <div className="video-card-top">
                  {p.isMutedAudio && (
                    <span className="overlay-badge-icon">
                      <MicOff size={12} color="#ffffff" />
                    </span>
                  )}
                  {p.isScreenSharing && (
                    <span className="overlay-badge" style={{ background: "rgba(99,102,241,0.8)" }}>
                      <MonitorUp size={12} /> Presenting
                    </span>
                  )}
                </div>
                <div className="video-card-bottom">
                  <span className="overlay-badge">
                    {p.userName}
                  </span>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* Floating Controller Panel */}
        <div className="controls-container glass-panel">
          
          {/* Room info on left */}
          <div className="controls-left-section">
            <button 
              className="room-info-btn" 
              onClick={handleCopyCode}
              title="Click to copy room code"
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span style={{ fontSize: "12px", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                  {roomId}
                </span>
              </span>
            </button>
          </div>

          {/* Core AV controls in center */}
          <div className="controls-center-section">
            {/* Audio Toggle */}
            <button 
              onClick={toggleAudio}
              className={`btn-icon-only ${isAudioMuted ? "active-danger" : ""}`}
              title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
              aria-label={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Video Toggle */}
            <button 
              onClick={toggleVideo}
              className={`btn-icon-only ${isVideoMuted ? "active-danger" : ""}`}
              title={isVideoMuted ? "Turn Camera On" : "Turn Camera Off"}
              aria-label={isVideoMuted ? "Turn camera on" : "Turn camera off"}
            >
              {isVideoMuted ? <VideoOff size={20} /> : <CameraIcon size={20} />}
            </button>

            {/* Screen Share Toggle */}
            <button 
              onClick={toggleScreenShare}
              className={`btn-icon-only ${isScreenSharing ? "active-success" : ""}`}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            >
              <MonitorUp size={20} />
            </button>

            {/* End Call Button */}
            <button 
              onClick={handleLeaveMeeting}
              className="btn-icon-only active-danger"
              style={{ background: "var(--danger)" }}
              title="Leave Meeting"
              aria-label="Leave meeting"
            >
              <PhoneOff size={20} />
            </button>
          </div>

          {/* Sidebar trigger on right */}
          <div className="controls-right-section">
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`btn-icon-only ${showChat ? "active-success" : ""}`}
              title="Chat"
              style={{ position: "relative" }}
              aria-label="Toggle chat sidebar"
            >
              <MessageSquare size={20} />
              {/* Message count badge if chat is closed and new messages exist */}
              {!showChat && chatMessages.length > 0 && (
                <span 
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    background: "var(--primary)",
                    color: "white",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    border: "2px solid #06070a"
                  }}
                >
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Slide-out In-Meeting Chat Drawer */}
      {showChat && (
        <div className="chat-sidebar-wrapper glass-panel">
          <div className="chat-header">
            <h3>
              <MessageSquare size={18} />
              Room Chat
            </h3>
            <button 
              onClick={() => setShowChat(false)}
              aria-label="Close chat"
              style={{ padding: "4px", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div 
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                  gap: "10px"
                }}
              >
                <Sparkles size={24} style={{ opacity: 0.5 }} />
                <span>Messages sent here are private to your call.</span>
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isMyMessage = msg.userId === localUserId;
                return (
                  <div 
                    key={index} 
                    className={`chat-message-bubble ${isMyMessage ? "outgoing" : "incoming"}`}
                  >
                    <div className="chat-message-info">
                      <span>{isMyMessage ? "You" : msg.userName}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="chat-message-content">
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="chat-input-area">
            <form onSubmit={handleChatSubmit} className="chat-input-form">
              <input
                type="text"
                placeholder="Send a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={!chatInput.trim()}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
