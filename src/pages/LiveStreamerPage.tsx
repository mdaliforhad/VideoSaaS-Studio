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
  Cloud
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SaaSSidebar from "../components/SaaSSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface CompiledVideo {
  id: string;
  video_title: string;
  video_url: string;
  aspectRatio: string;
  createdAt: string;
  isDemo?: boolean;
}

export default function LiveStreamerPage() {
  const { user } = useAuth();
  const [galleryVideos, setGalleryVideos] = useState<CompiledVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  
  // Form states initialized directly from localStorage
  const [videoSourceType, setVideoSourceType] = useState<"gallery" | "custom" | "drive">(() => {
    const saved = localStorage.getItem("stream_videoSourceType");
    return (saved === "gallery" || saved === "custom" || saved === "drive") ? saved : "gallery";
  });
  const [selectedVideoId, setSelectedVideoId] = useState<string>(() => {
    return localStorage.getItem("stream_selectedVideoId") || "";
  });
  const [customVideoUrl, setCustomVideoUrl] = useState<string>(() => {
    return localStorage.getItem("stream_customVideoUrl") || "";
  });
  const [driveVideoUrl, setDriveVideoUrl] = useState<string>(() => {
    return localStorage.getItem("stream_driveVideoUrl") || "";
  });
  const [rtmpUrl, setRtmpUrl] = useState<string>(() => {
    return localStorage.getItem("stream_rtmpUrl") || "rtmp://a.rtmp.youtube.com/live2";
  });
  const [streamKey, setStreamKey] = useState<string>(() => {
    return localStorage.getItem("stream_streamKey") || "";
  });
  const [showKey, setShowKey] = useState(false);

  // Status states from backend
  const [streamStatus, setStreamStatus] = useState({
    isLive: false,
    uptime: 0,
    videoSource: "",
    rtmpUrl: "",
    activeVideoTitle: "",
    streamToken: ""
  });

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem("stream_videoSourceType", videoSourceType);
  }, [videoSourceType]);

  useEffect(() => {
    if (selectedVideoId) {
      localStorage.setItem("stream_selectedVideoId", selectedVideoId);
    }
  }, [selectedVideoId]);

  useEffect(() => {
    localStorage.setItem("stream_customVideoUrl", customVideoUrl);
  }, [customVideoUrl]);

  useEffect(() => {
    localStorage.setItem("stream_driveVideoUrl", driveVideoUrl);
  }, [driveVideoUrl]);

  useEffect(() => {
    localStorage.setItem("stream_rtmpUrl", rtmpUrl);
  }, [rtmpUrl]);

  useEffect(() => {
    localStorage.setItem("stream_streamKey", streamKey);
  }, [streamKey]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Poll status interval
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Default demo videos as fallback
  const defaultDemos: CompiledVideo[] = [
    {
      id: "demo-1",
      video_title: "5 Mind-Bending Space Facts Everyone Ignores",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-galaxy-exploration-with-a-spaceship-42993-large.mp4",
      aspectRatio: "16:9",
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-2",
      video_title: "The Ultimate Guide to Passive SaaS Income",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-mysterious-pills-falling-in-neon-vertical-video-45136-large.mp4",
      aspectRatio: "9:16",
      createdAt: new Date().toISOString()
    }
  ];

  // Fetch gallery videos
  useEffect(() => {
    let active = true;
    const fetchGallery = async () => {
      setIsLoadingVideos(true);
      if (user) {
        try {
          const qObj = query(collection(db, "compiled_videos"), where("userId", "==", user.uid));
          const snap = await getDocs(qObj);
          const list: CompiledVideo[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as CompiledVideo);
          });
          if (active) {
            const combined = [...list, ...defaultDemos];
            setGalleryVideos(combined);
            const queryParams = new URLSearchParams(window.location.search);
            const videoIdParam = queryParams.get("videoId");
            if (videoIdParam && combined.some(v => v.id === videoIdParam)) {
              setSelectedVideoId(videoIdParam);
            } else if (combined.length > 0) {
              setSelectedVideoId(combined[0].id);
            }
          }
        } catch (err) {
          console.error("Failed to load compiled videos in streamer page:", err);
          if (active) {
            setGalleryVideos(defaultDemos);
            const queryParams = new URLSearchParams(window.location.search);
            const videoIdParam = queryParams.get("videoId");
            if (videoIdParam && defaultDemos.some(v => v.id === videoIdParam)) {
              setSelectedVideoId(videoIdParam);
            } else {
              setSelectedVideoId(defaultDemos[0].id);
            }
          }
        } finally {
          if (active) setIsLoadingVideos(false);
        }
      } else {
        const queryParams = new URLSearchParams(window.location.search);
        const videoIdParam = queryParams.get("videoId");
        if (videoIdParam && defaultDemos.some(v => v.id === videoIdParam)) {
          setSelectedVideoId(videoIdParam);
        } else {
          setSelectedVideoId(defaultDemos[0].id);
        }
        setGalleryVideos(defaultDemos);
        setIsLoadingVideos(false);
      }
    };
    fetchGallery();
    return () => {
      active = false;
    };
  }, [user]);

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
      // Use warning level during development reboots to avoid clogging logs with transient fetch alerts
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

    // Pick correct source URL
    let finalSourceUrl = "";
    let finalTitle = "";
    if (videoSourceType === "gallery") {
      const selectedVideo = galleryVideos.find(v => v.id === selectedVideoId);
      if (!selectedVideo) {
        setActionError("Please select a video from your archive.");
        setIsActionLoading(false);
        return;
      }
      finalSourceUrl = selectedVideo.video_url;
      finalTitle = selectedVideo.video_title;
    } else if (videoSourceType === "drive") {
      if (!driveVideoUrl.trim()) {
        setActionError("Please insert a valid Google Drive video link.");
        setIsActionLoading(false);
        return;
      }
      finalSourceUrl = driveVideoUrl.trim();
      finalTitle = "Google Drive Video";
    } else {
      if (!customVideoUrl.trim()) {
        setActionError("Please insert a valid video URL or YouTube video URL.");
        setIsActionLoading(false);
        return;
      }
      finalSourceUrl = customVideoUrl.trim();
      finalTitle = customVideoUrl;
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
          videoSource: finalSourceUrl,
          rtmpUrl: rtmpUrl.trim(),
          streamKey: streamKey.trim(),
          videoTitle: finalTitle
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start background stream loop.");
      }

      if (data.status && data.status.streamToken) {
        localStorage.setItem("stream_activeToken", data.status.streamToken);
      }

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
    if (!confirm("Are you sure you want to stop the 24/7 background stream? This will stop the live feed instantly.")) {
      return;
    }
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
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
              Broadcast your compiled videos or third-party feeds directly to YouTube Live, Twitch, Kick, or custom RTMP destinations. Our persistent cloud-containers run continuous FFmpeg stream loops 24/7.
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
              
              {/* VIDEO SOURCE TYPE SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">1. Video Source</label>
                
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full md:w-fit flex-wrap gap-1 md:gap-0">
                  <button
                    type="button"
                    onClick={() => setVideoSourceType("gallery")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === "gallery" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    Select from My Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSourceType("custom")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === "custom" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    YouTube URL or Video Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSourceType("drive")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoSourceType === "drive" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Google Drive Link
                  </button>
                </div>
              </div>

              {/* DYNAMIC FIELD BASED ON SELECTION */}
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                {videoSourceType === "gallery" ? (
                  <div className="space-y-3">
                    <label className="text-[11px] text-zinc-400 block leading-relaxed font-mono">
                      Choose from your compiled Mp4 renders or storyboards in the video collection:
                    </label>
                    {galleryVideos.length === 0 ? (
                      <div className="text-xs text-zinc-500 italic py-2">
                        No videos found in your gallery. Try compiling some script renders or use default fallback loop options below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                        {galleryVideos.map((video) => (
                          <button
                            type="button"
                            key={video.id}
                            onClick={() => setSelectedVideoId(video.id)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                              selectedVideoId === video.id
                                ? "bg-indigo-600/10 border-indigo-500/80 text-white"
                                : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                            }`}
                          >
                            <div className="p-2 bg-zinc-900 rounded-lg shrink-0 text-indigo-400 border border-zinc-800">
                              <Video className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{video.video_title}</p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-1">Aspect: {video.aspectRatio}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : videoSourceType === "drive" ? (
                  <div className="space-y-3">
                    <label className="text-[11px] text-zinc-400 block leading-relaxed font-mono">
                      Insert public/shared Google Drive video URL:
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="Insert public/shared Google Drive video URL"
                        value={driveVideoUrl}
                        onChange={(e) => setDriveVideoUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[11px] text-zinc-400 block leading-relaxed font-mono">
                      Insert any standard YouTube watch link or direct MP4 stream web URL:
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="E.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                        value={customVideoUrl}
                        onChange={(e) => setCustomVideoUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RTMP SERVER DESTINATION DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
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
                            // Fallback to high-quality stars background
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
                    <div className="space-y-3">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
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
                  <button
                    type="button"
                    onClick={handleStopStream}
                    disabled={isActionLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 fill-current" />
                    )}
                    Stop 24/7 Stream
                  </button>
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
                Running 24/7 interactive loops of your short videos/storyboards is one of the fastest algorithmic hacks to build subscribers, authority, and channel search weight. Platform recommend feeds love active high-uptime streams!
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Where do I get my Stream details?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                Log into YouTube Studio → Click "Go Live" top-right. In the Stream Setup tab, copy your "Stream URL" (paste into RTMP Server URL) and "Stream Key" (paste into Stream Key).
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
