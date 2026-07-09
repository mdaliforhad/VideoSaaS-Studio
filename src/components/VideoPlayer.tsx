/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Clapperboard,
  LayoutTemplate,
  Download,
  Loader2,
  Youtube,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { VideoScript, VideoScene } from "../types";
import { useAuth } from "./AuthProvider";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface VideoPlayerProps {
  script: VideoScript | null;
  activeSceneIndex: number;
  setActiveSceneIndex: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isLoadingVideos: boolean;
}

export default function VideoPlayer({
  script,
  activeSceneIndex,
  setActiveSceneIndex,
  isPlaying,
  setIsPlaying,
  isLoadingVideos,
}: VideoPlayerProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<"yellow-stroke" | "dark-capsule" | "clean-white">("yellow-stroke");
  const [subtitlePosition, setSubtitlePosition] = useState<"bottom" | "center" | "top">("bottom");
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Asynchronous rendering pipeline states
  const [isRenderingFull, setIsRenderingFull] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderingStatus, setRenderingStatus] = useState<string>("");
  const [renderingProgressPercent, setRenderingProgressPercent] = useState<number>(0);
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  
  // YouTube publishing states
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("unlisted");
  const [isYtConnected, setIsYtConnected] = useState(false);
  const [isCheckingYt, setIsCheckingYt] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ videoUrl?: string; error?: string } | null>(null);

  const checkYouTubeStatus = async () => {
    setIsCheckingYt(true);
    try {
      const res = await fetch("/api/youtube/status");
      if (res.ok) {
        const data = await res.json();
        setIsYtConnected(data.connected);
      }
    } catch (err) {
      console.error("Error checking YouTube connection in player:", err);
    } finally {
      setIsCheckingYt(false);
    }
  };

  const openPublishModal = async () => {
    // Check if YouTube is connected first
    await checkYouTubeStatus();
    
    // Auto-fill Title and Description from script details
    setPublishTitle(script?.video_title || "My Generated AI Video");
    setPrivacyStatus("unlisted");
    
    // Construct a beautiful default description based on script details
    const defaultDesc = `Title: ${script?.video_title || "AI generated script"}\n\nThis video was automatically written and compiled by Script to Video Studio platform.\n\nEnjoy the video!`;
    setPublishDescription(defaultDesc);
    
    setPublishResult(null);
    setIsPublishModalOpen(true);
  };

  const handlePublishToYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedJobId) return;
    
    setIsPublishing(true);
    setPublishResult(null);
    
    try {
      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobId: completedJobId,
          title: publishTitle,
          description: publishDescription,
          aspect_ratio: script?.aspectRatio || "16:9",
          privacyStatus: privacyStatus
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish video to YouTube.");
      }
      
      setPublishResult({
        videoUrl: data.videoUrl
      });
    } catch (err: any) {
      console.error("Failed to publish video:", err);
      setPublishResult({
        error: err.message || "An unexpected error occurred during publishing."
      });
    } finally {
      setIsPublishing(false);
    }
  };
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const activeScene = script?.scenes[activeSceneIndex];

  // Poll status route
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    let pollInterval: number;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/video-status/${jobId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch compilation status from server.");
        }
        const data = await res.json();
        if (!isMounted) return;

        if (data.status === "completed") {
          const downloadUrl = `/api/video-download/${jobId}`;
          setCompiledVideoUrl(downloadUrl);
          setCompletedJobId(jobId);
          setIsRenderingFull(false);
          setJobId(null);

          // Save compiled video details to localStorage gallery
          try {
            const rawGal = localStorage.getItem("compiled_saas_videos") || "[]";
            const gallery = JSON.parse(rawGal);
            const newVideo = {
              id: jobId,
              video_title: script?.video_title || "My Generated AI Video",
              video_url: downloadUrl,
              aspectRatio: script?.aspectRatio || "16:9",
              createdAt: new Date().toISOString()
            };
            // Avoid duplicates
            if (!gallery.some((v: any) => v.id === jobId)) {
              localStorage.setItem("compiled_saas_videos", JSON.stringify([newVideo, ...gallery]));
              
              if (user) {
                const docRef = doc(db, "compiled_videos", jobId);
                setDoc(docRef, {
                  ...newVideo,
                  userId: user.uid
                }).catch((err) => {
                  console.error("Failed to save compiled video to Firestore:", err);
                  handleFirestoreError(err, OperationType.CREATE, `compiled_videos/${jobId}`);
                });
              }
            }
          } catch (e) {
            console.error("Failed to append compiled video to storage:", e);
          }
        } else if (data.status === "failed") {
          setRenderError(data.error || "Rendering process failed on the backend.");
          setIsRenderingFull(false);
          setJobId(null);
        } else {
          // Status: processing
          setRenderingStatus(data.progress || "Compiling elements...");
          setRenderingProgressPercent(data.progressPercent || 0);
        }
      } catch (err: any) {
        console.error("Error polling rendering status:", err);
        if (isMounted) {
          setRenderError(err.message || "Connection lost to the compilation server.");
          setIsRenderingFull(false);
          setJobId(null);
        }
      }
    };

    // Initial poll immediately
    pollStatus();
    pollInterval = window.setInterval(pollStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [jobId]);

  const handleDownloadFullVideo = async () => {
    if (!script) return;
    setIsRenderingFull(true);
    setRenderError(null);
    setCompiledVideoUrl(null);
    setCompletedJobId(null);
    setRenderingStatus("Initializing video compilation engine...");
    setRenderingProgressPercent(5);

    try {
      const response = await fetch("/api/render-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate video rendering on the backend server.");
      }

      const data = await response.json();
      if (data.jobId) {
        setJobId(data.jobId);
      } else {
        throw new Error("No jobId received from rendering server.");
      }
    } catch (error: any) {
      console.error("Full video rendering initiation failed:", error);
      setRenderError(error.message || "Compilation failed. Ensure backend has active internet connection & retry.");
      setIsRenderingFull(false);
    }
  };

  const downloadFinishedVideoDirectly = () => {
    if (!compiledVideoUrl) return;
    const a = document.createElement("a");
    a.href = compiledVideoUrl;
    const titleClean = script?.video_title 
      ? script.video_title.toLowerCase().replace(/[^a-z0-9]+/g, "_") 
      : "video";
    a.download = `${titleClean}_compiled.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadMedia = async () => {
    const mediaUrl = activeScene?.video_url || activeScene?.image_url;
    if (!mediaUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const isVid = !!activeScene?.video_url;
      const titleClean = script?.video_title 
        ? script.video_title.toLowerCase().replace(/[^a-z0-9]+/g, "_") 
        : "video";
      const filename = `${titleClean}_scene_${activeSceneIndex + 1}.${isVid ? 'mp4' : 'jpg'}`;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct fetch download failed, using standard anchor fallback...", error);
      const isVid = !!activeScene?.video_url;
      const titleClean = script?.video_title 
        ? script.video_title.toLowerCase().replace(/[^a-z0-9]+/g, "_") 
        : "video";
      const filename = `${titleClean}_scene_${activeSceneIndex + 1}.${isVid ? 'mp4' : 'jpg'}`;
      const a = document.createElement("a");
      a.href = mediaUrl;
      a.target = "_blank";
      a.download = filename;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  // Map language string to speech locale
  const getLanguageLocale = (lang: string) => {
    switch (lang?.toLowerCase()) {
      case "bengali":
      case "bn":
        return "bn-BD";
      case "spanish":
      case "es":
        return "es-ES";
      case "french":
      case "fr":
        return "fr-FR";
      case "hindi":
      case "hi":
        return "hi-IN";
      case "german":
      case "de":
        return "de-DE";
      case "japanese":
      case "ja":
        return "ja-JP";
      case "arabic":
      case "ar":
        return "ar-SA";
      default:
        return "en-US";
    }
  };

  // Synchronize playback of stock video or image
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeSceneIndex, activeScene?.video_url]);

  // Handle TTS synthesis or timer advancement
  useEffect(() => {
    if (!script || !isPlaying || !activeScene) return;

    // Clear old state
    stopVoiceAndTimer();
    setProgress(0);

    const voiceoverText = activeScene.voiceover_text;
    const cleanVoiceover = voiceoverText.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
    const locale = getLanguageLocale(script.language);

    if (!isMuted && "speechSynthesis" in window) {
      // Create TTS utterance
      const utterance = new SpeechSynthesisUtterance(cleanVoiceover);
      utterance.lang = locale;

      // Try to select a matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find((v) => v.lang.startsWith(locale));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      // Voiceover rate adjust based on text length for a natural pace
      utterance.rate = 0.95; 

      utterance.onstart = () => {
        // Estimate voiceover reading time or default to 5.5s
        const estDurationMs = Math.max(3000, cleanVoiceover.length * 75);
        startProgressBar(estDurationMs);
      };

      utterance.onend = () => {
        advanceScene();
      };

      utterance.onerror = () => {
        // Speech failed or was cancelled, use a timer fallback
        runTimerFallback();
      };

      ttsUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      // Muted playback, use a standard 5-second timer per slide
      runTimerFallback();
    }

    return () => {
      stopVoiceAndTimer();
    };
  }, [isPlaying, activeSceneIndex, isMuted, script]);

  const stopVoiceAndTimer = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressBar = (durationMs: number) => {
    const step = 100;
    let elapsed = 0;
    progressIntervalRef.current = window.setInterval(() => {
      elapsed += step;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, step);
  };

  const runTimerFallback = () => {
    const duration = 5000; // 5 seconds default per slide
    startProgressBar(duration);
    progressIntervalRef.current = window.setInterval(() => {
      advanceScene();
    }, duration);
  };

  const advanceScene = () => {
    if (!script) return;
    if (activeSceneIndex < script.scenes.length - 1) {
      setActiveSceneIndex(activeSceneIndex + 1);
    } else {
      // Loop back to start and pause
      setIsPlaying(false);
      setActiveSceneIndex(0);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    stopVoiceAndTimer();
    setProgress(0);
    if (activeSceneIndex > 0) {
      setActiveSceneIndex(activeSceneIndex - 1);
    } else if (script) {
      setActiveSceneIndex(script.scenes.length - 1);
    }
  };

  const handleNext = () => {
    stopVoiceAndTimer();
    setProgress(0);
    if (script && activeSceneIndex < script.scenes.length - 1) {
      setActiveSceneIndex(activeSceneIndex + 1);
    } else {
      setActiveSceneIndex(0);
    }
  };

  const togglePlay = () => {
    if (!script) return;
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    stopVoiceAndTimer();
    setActiveSceneIndex(0);
    setProgress(0);
    setIsPlaying(false);
  };

  if (!script) {
    return (
      <div className="w-full h-full bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-full mb-4 animate-pulse">
          <Clapperboard className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="font-display font-medium text-slate-200 mb-1.5">No Script Generated</h3>
        <p className="text-xs max-w-sm leading-relaxed text-slate-500">
          Enter a video prompt, configure your target formatting on the left, and press "Generate AI Script" to start producing your video.
        </p>
      </div>
    );
  }

  const isVertical = script.aspectRatio === "9:16" || (script as any).meta?.aspect_ratio === "9:16";

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800/80 rounded-2xl p-4 overflow-hidden shadow-2xl relative select-none">
      
      {/* Player Canvas Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4.5 h-4.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-xs font-display">
            {script.video_title}
          </span>
        </div>

        {/* Video Canvas Controls */}
        <div className="flex items-center gap-2">
          {script?.aspectRatio === "9:16" ? (
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[9px] font-semibold px-2.5 py-1 rounded-lg select-none">
              <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
              AUTO-OPTIMIZED FOR SHORTS
            </div>
          ) : (
            <>
              {/* Subtitle Positioning selector */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-[10px] text-slate-400 font-mono">
                <button
                  onClick={() => setSubtitleStyle("yellow-stroke")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${subtitleStyle === "yellow-stroke" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "hover:text-slate-200"}`}
                  title="Impact font style"
                >
                  Classic
                </button>
                <button
                  onClick={() => setSubtitleStyle("dark-capsule")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${subtitleStyle === "dark-capsule" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "hover:text-slate-200"}`}
                  title="Capsule font style"
                >
                  Capsule
                </button>
                <button
                  onClick={() => setSubtitleStyle("clean-white")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${subtitleStyle === "clean-white" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "hover:text-slate-200"}`}
                  title="Minimalist style"
                >
                  Minimal
                </button>
              </div>

              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setSubtitlePosition("top")}
                  className={`p-1 rounded-md transition-colors ${subtitlePosition === "top" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  title="Subtitles on Top"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 rotate-180" />
                </button>
                <button
                  onClick={() => setSubtitlePosition("center")}
                  className={`p-1 rounded-md transition-colors ${subtitlePosition === "center" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  title="Subtitles in Center"
                >
                  <Maximize2 className="w-3.5 h-3.5 rotate-45" />
                </button>
                <button
                  onClick={() => setSubtitlePosition("bottom")}
                  className={`p-1 rounded-md transition-colors ${subtitlePosition === "bottom" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  title="Subtitles on Bottom"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actual Simulated Player Stage Container */}
      <div className="flex-1 flex items-center justify-center bg-slate-900/60 rounded-xl relative p-3">
        
        {/* Dynamic Canvas Sizing based on Aspect Ratio */}
        <div 
          className={`relative overflow-hidden rounded-lg bg-black shadow-2xl border border-slate-800 flex items-center justify-center transition-all duration-300 ${
            isVertical 
              ? "w-[280px] sm:w-[300px] aspect-[9/16] max-h-[480px] sm:max-h-[530px]" 
              : "w-full aspect-[16/9] max-w-[700px]"
          }`}
        >
          {compiledVideoUrl ? (
            <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col z-10">
              <video
                src={compiledVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCompiledVideoUrl(null)}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                >
                  ← Back to Interactive Preview
                </button>
              </div>
            </div>
          ) : isRenderingFull ? (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                <Clapperboard className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h4 className="text-sm font-semibold tracking-wide text-white uppercase font-display">
                  Rendering Full Video
                </h4>
                <p className="text-xs text-slate-400 font-mono leading-relaxed min-h-[40px] px-2">
                  {renderingStatus}
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${renderingProgressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">
                {renderingProgressPercent}% COMPLETE
              </span>
            </div>
          ) : (
            <>
              {/* Background Stock Footage Loop (or Image Fallback) */}
              {activeScene?.video_url ? (
                <video
                  ref={videoRef}
                  key={activeScene.video_url}
                  src={activeScene.video_url}
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : activeScene?.image_url ? (
                <img
                  src={activeScene.image_url}
                  alt={activeScene.search_keywords}
                  className="absolute inset-0 w-full h-full object-cover animate-kenburns"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-600 font-mono">No visual loaded</span>
                </div>
              )}

              {/* Subtitles Overlay */}
              {(() => {
                const isVertical = script?.aspectRatio === "9:16";
                const subtitle = activeScene?.subtitle || "";
                
                // Parse emojis out of the subtitle text
                const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
                const emojis = subtitle.match(emojiRegex) || [];
                const textWithoutEmojis = subtitle.replace(emojiRegex, "").trim().toUpperCase();

                if (!subtitle) return null;

                if (isVertical) {
                  // Short-form (9:16 Vertical)
                  // - Positioned exactly in the center of the screen
                  // - Heavy dynamic scaling (pop/bounce effect)
                  // - Large emojis rendered right above the text
                  return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-10">
                      {emojis.length > 0 && (
                        <div 
                          key={`emoji-${activeSceneIndex}`}
                          className="text-5xl md:text-6xl animate-bounce mb-3 select-none filter drop-shadow-lg"
                        >
                          {emojis.join(" ")}
                        </div>
                      )}
                      <div 
                        key={`text-${activeSceneIndex}`}
                        className="animate-scale-bounce font-display font-black uppercase text-2xl md:text-3xl text-yellow-300 tracking-wider px-4 subtitles-glow select-none"
                      >
                        {textWithoutEmojis}
                      </div>
                    </div>
                  );
                } else {
                  // Long-form (16:9 Landscape)
                  // - Positioned safely at the bottom-center of the screen (lower third)
                  // - Group text into clean, readable sentences
                  // - Font styling consistent (bold uppercase, yellow/green colors, black outline)
                  // - Scale animation and emoji sizes more subtle and less distracting
                  return (
                    <div className="absolute inset-x-0 bottom-12 p-4 flex flex-col items-center text-center pointer-events-none z-10">
                      <div 
                        key={`landscape-${activeSceneIndex}`}
                        className="animate-subtle-scale font-display font-extrabold uppercase tracking-wide text-yellow-300 text-sm md:text-base px-3 py-1.5 subtitles-glow select-none"
                      >
                        {emojis.length > 0 && (
                          <span className="text-lg md:text-xl mr-2 inline-block animate-pulse align-middle">
                            {emojis.join(" ")}
                          </span>
                        )}
                        <span className="align-middle">{textWithoutEmojis}</span>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Loading Overlays */}
              {isLoadingVideos && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2.5 z-10">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Loading visuals...</span>
                </div>
              )}

              {/* Watermark / Niche Indicator */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/45 backdrop-blur-md border border-slate-800/60 rounded-md px-2 py-1 text-[8px] font-mono tracking-wide text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SCENE {activeSceneIndex + 1} / {script.scenes.length}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Timeline Progression bar */}
      <div className="mt-4 px-2 space-y-2">
        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Navigation Dots */}
        <div className="flex justify-center gap-1.5">
          {script.scenes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                stopVoiceAndTimer();
                setActiveSceneIndex(idx);
                setProgress(0);
              }}
              className={`h-1 rounded-full transition-all ${
                idx === activeSceneIndex 
                  ? "w-4 bg-indigo-500" 
                  : "w-1.5 bg-slate-800 hover:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Control Actions Board */}
      <div className="mt-4 flex items-center justify-between bg-slate-950 p-2.5 border border-slate-800/60 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Mute/Unmute narration */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title={isMuted ? "Unmute AI Narration" : "Mute AI Narration"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Reset playback */}
          <button
            onClick={handleRestart}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            title="Reset to Scene 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback controller */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className={`p-3 rounded-full flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-md ${
              isPlaying 
                ? "bg-slate-100 text-slate-950 hover:bg-white" 
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/15"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-slate-950 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Video properties info */}
        <div className="text-[10px] text-slate-500 font-mono pr-1 text-right">
          <div>ASPECT: {script.aspectRatio || "16:9"}</div>
          <div className="text-[9px] uppercase tracking-wider text-indigo-400/80 font-bold">
            {isMuted ? "No voice" : "TTS VOICE ACTIVE"}
          </div>
        </div>
      </div>

      {/* Download Actions Section */}
      <div className="mt-4 space-y-2.5 border-t border-slate-900 pt-4">
        {renderError && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center font-medium">
            {renderError}
          </div>
        )}

        {/* Primary Combined Video Download */}
        {compiledVideoUrl ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={downloadFinishedVideoDirectly}
              className="py-3 px-3 rounded-xl bg-indigo-650 hover:bg-indigo-600 border border-indigo-600 hover:border-indigo-500 text-white flex items-center justify-center gap-1.5 font-bold text-xs shadow-lg shadow-indigo-900/20 active:scale-[0.98] cursor-pointer transition-all duration-200 select-none"
              title="Download the fully rendered, voiceover-merged MP4 video file to your system"
            >
              <Download className="w-4 h-4 text-indigo-200 shrink-0" />
              <span>Download MP4</span>
            </button>
            <button
              type="button"
              onClick={openPublishModal}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 hover:border-emerald-400 text-white flex items-center justify-center gap-1.5 font-bold text-xs shadow-lg shadow-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer transition-all duration-200 select-none"
              title="Publish this compiled video directly to your connected YouTube channel"
            >
              <Youtube className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Publish to YT</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownloadFullVideo}
              disabled={isRenderingFull || isDownloading}
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs border transition-all duration-200 select-none ${
                isRenderingFull
                  ? "bg-indigo-950/40 border-indigo-900/50 text-indigo-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 hover:border-indigo-400 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
              }`}
              title="Compile and download the complete video with voiceover overlays and subtitles built-in"
            >
              {isRenderingFull ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Compiling Full Video with Audio (may take a moment)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-200" />
                  <span>Download Complete Video (with Voiceover)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={openPublishModal}
              disabled={isRenderingFull}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 hover:border-emerald-400 text-white flex items-center justify-center gap-2 font-bold text-xs shadow-lg shadow-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              title="Publish this compiled video directly to your connected YouTube channel"
            >
              <Youtube className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Publish to YouTube</span>
            </button>
          </div>
        )}

        {/* Secondary Scene Specific Download */}
        <button
          type="button"
          onClick={handleDownloadMedia}
          disabled={isDownloading || isRenderingFull || (!activeScene?.video_url && !activeScene?.image_url)}
          className={`w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-[11px] border transition-all duration-200 select-none ${
            isDownloading
              ? "bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed"
              : (!activeScene?.video_url && !activeScene?.image_url)
              ? "bg-slate-950/40 border-slate-950 text-slate-600 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700 text-slate-300 active:scale-[0.98] cursor-pointer"
          }`}
          title="Download the raw background video clip or image asset for the current active scene"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span>Downloading Raw Segment...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download Scene {activeSceneIndex + 1} Clip (Raw Asset)</span>
            </>
          )}
        </button>
      </div>

      {/* YouTube Publishing Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Publish to YouTube
                </h3>
              </div>
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                disabled={isPublishing}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {!isYtConnected ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-rose-600/10 flex items-center justify-center mx-auto border border-rose-500/20">
                    <Youtube className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-xs text-slate-200">YouTube Channel Not Connected</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                      Please connect your YouTube channel in the Sidebar workspace panel first before publishing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="mt-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all"
                  >
                    Close & Go to Workspace
                  </button>
                </div>
              ) : publishResult?.videoUrl ? (
                // Success State
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                    <span className="text-emerald-400 text-xl font-bold font-sans">✓</span>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-xs text-slate-100">Successfully Uploaded!</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                      Your video was uploaded to YouTube as <strong>unlisted</strong>. You can now edit its details, set custom thumbnails, or publish it to the world.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={publishResult.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/35 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on YouTube Studio
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsPublishModalOpen(false)}
                      className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                // Form / Publishing states
                <form onSubmit={handlePublishToYouTube} className="space-y-4">
                  
                  {!completedJobId && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-medium leading-relaxed flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block mb-1 text-amber-300">Video Not Compiled Yet</strong>
                        Please close this modal and click <strong>"Download Complete Video"</strong> first. This generates the actual MP4 file on our server so it can be uploaded to your YouTube channel.
                      </div>
                    </div>
                  )}

                  {script?.aspectRatio === "9:16" && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-500/15 rounded-xl flex gap-2 text-[10px] text-rose-300 leading-relaxed">
                      <span className="font-bold uppercase text-rose-400 select-none">Shorts Detected:</span>
                      <span>This video is in 9:16 portrait format. It will be published as a YouTube Short (automatically appends #Shorts).</span>
                    </div>
                  )}

                  {publishResult?.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium leading-relaxed flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>{publishResult.error}</div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">YouTube Video Title</label>
                    <input
                      type="text"
                      required
                      value={publishTitle}
                      onChange={(e) => setPublishTitle(e.target.value)}
                      maxLength={100}
                      disabled={isPublishing || !completedJobId}
                      placeholder="E.g., 5 Crazy Facts about the Universe"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-rose-500 outline-none transition-all disabled:opacity-50"
                    />
                    <div className="text-right text-[9px] text-slate-500">
                      {publishTitle.length}/100 characters
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">Video Description</label>
                    <textarea
                      required
                      rows={5}
                      value={publishDescription}
                      onChange={(e) => setPublishDescription(e.target.value)}
                      disabled={isPublishing || !completedJobId}
                      placeholder="Add description and keywords..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs leading-relaxed focus:border-indigo-500 outline-none transition-all resize-none disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">Privacy Status</label>
                    <select
                      value={privacyStatus}
                      onChange={(e) => setPrivacyStatus(e.target.value)}
                      disabled={isPublishing || !completedJobId}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="unlisted">Unlisted (Recommended for review)</option>
                      <option value="public">Public (Publish immediately)</option>
                      <option value="private">Private (Only you can view)</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => setIsPublishModalOpen(false)}
                      className="py-2 px-3 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPublishing || !completedJobId}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none cursor-pointer"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Uploading to YouTube...</span>
                        </>
                      ) : (
                        <>
                          <Youtube className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Publish Now</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
