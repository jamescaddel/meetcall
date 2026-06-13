"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { MediaConnection } from "peerjs";

export interface Participant {
  userId: string;
  userName: string;
  stream?: MediaStream;
  isMutedAudio: boolean;
  isMutedVideo: boolean;
  isScreenSharing: boolean;
  socketId?: string;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

interface RoomParticipantInfo {
  userId: string;
  userName: string;
  socketId: string;
}

export function useWebRTC(roomId: string, userName: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [localUserId, setLocalUserId] = useState<string>("");
  const [isSimulated, setIsSimulated] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Track open PeerJS calls: { [userId]: MediaConnection }
  const callsRef = useRef<Record<string, MediaConnection>>({});
  
  // Custom helper to trigger toast notifications
  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Initialize Local Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let fallbackIntervalId: NodeJS.Timeout | null = null;
    let fallbackOscillator: OscillatorNode | null = null;
    let fallbackAudioCtx: AudioContext | null = null;
    
    async function startMedia() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia is not supported or not in a secure context (HTTPS/localhost)");
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 360 },
            height: { ideal: 640 },
            aspectRatio: { ideal: 0.5625 },
            frameRate: { ideal: 24 }
          },
          audio: true
        });
        
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        console.error("Error accessing user media:", err);
        setIsSimulated(true);
        showToast("Insecure Origin / Camera blocked. Using simulated feed.");
        
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 360;
          canvas.height = 640;
          const ctx = canvas.getContext("2d");
          
          let angle = 0;
          fallbackIntervalId = setInterval(() => {
            if (ctx) {
              ctx.fillStyle = "#0f111a";
              ctx.fillRect(0, 0, 360, 640);
              
              // Draw a dynamic glowing circle to simulate activity
              ctx.fillStyle = "#6366f1";
              ctx.beginPath();
              ctx.arc(180 + Math.cos(angle) * 80, 320 + Math.sin(angle) * 120, 25, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = "#94a3b8";
              ctx.font = "14px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("Simulating camera feed", 180, 260);
              ctx.fillText("(Insecure HTTP Origin)", 180, 290);
              ctx.fillText("Use localhost:3000", 180, 320);
              angle += 0.04;
            }
          }, 50);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const videoTrack = (canvas as any).captureStream(20).getVideoTracks()[0];
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fallbackAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          fallbackOscillator = fallbackAudioCtx.createOscillator();
          const dst = fallbackAudioCtx.createMediaStreamDestination();
          fallbackOscillator.connect(dst);
          fallbackOscillator.start();
          const audioTrack = dst.stream.getAudioTracks()[0];
          
          stream = new MediaStream([videoTrack, audioTrack]);
          localStreamRef.current = stream;
          setLocalStream(stream);
        } catch (fallbackErr) {
          console.error("Failed to generate fallback stream:", fallbackErr);
        }
      }
    }

    startMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (fallbackIntervalId) {
        clearInterval(fallbackIntervalId);
      }
      if (fallbackOscillator) {
        fallbackOscillator.stop();
      }
      if (fallbackAudioCtx) {
        fallbackAudioCtx.close();
      }
    };
  }, [showToast]);

  // Connect Socket.io and PeerJS
  useEffect(() => {
    if (!localStream) return;

    // Check if WebRTC is supported (blocked on insecure HTTP origins)
    const isWebRTCSupported = typeof window !== "undefined" && 
      ((window as any).RTCPeerConnection || 
       (window as any).mozRTCPeerConnection || 
       (window as any).webkitRTCPeerConnection);

    if (!isWebRTCSupported) {
      showToast("WebRTC blocked/unsupported. You must use HTTPS or localhost to connect.");
      return;
    }

    const host = window.location.hostname;
    // Connect to backend server running on port 3001
    const serverUrl = `http://${host}:3001`;
    
    const socket = io(serverUrl);
    socketRef.current = socket;

    // Generate unique local user ID
    const myUserId = `usr_${Math.random().toString(36).substring(2, 9)}`;

    // Setup local PeerJS instance
    const peer = new Peer(myUserId, {
      host: host,
      port: 3001,
      path: "/peerjs"
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log(`[PeerJS] Opened with ID: ${id}`);
      setLocalUserId(id);
      socket.emit("join-room", { roomId, userId: id, userName });
    });

    peer.on("error", (err) => {
      console.error("[PeerJS] Error:", err);
      showToast(`Peer connection error: ${err.type}`);
    });

    // Handle incoming calls (we are the receiver)
    peer.on("call", (incomingCall: MediaConnection) => {
      console.log(`[PeerJS] Receiving call from peer: ${incomingCall.peer}`);
      
      // Answer the call with our local stream
      incomingCall.answer(localStreamRef.current || undefined);
      
      incomingCall.on("stream", (remoteStream) => {
        console.log(`[PeerJS] Received stream from call: ${incomingCall.peer}`);
        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === incomingCall.peer
              ? { ...p, stream: remoteStream }
              : p
          )
        );
      });

      // Save call instance
      callsRef.current[incomingCall.peer] = incomingCall;
    });

    // Socket: Get existing participants in the room
    socket.on("get-participants", (roomParticipants: RoomParticipantInfo[]) => {
      console.log("[Socket] Existing participants:", roomParticipants);
      
      // Add existing users to state (stream will be populated when calls connect)
      const formattedParticipants = roomParticipants.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        isMutedAudio: false,
        isMutedVideo: false,
        isScreenSharing: false,
        socketId: p.socketId
      }));
      setParticipants(formattedParticipants);

      // Call each existing participant
      roomParticipants.forEach((p) => {
        console.log(`[PeerJS] Calling peer: ${p.userId}`);
        const call = peer.call(p.userId, localStreamRef.current!);
        
        call.on("stream", (remoteStream) => {
          console.log(`[PeerJS] Received stream from peer call: ${p.userId}`);
          setParticipants((prev) =>
            prev.map((part) =>
              part.userId === p.userId
                ? { ...part, stream: remoteStream }
                : part
            )
          );
        });

        // Save call instance
        callsRef.current[p.userId] = call;
      });
    });

    // Socket: New user connects
    socket.on("user-connected", ({ userId, userName: connectedName, socketId }: { userId: string; userName: string; socketId: string }) => {
      console.log(`[Socket] User connected event: ${connectedName} (${userId})`);
      showToast(`${connectedName} joined the room`);
      
      // Add user to state
      setParticipants((prev) => {
        // Prevent duplicate entries
        if (prev.some((p) => p.userId === userId)) return prev;
        return [
          ...prev,
          {
            userId,
            userName: connectedName,
            isMutedAudio: false,
            isMutedVideo: false,
            isScreenSharing: false,
            socketId
          }
        ];
      });
    });

    // Socket: User disconnected
    socket.on("user-disconnected", ({ userId, userName: disconnectedName }: { userId: string; userName: string }) => {
      console.log(`[Socket] User disconnected event: ${disconnectedName} (${userId})`);
      showToast(`${disconnectedName} left the room`);

      // Close PeerJS call if exists
      if (callsRef.current[userId]) {
        callsRef.current[userId].close();
        delete callsRef.current[userId];
      }

      // Remove from state
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });

    // Socket: User toggled audio
    socket.on("user-toggle-audio", ({ userId, isMuted }: { userId: string; isMuted: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isMutedAudio: isMuted } : p))
      );
    });

    // Socket: User toggled video
    socket.on("user-toggle-video", ({ userId, isMuted }: { userId: string; isMuted: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isMutedVideo: isMuted } : p))
      );
    });

    // Socket: User toggled screen share
    socket.on("user-toggle-screen-share", ({ userId, isSharing }: { userId: string; isSharing: boolean }) => {
      showToast(isSharing ? `Someone started presenting` : `Someone stopped presenting`);
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isScreenSharing: isSharing } : p))
      );
    });

    // Socket: Receive chat messages
    socket.on("receive-message", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      console.log("[WebRTC] Cleaning up connections...");
      socket.disconnect();
      peer.destroy();
      
      // Close all calls
      Object.values(callsRef.current).forEach((call) => call.close());
      callsRef.current = {};
    };
  }, [localStream, roomId, userName, showToast]);

  // Audio Toggle Action
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsAudioMuted(!nextState);
        socketRef.current?.emit("toggle-audio", { isMuted: !nextState });
      }
    }
  }, []);

  // Video Toggle Action
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoMuted(!nextState);
        socketRef.current?.emit("toggle-video", { isMuted: !nextState });
      }
    }
  }, []);

  // Send Chat Message Action
  const sendChatMessage = useCallback((content: string) => {
    if (!content.trim() || !socketRef.current) return;
    
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    
    socketRef.current.emit("send-message", {
      content,
      timestamp
    });
  }, []);

  // Screen share teardown helper
  const stopScreenShareDirectly = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    
    setIsScreenSharing(false);
    socketRef.current?.emit("toggle-screen-share", { isSharing: false });
    showToast("Stopped screen presentation");

    // Revert to camera video track in all active calls
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      Object.values(callsRef.current).forEach((callInstance) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const peerConn = (callInstance as any).peerConnection;
        if (peerConn) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sender = peerConn.getSenders().find((s: any) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        }
      });
    }
  }, [showToast]);

  // Screen Sharing Toggle Action
  const toggleScreenShare = useCallback(async () => {
    if (!peerRef.current || !localStreamRef.current) return;

    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        socketRef.current?.emit("toggle-screen-share", { isSharing: true });

        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in all active calls
        Object.values(callsRef.current).forEach((callInstance) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const peerConn = (callInstance as any).peerConnection;
          if (peerConn) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sender = peerConn.getSenders().find((s: any) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(screenTrack);
            }
          }
        });

        // When sharing ends (e.g. from browser control panel)
        screenTrack.onended = () => {
          stopScreenShareDirectly();
        };

        showToast("You are presenting your screen");
      } catch (err) {
        console.error("Error getting screen stream:", err);
        showToast("Screen share cancelled or failed");
      }
    } else {
      stopScreenShareDirectly();
    }
  }, [isScreenSharing, showToast, stopScreenShareDirectly]);

  return {
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
  };
}
