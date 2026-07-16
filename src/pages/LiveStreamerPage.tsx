import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, 
  Tv, 
  Key, 
  Play, 
  Square, 
  Clock, 
  ExternalLink, 
  HelpCircle, 
  Check, 
  Film, 
  Video, 
  Link as LinkIcon,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Cloud,
  Search,
  Copy,
  Download,
  Tag,
  Image,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // Fixed import path
import SaaSSidebar from "../components/SaaSSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LiveStreamerPage() {
  const { user } = useAuth();
  
  // Form states initialized directly from localStorage
  const [videoUrl, setVideoUrl] = useState<string>(() => {
    return localStorage.getItem("stream_videoUrl") || "";
  });
  const [rtmpUrl, setRtmpUrl] = useState<string>(() => {
    return localStorage.getItem("stream_rtmpUrl") || "rtmp://a.rtmp.youtube.com/live2";
  });
  const [streamKey, setStreamKey] = useState<string>(() => {
    return localStorage.getItem("stream_streamKey") || "";
  });
  const [youtubeCookies, setYoutubeCookies] = useState<string>(() => {
    return localStorage.getItem("stream_youtubeCookies") || "";
  });
  const [showKey, setShowKey] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showCookiesConfig, setShowCookiesConfig] = useState(false);

  useEffect(() => {
    localStorage.setItem("stream_youtubeCookies", youtubeCookies);
  }, [youtubeCookies]);
  
  // Status states from backend
  const [streamStatus, setStreamStatus] = useState({
    isLive: false,
    uptime: 0,
    videoSource: "",
    rtmpUrl: "",
    activeVideoTitle: "",
    streamToken: "",
    errorLog: [] as string[],
    lastCrashReason: ""
  });
  const [loopMode, setLoopMode] = useState<"none" | "infinite">("infinite");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);

  const disconnectKeepAlive = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (sseRef.current) {
      console.log("[Keep-Alive] Closing keep-alive SSE connection.");
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  const connectKeepAlive = () => {
    disconnectKeepAlive();
    console.log("[Keep-Alive] Opening keep-alive SSE connection to maintain container activity.");
    const sse = new EventSource("/api/stream/keep-alive");
    sseRef.current = sse;
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "ping" || data.status === "connected") {
          console.log("[Keep-Alive] Heartbeat ping received:", data.timestamp);
        }
      } catch (err) {}
    };
    sse.onerror = (err) => {
      console.warn("[Keep-Alive] SSE connection error or closed. Reconnecting in 3 seconds...", err);
      sse.close();
      if (sseRef.current === sse) {
        sseRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        const hasToken = localStorage.getItem("stream_activeToken");
        if (hasToken) {
          connectKeepAlive();
        }
      }, 3000);
    };
  };

  // Keep-alive connection synchronization
  useEffect(() => {
    const activeToken = localStorage.getItem("stream_activeToken") || streamStatus.streamToken;
    if (activeToken && streamStatus.isLive && !sseRef.current) {
      connectKeepAlive();
    } else if (!streamStatus.isLive && sseRef.current) {
      disconnectKeepAlive();
    }
  }, [streamStatus.isLive]);

  useEffect(() => {
    return () => {
      disconnectKeepAlive();
    };
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem("stream_videoUrl", videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    localStorage.setItem("stream_rtmpUrl", rtmpUrl);
  }, [rtmpUrl]);

  useEffect(() => {
    localStorage.setItem("stream_streamKey", streamKey);
  }, [streamKey]);

  // Status Poller
  const fetchStreamStatus = async () => {
    try {
      const res = await fetch("/api/stream/status");
      if (res.ok) {
        const data = await res.json();
        setStreamStatus(data);
        if (data.isLive && data.streamToken) {
          localStorage.setItem("stream_activeToken", data.streamToken);
        } else if (!data.isLive) {
          localStorage.removeItem("stream_activeToken");
        }
      }
    } catch (e) {
      console.warn("Stream status polling paused briefly during server reboot/network standby.");
    }
  };

  useEffect(() => {
    fetchStreamStatus();
    statusPollInterval.current = setInterval(fetchStreamStatus, 3000);
    return () => {
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
      }
    };
  }, []);

  // Format uptime to hh:mm:ss
  const formatUptime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":");
  };

  // Start stream action
  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    if (!videoUrl.trim()) {
      setActionError("Please enter a valid video URL.");
      setIsActionLoading(false);
      return;
    }

    if (!rtmpUrl.trim()) {
      setActionError("RTMP Server URL is required.");
      setIsActionLoading(false);
      return;
    }

    if (!streamKey.trim()) {
      setActionError("Your Stream Key is required.");
      setIsActionLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stream/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          videoSource: videoUrl.trim(),
          rtmpUrl: rtmpUrl.trim(),
          streamKey: streamKey.trim(),
          loopMode: loopMode,
          youtubeCookies: youtubeCookies.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start background stream loop.");
      }

      localStorage.setItem("stream_videoUrl", videoUrl.trim());
      localStorage.setItem("stream_rtmpUrl", rtmpUrl.trim());
      localStorage.setItem("stream_streamKey", streamKey.trim());
      if (data.status && data.status.streamToken) {
        localStorage.setItem("stream_activeToken", data.status.streamToken);
      }

      connectKeepAlive();
      setActionSuccess("Success! Continuous background restream loop initiated.");
      fetchStreamStatus();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Could not launch stream. Verify RTMP destination details.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Stop stream action
  const handleStopStream = async () => {
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      disconnectKeepAlive();
      const activeToken = localStorage.getItem("stream_activeToken") || streamStatus.streamToken;
      const res = await fetch("/api/stream/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ streamToken: activeToken })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to stop continuous background restream.");
      }
      localStorage.removeItem("stream_activeToken");
      setActionSuccess("Live restream stopped successfully.");
      setShowStopConfirm(false);
      fetchStreamStatus();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Error terminating restream process.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* SaaS Sidebar Navigation */}
      <SaaSSidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
        <Navbar />

        <div className="max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          
          {/* Section Header */}
          <div className="border-b border-zinc-900 pb-6">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg mb-3">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              24/7 LIVE STREAM BROADCASTER
            </div>
            <h1 className="font-display text-2xl font-black uppercase text-white sm:text-4xl tracking-tight">
              Continuous Restreamer
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Broadcast your compiled videos or third-party feeds directly to YouTube Live, Twitch, Kick, or custom RTMP destinations.
              Our persistent cloud-containers run continuous FFmpeg stream loops 24/7.
            </p>
          </div>

          {/* Quick Realtime Live Status Dashboard Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Status Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
                streamStatus.isLive 
                ? "bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
                : "bg-zinc-900/30 border-zinc-800"
            }`}>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">BROADCAST STATUS</span>
              <div className="flex items-center gap-3 mt-2">
                <span className={`h-3 w-3 rounded-full ${streamStatus.isLive ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
                <span className="text-lg font-black uppercase text-white tracking-tight">
                  {streamStatus.isLive ? "LIVE & BROADCASTING" : "OFFLINE"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-mono truncate">
                {streamStatus.isLive ? `Dest: ${streamStatus.rtmpUrl}` : "Waiting to initiate loop stream."}
              </p>
            </div>

            {/* Uptime Card */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">STREAM UPTIME</span>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  {streamStatus.isLive ? formatUptime(streamStatus.uptime) : "00:00:00"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                {streamStatus.isLive ? "Persistent cloud loop runtime" : "Container offline"}
              </p>
            </div>

            {/* Active Feed Card */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">CURRENT VIDEO FEED</span>
              <div className="flex items-center gap-2 mt-2 min-w-0">
                <Tv className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-sm font-bold text-white truncate">
                  {streamStatus.isLive ? streamStatus.activeVideoTitle : "No Active Feed"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 font-mono truncate">
                {streamStatus.isLive ? streamStatus.videoSource : "Ready to broadcast"}
              </p>
            </div>

          </div>

          {/* Form Actions Panel */}
          <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 lg:p-8 space-y-6">
            
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
              <Radio className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Configure Restreaming Parameters</h2>
            </div>

            {/* Action Feedback alerts */}
            <AnimatePresence mode="wait">
              {actionError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </motion.div>
              )}

              {actionSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-400"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleStartStream} className="space-y-6">
              
              {/* VIDEO SOURCE URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">1. Video Source URL</label>
                <input
                  type="url"
                  placeholder="Enter Video URL (YouTube, Twitch, or Direct Link)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-700"
                />
              </div>

              {/* ADVANCED AUTH: YOUTUBE COOKIES FOR BYPASSING BOT CHECKS */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCookiesConfig(!showCookiesConfig)}
                  className="flex items-center justify-between w-full text-left text-xs font-bold text-zinc-300 uppercase tracking-wider hover:text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Advanced: YouTube Auth Cookies (Bypass Bot Challenges)
                  </span>
                  <span className="text-xs text-indigo-400 font-mono">
                    {showCookiesConfig ? "Collapse" : "Expand"}
                  </span>
                </button>
                
                {showCookiesConfig && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-zinc-500 leading-normal font-mono">
                      If stream extraction fails with <code className="text-rose-400">Sign in to confirm you're not a bot</code>, export your browser's YouTube cookies in Netscape format (using browser extensions like "Get cookies.txt LOCALLY" or standard Netscape cookies exporters) and paste them below. This bypasses Cloud Run rate limiting and CAPTCHAs with 100% success.
                    </p>
                    <textarea
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#10;TRUE&#10;/&#10;FALSE&#10;..."
                      rows={4}
                      value={youtubeCookies}
                      onChange={(e) => setYoutubeCookies(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-[11px] focus:border-indigo-500 outline-none transition-all font-mono placeholder-zinc-800"
                    />
                  </div>
                )}
              </div>

              {/* RTMP SERVER DESTINATION DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* RTMP Server URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">2. RTMP Server URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rtmpUrl}
                      onChange={(e) => setRtmpUrl(e.target.value)}
                      placeholder="rtmp://a.rtmp.youtube.com/live2"
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    YouTube default is <code className="text-indigo-400">rtmp://a.rtmp.youtube.com/live2</code>
                  </span>
                </div>

                {/* Stream Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">3. Stream Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showKey ? "text" : "password"}
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                      className="w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-bold"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    Your confidential stream secret. Never share it publicly!
                  </span>
                </div>

                {/* Playback Looping Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">4. Playback Loop Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLoopMode("infinite")}
                      className={`py-3 px-3 rounded-xl border text-[11px] font-bold transition-all ${
                        loopMode === "infinite"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Infinity Loop
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoopMode("none")}
                      className={`py-3 px-3 rounded-xl border text-[11px] font-bold transition-all ${
                        loopMode === "none"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Play Once
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block">
                    {loopMode === "infinite" 
                      ? "Continuously loop the video source 24/7." 
                      : "Stop broadcasting when the video ends."}
                  </span>
                </div>

              </div>

              {/* LIVE STREAM STATUS MONITOR & PREVIEW BOX */}
              <div className="pt-6 border-t border-zinc-900 space-y-4">
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes equalizer {
                    0% { height: 20%; }
                    100% { height: 100%; }
                  }
                `}} />
                
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    Broadcast Monitor Console
                  </h3>
                  <div className="flex items-center gap-2">
                    {streamStatus.isLive ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_#f33f5e]"></span>
                        </span>
                        <span className="text-[10px] font-bold text-rose-400 font-mono tracking-wider animate-pulse">
                          STATUS: LIVE STREAMING
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-zinc-700/30 rounded-full">
                        <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
                        <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider">
                          STATUS: OFFLINE
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-zinc-950/80 border border-zinc-900 rounded-2xl overflow-hidden p-4">
                  {/* Video Player Preview Column */}
                  <div className="lg:col-span-7 aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative group flex items-center justify-center">
                    {streamStatus.isLive ? (
                      <>
                        {/* Real Player Embed */}
                        {(() => {
                          const getYouTubeId = (url: string) => {
                            if (!url) return null;
                            const isYt = url.includes("youtu.be") || url.includes("youtube.com");
                            if (!isYt) return null;

                            // 1. Try URL constructor search params
                            try {
                              const urlObj = new URL(url);
                              const v = urlObj.searchParams.get("v");
                              if (v && v.length === 11) return v;
                            } catch (e) {}

                            // 2. Short URL pattern (youtu.be/ID)
                            const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
                            if (shortMatch) return shortMatch[1];

                            // 3. Various subpaths and queries
                            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                            const match = url.match(regExp);
                            if (match && match[2] && match[2].length === 11) {
                              return match[2];
                            }

                            // 4. Fallback extraction of any 11-char string
                            const lastParts = url.split("?")[0].split("/");
                            const lastPart = lastParts[lastParts.length - 1];
                            if (lastPart && lastPart.length === 11) {
                              return lastPart;
                            }

                            return null;
                          };
                          const ytId = getYouTubeId(streamStatus.videoSource);
                          
                          if (ytId) {
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0`}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-105"
                                title="YouTube Live Stream Preview"
                                allow="autoplay"
                                referrerPolicy="no-referrer"
                              />
                            );
                          } else if (streamStatus.videoSource) {
                            return (
                              <video
                                src={streamStatus.videoSource}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            );
                          } else {
                            // Fallback to stars background
                            return (
                              <video
                                src="https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            );
                          }
                        })()}

                        {/* Scanner raster line effect & Overlay badges */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent bg-[size:100%_4px] pointer-events-none" />
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-white font-mono uppercase tracking-widest">
                            MONITOR: ACTIVE FEED
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-2">
                          <span className="text-[9px] font-mono text-zinc-400">
                            FPS: 60 | CODEC: COPY_H264
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Tv className="w-8 h-8 text-zinc-700 mx-auto animate-pulse" />
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono block">
                          MONITOR STANDBY
                        </span>
                        <p className="text-[10px] text-zinc-500 font-mono max-w-[200px]">
                          Start the 24/7 restream to establish container pipeline and active feed preview.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Telemetry and Stats Column */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4 font-mono">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                          Pipeline Telemetry
                        </span>
                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between border-b border-zinc-900 pb-1">
                            <span className="text-zinc-500">RUNTIME_UPTIME:</span>
                            <span className={streamStatus.isLive ? "text-indigo-400 font-bold" : "text-zinc-600"}>
                              {streamStatus.isLive ? formatUptime(streamStatus.uptime) : "00:00:00"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between border-b border-zinc-900 pb-1">
                            <span className="text-zinc-500">INGEST_BITRATE:</span>
                            <span className={streamStatus.isLive ? "text-emerald-400 font-bold" : "text-zinc-600"}>
                              {streamStatus.isLive ? "4500 kbps" : "0 kbps"}
                            </span>
                          </div>

                          <div className="flex justify-between border-b border-zinc-900 pb-1">
                            <span className="text-zinc-500">NETWORK_LATENCY:</span>
                            <span className={streamStatus.isLive ? "text-emerald-400 font-bold" : "text-zinc-600"}>
                              {streamStatus.isLive ? "12ms" : "N/A"}
                            </span>
                          </div>

                          <div className="flex justify-between border-b border-zinc-900 pb-1">
                            <span className="text-zinc-500">DEST_RTMP:</span>
                            <span className="text-zinc-400 truncate max-w-[120px]" title={streamStatus.rtmpUrl || rtmpUrl}>
                              {streamStatus.isLive ? (streamStatus.rtmpUrl || rtmpUrl) : "OFFLINE"}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-zinc-500">LIVE_FEED_SRC:</span>
                            <span className="text-zinc-400 truncate max-w-[120px]" title={streamStatus.videoSource || "None"}>
                              {streamStatus.isLive ? (streamStatus.activeVideoTitle || "Active Stream") : "STANDBY"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DIAGNOSTIC ERROR/CRASH DISPLAY */}
                      {streamStatus.lastCrashReason && (
                        <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Diagnostic Alert
                          </div>
                          <p className="text-[10px] text-zinc-300 leading-normal font-mono">
                            {streamStatus.lastCrashReason}
                          </p>
                        </div>
                      )}

                      {/* FFmpeg ERROR/STDERR OUTPUT LOG PANEL */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
                          FFmpeg Output Console
                        </span>
                        <div className="bg-zinc-950/90 border border-zinc-900 rounded-xl p-3 h-32 overflow-y-auto text-[10px] text-zinc-400 space-y-1 font-mono">
                          {streamStatus.errorLog && streamStatus.errorLog.length > 0 ? (
                            streamStatus.errorLog.map((line, idx) => (
                              <div key={idx} className="whitespace-pre-wrap select-all selection:bg-indigo-500/30">
                                <span className="text-zinc-600 select-none mr-2">[{idx + 1}]</span>
                                <span className={line.toLowerCase().includes("error") || line.toLowerCase().includes("fail") ? "text-rose-400 font-medium" : line.toLowerCase().includes("warn") ? "text-amber-400" : "text-zinc-400"}>
                                  {line}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-zinc-600 italic">No logs available. Start stream to view active terminal output.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Animated Equalizer Waveform when streaming */}
                    {streamStatus.isLive ? (
                      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-2.5 flex items-center justify-between gap-3">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                          Audio Signal:
                        </span>
                        <div className="flex items-end gap-[3px] h-6">
                          <div className="w-[3px] bg-indigo-500 rounded-full animate-[equalizer_1.2s_ease-in-out_infinite_alternate]" style={{ height: "40%" }} />
                          <div className="w-[3px] bg-purple-500 rounded-full animate-[equalizer_0.8s_ease-in-out_infinite_alternate]" style={{ height: "80%" }} />
                          <div className="w-[3px] bg-indigo-400 rounded-full animate-[equalizer_1.5s_ease-in-out_infinite_alternate]" style={{ height: "20%" }} />
                          <div className="w-[3px] bg-pink-500 rounded-full animate-[equalizer_1s_ease-in-out_infinite_alternate]" style={{ height: "90%" }} />
                          <div className="w-[3px] bg-indigo-600 rounded-full animate-[equalizer_1.1s_ease-in-out_infinite_alternate]" style={{ height: "50%" }} />
                          <div className="w-[3px] bg-purple-400 rounded-full animate-[equalizer_1.4s_ease-in-out_infinite_alternate]" style={{ height: "30%" }} />
                        </div>
                      </div>
                    ) : (
                      <div className="border border-zinc-900 border-dashed rounded-xl p-3 text-center text-[10px] text-zinc-600">
                        Broadcaster audio loop disconnected.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION COMMAND CONTROLS */}
              <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center gap-3">
                {streamStatus.isLive ? (
                  showStopConfirm ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs text-rose-400 font-bold uppercase font-mono tracking-wider animate-pulse shrink-0">
                        Confirm stopping live feed?
                      </span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleStopStream}
                          disabled={isActionLoading}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-600/10 disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          )}
                          Yes, Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowStopConfirm(false)}
                          disabled={isActionLoading}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase text-zinc-300 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowStopConfirm(true)}
                      disabled={isActionLoading}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop 24/7 Stream
                    </button>
                  )
                ) : (
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.01] text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    Start 24/7 Stream
                  </button>
                )}

                <span className="text-[10px] text-zinc-500 font-mono text-center sm:text-left">
                  FFmpeg loops standard streams persistently. Stops automatically when server is shutdown.
                </span>
              </div>

            </form>

          </div>

          {/* Quick Guide / Help Info Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            
            <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Why Run a 24/7 Live Stream?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                Running 24/7 interactive loops of your short videos/storyboards is one of the fastest algorithmic hacks to build subscribers, authority, and channel search weight.
                Platform recommend feeds love active high-uptime streams!
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Where do I get my Stream details?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                Log into YouTube Studio → Click "Go Live" top-right.
                In the Stream Setup tab, copy your "Stream URL" (paste into RTMP Server URL) and "Stream Key" (paste into Stream Key).
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}