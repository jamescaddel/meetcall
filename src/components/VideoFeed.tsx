"use client";

import { useEffect, useRef } from "react";

interface VideoFeedProps {
  stream: MediaStream | null | undefined;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}

export function VideoFeed({ stream, muted = false, mirrored = false, className = "" }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      controls={false}
      muted={muted}
      className={`video-element ${className} ${mirrored ? "mirrored" : ""}`}
    />
  );
}
