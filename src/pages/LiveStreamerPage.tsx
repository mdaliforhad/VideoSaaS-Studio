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
  Terminal,
  Sparkles,
  X
} from "lucide-react";
import SaaSSidebar from "../components/SaaSSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthProvider";

interface LiveStreamState {
  streamId: string;
  userId: string;
  isLive: boolean;
  startTime: number;
  videoSource: string;
  rtmpUrl: string;
  streamKey: string;
  activeVideoTitle: string;
  streamToken: string;
  errorLog: string[];
  lastCrashReason: string;
  uptime: number;
}

export default function LiveStreamerPage() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStreamState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local form states (for quick inline creation too)
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem("stream_videoUrl") || "");
  const [rtmpUrl, setRtmpUrl] = useState(() => localStorage.getItem("stream_rtmpUrl") || "rtmp://a.rtmp.youtube.com/live2");
  const [streamKey, setStreamKey] = useState(() => localStorage.getItem("stream_streamKey") || "");
  const [videoTitle, setVideoTitle] = useState("");
  const [loopMode, setLoopMode] = useState<"infinite" | "once">("infinite");
  const [youtubeCookies, setYoutubeCookies] = useState("");
  const [showCookiesConfig, setShowCookiesConfig] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Modal actions states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Active terminal logs state
  const [activeLogStream, setActiveLogStream] = useState<LiveStreamState | null>(null);
  const [confirmStopStream, setConfirmStopStream] = useState<LiveStreamState | null>(null);

  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch all streams for authenticated user
  const fetchStreamStatus = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stream/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStreams(data.streams || []);
      }
    } catch (e) {
      console.warn("Polling stream status paused briefly during network standby.");
    } finally {
      setIsLoading(false);
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
  }, [user]);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem("stream_videoUrl", videoUrl);
    localStorage.setItem("stream_rtmpUrl", rtmpUrl);
    localStorage.setItem("stream_streamKey", streamKey);
  }, [videoUrl, rtmpUrl, streamKey]);

  // Start stream action
  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    if (!videoUrl.trim()) {
      setActionError("Please enter a valid video source URL.");
      setIsActionLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stream/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          videoSource: videoUrl.trim(),
          rtmpUrl: rtmpUrl.trim(),
          streamKey: streamKey.trim(),
          videoTitle: videoTitle.trim(),
          loopMode,
          youtubeCookies: youtubeCookies.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start live restream.");
      }

      setActionSuccess("Continuous background restream initiated successfully and verified running!");
      setVideoTitle("");
      setShowForm(false);
      
      // Update state immediately with the newly started stream
      if (data.status) {
        setStreams(prev => {
          if (prev.some(s => s.streamId === data.status.streamId)) return prev;
          return [...prev, data.status];
        });
      }
      
      fetchStreamStatus();
    } catch (err: any) {
      setActionError(err.message || "Could not launch stream. Verify RTMP parameters.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Stop stream action
  const handleStopStream = async (stream: LiveStreamState) => {
    if (!user) return;
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stream/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ streamId: stream.streamId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to stop restream.");
      }

      setActionSuccess(`Restream "${stream.activeVideoTitle}" stopped successfully.`);
      setConfirmStopStream(null);
      fetchStreamStatus();
    } catch (err: any) {
      setActionError(err.message || "Error terminating restream process.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getThumbnail = (videoSource: string) => {
    const ytId = getYouTubeId(videoSource);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
  };

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

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <SaaSSidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
        <Navbar />

        <div className="max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg mb-3">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                24/7 MULTI-STREAM MANAGEMENT
              </div>
              <h1 className="font-display text-2xl font-black uppercase text-white sm:text-4xl tracking-tight">
                Live Broadcast Console
              </h1>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Configure, trigger, and monitor multiple concurrent 24/7 background streams loops. Distribute video feeds to YouTube Live, Twitch, and custom RTMP channels simultaneously.
              </p>
            </div>
            <div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/15 cursor-pointer hover:scale-[1.01] transition-all"
              >
                <Radio className="w-4 h-4 shrink-0" />
                {showForm ? "View Dashboard" : "Launch Stream"}
              </button>
            </div>
          </div>

          {/* Action Feedback alerts */}
          {(actionError || actionSuccess) && (
            <div className="space-y-3">
              {actionError && (
                <div className="flex flex-col gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold text-rose-300">Stream Initialization Failed</span>
                  </div>
                  <div className="pl-7 text-zinc-400 leading-relaxed">
                    {actionError.includes("Diagnostics:") || actionError.includes("exited early") ? (
                      <>
                        <p className="mb-2 font-medium text-zinc-300">
                          {actionError.split("Diagnostics:")[0] || actionError}
                        </p>
                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">FFmpeg Error Log & Output:</div>
                        <pre className="bg-black/50 p-3.5 rounded-xl mt-1 font-mono text-red-300 border border-red-950/50 max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] leading-normal shadow-inner">
                          {actionError.includes("Diagnostics:") ? actionError.split("Diagnostics:")[1].trim() : actionError}
                        </pre>
                      </>
                    ) : (
                      <span>{actionError}</span>
                    )}
                  </div>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-400">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* New stream loop creation inline drawer */}
          {showForm && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-400" />
                  New Broadcast Configuration
                </h2>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-zinc-500 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleStartStream} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Video Title / Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24/7 Lo-Fi Study Room"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Video Source URL</label>
                    <input
                      type="url"
                      required
                      placeholder="YouTube link, Google Drive video, or MP4 URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">RTMP Ingestion URL</label>
                    <input
                      type="text"
                      required
                      value={rtmpUrl}
                      onChange={(e) => setRtmpUrl(e.target.value)}
                      placeholder="rtmp://a.rtmp.youtube.com/live2"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Stream Key</label>
                    <input
                      type="password"
                      required
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      placeholder="Your secret stream key"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Loop Mode</label>
                    <select
                      value={loopMode}
                      onChange={(e) => setLoopMode(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="infinite">Infinity Loop (Persistent 24/7)</option>
                      <option value="once">Play Once & Close</option>
                    </select>
                  </div>
                </div>

                {/* Advanced: YouTube Authentication Cookies */}
                <div className="border border-zinc-900 rounded-xl bg-zinc-950/40 p-4.5 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCookiesConfig(!showCookiesConfig)}
                    className="flex items-center justify-between w-full text-left focus:outline-none"
                  >
                    <div>
                      <span className="text-xs font-black uppercase text-zinc-300 tracking-wider">Advanced: YouTube Auth Cookies</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Use Netscape format cookies to bypass sign-in and bot checks on YouTube links.</p>
                    </div>
                    <span className="text-zinc-500 hover:text-white transition-colors text-xs font-bold select-none cursor-pointer">
                      {showCookiesConfig ? "Hide" : "Configure"}
                    </span>
                  </button>

                  {showCookiesConfig && (
                    <div className="mt-4.5">
                      <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                        Netscape Cookie File Data
                      </label>
                      <textarea
                        rows={4}
                        value={youtubeCookies}
                        onChange={(e) => setYoutubeCookies(e.target.value)}
                        placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#10;..."
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-800 font-mono"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                        Export cookies from your browser using an extension like "Get cookies.txt" or "EditThisCookie" (Netscape format), and paste the text content here to bypass "Sign in to confirm you're not a bot" errors.
                      </p>
                    </div>
                  )}
                </div>



                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="flex items-center gap-1.5 px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl text-xs font-black uppercase text-white shadow-lg cursor-pointer"
                  >
                    {isActionLoading ? "Launching Process..." : "Initiate Broadcast"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active streams Multi-Stream Dashboard Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading active broadcasts...</p>
            </div>
          ) : streams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 py-20 px-4 text-center">
              <Tv className="w-12 h-12 text-zinc-600 mb-4 animate-pulse" />
              <h3 className="text-base font-bold text-zinc-300">No Active Streams Running</h3>
              <p className="text-zinc-500 text-xs mt-1.5 max-w-md leading-relaxed">
                You do not have any live background stream processes active. Click "Launch Stream" above or use the "New Live" button in the Navbar to start!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {streams.map((stream) => {
                const ytId = getYouTubeId(stream.videoSource);
                return (
                  <div 
                    key={stream.streamId}
                    className="group relative flex flex-col rounded-2xl border border-zinc-850 bg-zinc-900/40 hover:border-zinc-700 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Live Video Preview Panel */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden border-b border-zinc-900">
                      {ytId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=0&mute=1&controls=0`}
                          className="absolute inset-0 w-full h-full pointer-events-none opacity-80 scale-105"
                          title="Stream Player"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <video 
                          src={stream.videoSource} 
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                          muted 
                        />
                      )}
                      
                      {/* Equalizer Waveform Indicator */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-[9px] font-black tracking-widest uppercase">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                        LIVE
                      </div>

                      {/* Diagnostic Alert indicator */}
                      {stream.lastCrashReason && (
                        <div className="absolute bottom-3 left-3 bg-red-500/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white max-w-[80%] truncate">
                          Crash detected! Fallback active
                        </div>
                      )}
                    </div>

                    {/* Metadata Detail */}
                    <div className="flex-grow p-5 space-y-4">
                      <div>
                        <h3 className="font-bold text-white text-sm line-clamp-1">
                          {stream.activeVideoTitle}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                          Id: {stream.streamId}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900 text-xs">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase">Uptime</span>
                          <span className="font-mono font-bold text-indigo-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {formatUptime(stream.uptime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase">FPS / Signal</span>
                          <span className="font-mono font-bold text-emerald-400 mt-0.5 block">
                            60 FPS / HD
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                          <span>Target:</span>
                          <span className="text-zinc-300 truncate max-w-[150px]">{stream.rtmpUrl}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                          <span>Source Feed:</span>
                          <span className="text-zinc-300 truncate max-w-[150px]">{stream.videoSource}</span>
                        </div>
                      </div>

                      {/* Action buttons list */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => setActiveLogStream(stream)}
                          className="flex items-center justify-center gap-1 py-2 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                          View Logs
                        </button>
                        <button
                          onClick={() => setConfirmStopStream(stream)}
                          className="flex items-center justify-center gap-1 py-2 rounded-xl bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-bold text-rose-400 transition-all cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop Stream
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dialog Log Overlay Modal */}
          {activeLogStream && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
              <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
                <button 
                  onClick={() => setActiveLogStream(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-base font-bold text-white mb-1.5">
                  Live FFmpeg logs for {activeLogStream.activeVideoTitle}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mb-4">
                  Stream ID: {activeLogStream.streamId}
                </p>

                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 h-80 overflow-y-auto text-[11px] font-mono text-zinc-300 space-y-1.5">
                  {activeLogStream.errorLog && activeLogStream.errorLog.length > 0 ? (
                    activeLogStream.errorLog.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap select-all selection:bg-indigo-500/30">
                        <span className="text-zinc-700 select-none mr-2">[{idx + 1}]</span>
                        <span className={line.toLowerCase().includes("error") || line.toLowerCase().includes("fail") ? "text-rose-400 font-medium" : line.toLowerCase().includes("warn") ? "text-amber-400" : "text-zinc-400"}>
                          {line}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-600 italic">No output logs recorded yet. Stream is currently connecting or initializing.</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 mt-5">
                  <button
                    onClick={() => fetchStreamStatus()}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                  >
                    Refresh Logs
                  </button>
                  <button
                    onClick={() => setActiveLogStream(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deletion / Stopping Confirmation Modal */}
          {confirmStopStream && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
              <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
                <h2 className="text-base font-bold text-white mb-2">
                  Confirm stopping continuous broadcast?
                </h2>
                <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                  Are you sure you want to stop restreaming <span className="text-white font-bold">"{confirmStopStream.activeVideoTitle}"</span>? This will kill the underlying detached FFmpeg pipeline process on the cloud server.
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmStopStream(null)}
                    disabled={isActionLoading}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-400 cursor-pointer"
                  >
                    Keep Stream Running
                  </button>
                  <button
                    onClick={() => handleStopStream(confirmStopStream)}
                    disabled={isActionLoading}
                    className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-black uppercase text-white shadow-lg cursor-pointer"
                  >
                    {isActionLoading ? "Terminating..." : "Yes, Stop Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Helpful Tips Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Why Run a 24/7 Live Stream?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                Persistent looped streams attract exponential viewer retention on platforms like YouTube and Twitch. By streaming continuous curated loops, your channel remains live 24/7, maximizing algorithmic discoverability!
              </p>
            </div>
            <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Where do I get my Stream details?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                Log into YouTube Studio → Click "Go Live" top-right. Copy your Ingestion Stream URL (paste into Ingestion Server URL) and copy the secret Stream Key (paste into Stream Key).
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
