/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Sparkles, 
  Video, 
  SlidersHorizontal, 
  Languages, 
  Compass, 
  Check, 
  FolderOpen,
  Flame,
  TrendingUp,
  RefreshCw,
  Youtube,
  AlertTriangle,
  LogOut,
  Mic,
  UploadCloud,
  Volume2,
  Trash2
} from "lucide-react";
import { WorkspaceSettings } from "../types";

interface SidebarProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onGenerate: () => void;
  isLoading: boolean;
  onOpenSaved: () => void;
  savedCount: number;
}

const LANGUAGES = [
  { code: "English", label: "English 🇺🇸" },
  { code: "Hindi", label: "Hindi 🇮🇳" },
  { code: "Arabic", label: "Arabic 🇦🇪" },
  { code: "Bengali", label: "Bengali 🇧🇩" },
];

const TONES = [
  { value: "energetic", label: "🔥 Energetic / Hype" },
  { value: "educational", label: "📚 Educational / Calm" },
  { value: "dramatic", label: "🎭 Dramatic / Cinematic" },
  { value: "storytelling", label: "📖 Storyteller / Narrator" },
  { value: "professional", label: "💼 Corporate / Clear" },
];

const TEMPLATES = [
  {
    title: "5 Mind-Blowing Facts About Mars",
    topic: "Interesting and lesser-known historical and scientific facts about the planet Mars that will blow people's minds.",
    tone: "dramatic",
    sceneCount: 5,
    language: "English",
  },
  {
    title: "কফির অবিশ্বাস্য ইতিহাস (Bangla)",
    topic: "How coffee was discovered in Ethiopia and spread across the globe to become the most popular beverage.",
    tone: "storytelling",
    sceneCount: 4,
    language: "Bengali",
  },
  {
    title: "The Golden Rule of Compound Interest",
    topic: "Explain the mathematics of compound interest in simple words, and why starting early makes you rich.",
    tone: "educational",
    sceneCount: 5,
    language: "English",
  },
  {
    title: "The Secret to Perfect Crispy Fries",
    topic: "A rapid, delicious recipe tutorial explaining the science of baking or frying perfectly crispy french fries.",
    tone: "energetic",
    sceneCount: 4,
    language: "English",
  },
];

export default function Sidebar({
  settings,
  setSettings,
  onGenerate,
  isLoading,
  onOpenSaved,
  savedCount,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"create" | "templates">("create");
  const [trends, setTrends] = useState<any[]>([]);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);

  // Voice cloning states
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [clonedFilename, setClonedFilename] = useState<string>("");
  const [clonedDuration, setClonedDuration] = useState<number>(0);

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloning(true);
    setCloneError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          const res = await fetch("/api/voice/clone-free", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              audio: base64Data,
              filename: file.name,
            }),
          });

          if (!res.ok) {
            throw new Error("Failed to upload reference voice sample");
          }

          const data = await res.json();
          if (data.success) {
            setClonedFilename(data.filename);
            setClonedDuration(data.duration);
            setSettings((prev) => ({
              ...prev,
              clonedVoicePath: data.clonedVoicePath,
              useClonedVoice: true,
            }));
          } else {
            throw new Error(data.error || "Failed to clone voice sample");
          }
        } catch (err: any) {
          console.error("Cloning failed:", err);
          setCloneError(err.message || "An unexpected error occurred during cloning.");
        } finally {
          setIsCloning(false);
        }
      };

      reader.onerror = () => {
        setCloneError("Failed to read voice sample file.");
        setIsCloning(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setCloneError(err.message || "Failed to read voice sample file.");
      setIsCloning(false);
    }
  };

  const handleDeleteClonedVoice = () => {
    setClonedFilename("");
    setClonedDuration(0);
    setSettings((prev) => ({
      ...prev,
      clonedVoicePath: undefined,
      useClonedVoice: false,
    }));
  };

  // YouTube states
  const [ytStatus, setYtStatus] = useState<{
    connected: boolean;
    channelTitle?: string;
    channelThumbnail?: string;
    error?: string;
  }>({ connected: false });
  const [isCheckingYt, setIsCheckingYt] = useState(false);
  const [ytConnecting, setYtConnecting] = useState(false);

  const fetchYouTubeStatus = async () => {
    setIsCheckingYt(true);
    try {
      const res = await fetch("/api/youtube/status");
      if (res.ok) {
        const data = await res.json();
        setYtStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch YouTube connection status:", err);
    } finally {
      setIsCheckingYt(false);
    }
  };

  React.useEffect(() => {
    fetchYouTubeStatus();
  }, []);

  // Listen for success message from popup (after callback completes)
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        fetchYouTubeStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectYouTube = async () => {
    setYtConnecting(true);
    try {
      const url = "/api/youtube/auth";
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        "youtube_oauth_popup",
        `width=${width},height=${height},top=${top},left=${left}`
      );
      
      if (!authWindow) {
        alert("Pop-up window blocked. Please allow popups for this site to connect your YouTube channel.");
      }
    } catch (err: any) {
      console.error("Error connecting YouTube:", err);
      alert(err.message || "Failed to start Google OAuth flow.");
    } finally {
      setYtConnecting(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    if (!confirm("Are you sure you want to disconnect your YouTube channel?")) return;
    try {
      const res = await fetch("/api/youtube/disconnect", { method: "POST" });
      if (res.ok) {
        setYtStatus({ connected: false });
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  React.useEffect(() => {
    let active = true;
    const loadTrends = async () => {
      setIsFetchingTrends(true);
      try {
        const res = await fetch("/api/google-trends");
        if (res.ok) {
          const data = await res.json();
          if (active && data.trends && data.trends.length > 0) {
            setTrends(data.trends);
            setIsFetchingTrends(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch trends from backend, using fallbacks:", err);
      }

      if (active) {
        setTrends([
          {
            title: "🚀 GPT-5 & Next-Gen AI",
            topic: "The dawn of superintelligent AI assistants: breaking down the revolutionary new cognitive abilities, real-world benchmarks, and the upcoming global launch of next-generation LLMs.",
            traffic: "500K+ searches",
            category: "VIRAL",
            tone: "energetic",
            sceneCount: 5,
            language: "English"
          },
          {
            title: "💡 Smart Financial Hacks",
            topic: "Unveiling the hidden high-yield interest rate hacks, tax-efficient stock index funds, and easy micro-saving strategies that can make young adults millionaires with early passive income.",
            traffic: "300K+ searches",
            category: "TRENDING NOW",
            tone: "educational",
            sceneCount: 5,
            language: "English"
          },
          {
            title: "🔋 Solid-State Batteries",
            topic: "How solid-state batteries are about to disrupt electric vehicles forever, delivering 800-mile charge capacity under 10 minutes and ending energy dependence as we know it.",
            traffic: "200K+ searches",
            category: "VIRAL",
            tone: "dramatic",
            sceneCount: 4,
            language: "English"
          },
          {
            title: "🧠 Dopamine Fasting Protocol",
            topic: "Discover the biological reality of modern screen-induced attention fatigue, and the step-by-step psychological protocol of dopamine fasting to rewire your focus and productivity.",
            traffic: "150K+ searches",
            category: "HEALTH HACK",
            tone: "storytelling",
            sceneCount: 5,
            language: "English"
          },
          {
            title: "🌍 Clean Tech Breakthroughs",
            topic: "Exploring the incredible carbon-capture synthetic forests and geothermal heat-grid innovations designed to reverse climate change and achieve total carbon negativity.",
            traffic: "100K+ searches",
            category: "GLOBAL NEWS",
            tone: "professional",
            sceneCount: 5,
            language: "English"
          }
        ]);
      }
      setIsFetchingTrends(false);
    };

    loadTrends();
    return () => {
      active = false;
    };
  }, []);

  const applyTemplate = (tpl: any) => {
    setSettings((prev) => ({
      ...prev,
      topic: tpl.topic,
      tone: tpl.tone || prev.tone,
      sceneCount: tpl.sceneCount || prev.sceneCount,
      language: tpl.language || prev.language,
    }));
    setActiveTab("create");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100 font-sans select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-white bg-clip-text text-transparent">
              VideoSaaS Studio
            </h1>
            <p className="text-[10px] font-mono text-indigo-400 font-semibold tracking-wider uppercase">
              Script-To-Video Engine
            </p>
          </div>
        </div>
        
        {savedCount > 0 && (
          <button
            onClick={onOpenSaved}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors relative"
            title="Saved Projects"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {savedCount}
            </span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            activeTab === "create"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Workspace
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            activeTab === "templates"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Niche Ideas
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === "create" ? (
          <div className="space-y-5">
            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                Video Topic & Context
              </label>
              <textarea
                value={settings.topic}
                onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
                placeholder="E.g., 3 morning habits of highly successful people, explained with high-energy hooks..."
                className="w-full h-32 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                Script Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Format & Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, aspectRatio: "16:9" })}
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                    settings.aspectRatio === "16:9"
                      ? "bg-indigo-600/10 border-indigo-500 text-white shadow-indigo-500/5 shadow-md"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="w-8 h-4 border border-current rounded-sm mb-1.5 opacity-80" />
                  <span className="text-[11px] font-medium">Landscape (16:9)</span>
                  <span className="text-[9px] text-slate-500">YouTube / Web</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, aspectRatio: "9:16" })}
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                    settings.aspectRatio === "9:16"
                      ? "bg-indigo-600/10 border-indigo-500 text-white shadow-indigo-500/5 shadow-md"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="w-4 h-8 border border-current rounded-sm mb-1.5 opacity-80" />
                  <span className="text-[11px] font-medium">Vertical (9:16)</span>
                  <span className="text-[9px] text-slate-500">Shorts / TikTok</span>
                </button>
              </div>
            </div>

            {/* Tone and Length */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Narrative Tone</label>
                <select
                  value={settings.tone}
                  onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Scene Count</label>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={settings.sceneCount}
                  onChange={(e) => setSettings({ ...settings, sceneCount: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Free Voice Studio Widget */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Mic className="w-3.5 h-3.5 text-violet-400" />
                  Free Voice Studio
                </span>
                {settings.clonedVoicePath && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </span>
                )}
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                Upload a 10-15s audio clip (.mp3 or .wav) to clone your voice and dub scripts. 100% free and offline-secure.
              </p>

              {!settings.clonedVoicePath ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-violet-500/50 bg-slate-900/30 hover:bg-violet-950/5 rounded-xl p-4 cursor-pointer group transition-all">
                    <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-violet-400 mb-1.5 transition-colors" />
                    <span className="text-[11px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                      {isCloning ? "Processing voice..." : "Click or Drag Audio Sample"}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">
                      WAV / MP3 (Max 10MB, 10-15s recommended)
                    </span>
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
                      onChange={handleVoiceUpload}
                      disabled={isCloning}
                      className="hidden"
                    />
                  </label>

                  {cloneError && (
                    <div className="text-[10px] text-rose-400 bg-rose-950/10 border border-rose-500/10 p-2 rounded-lg">
                      {cloneError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-violet-600/10 text-violet-400 rounded-lg shrink-0">
                        <Volume2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate leading-none">
                          {clonedFilename || "cloned_voice.wav"}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1 font-mono">
                          Duration: {clonedDuration ? `${clonedDuration.toFixed(1)}s` : "Unknown"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteClonedVoice}
                      className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                      title="Remove voice sample"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle switch for cloned voice */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/30 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-medium text-slate-300">
                      Use in Script Dubbing
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, useClonedVoice: !settings.useClonedVoice })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.useClonedVoice ? "bg-violet-600" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.useClonedVoice ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Trigger */}
            <button
              onClick={onGenerate}
              disabled={isLoading || !settings.topic}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? "Generating Natural Female Voice..." : "Generate Natural Female Voice"}
            </button>

            {/* YouTube Channel connection Panel */}
            <div className="pt-4 mt-2 border-t border-slate-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Youtube className="w-4 h-4 text-rose-500 animate-pulse" />
                  YouTube Channel Connection
                </span>
                {isCheckingYt && (
                  <span className="w-2.5 h-2.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>

              {ytStatus.connected ? (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-500/10 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    {ytStatus.channelThumbnail ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={ytStatus.channelThumbnail} 
                        alt="Channel avatar" 
                        className="w-8 h-8 rounded-full border border-slate-700 object-cover" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold font-mono">
                        YT
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-400 leading-none">Connected to:</div>
                      <div className="text-xs font-bold text-slate-100 truncate mt-1">
                        {ytStatus.channelTitle}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectYouTube}
                      className="p-1.5 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                      title="Disconnect channel"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ready to publish videos & shorts
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleConnectYouTube}
                    disabled={ytConnecting}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-rose-950/30 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 font-semibold text-xs rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Youtube className="w-4 h-4 text-rose-500 shrink-0" />
                    {ytConnecting ? "Connecting Google..." : "Connect YouTube Channel"}
                  </button>

                  <div className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-lg text-[9.5px] text-slate-500 leading-relaxed font-mono">
                    <span className="text-slate-400 font-semibold flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      Requires Google App Setup:
                    </span>
                    Add callback URI <code className="text-indigo-400 select-all font-sans font-bold bg-slate-950 px-1 py-0.5 rounded">/api/youtube/callback</code> to your OAuth Client in Google Cloud Console, and define YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Real-time Trending Topics
              </span>
              {isFetchingTrends && (
                <span className="flex items-center text-[10px] text-indigo-400 font-mono">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin mr-1" />
                  Scraping...
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-center text-[11px] text-slate-400">
              Select any live viral topic below to automatically auto-fill your workspace and generate the script instantly.
            </div>
            
            <div className="space-y-3">
              {trends.map((trend, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(trend)}
                  className="w-full text-left p-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/20 rounded-xl transition-all group flex flex-col gap-1.5 cursor-pointer hover:shadow-md hover:shadow-indigo-500/[0.02]"
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <span className="font-display font-medium text-xs text-indigo-300 group-hover:text-indigo-200 transition-colors line-clamp-1">
                      {trend.title}
                    </span>
                    <span className="text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/10 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                      {trend.category || "VIRAL"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                    {trend.topic}
                  </p>
                  <div className="flex items-center justify-between w-full text-[9px] text-slate-500 font-mono mt-0.5">
                    <span className="flex items-center gap-1 text-amber-500/90 font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      {trend.traffic || "50K+ searches"}
                    </span>
                    <div className="flex gap-2">
                      <span>🎬 {trend.sceneCount || 5} Scenes</span>
                      <span>🌐 {trend.language || "English"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Footer Info */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 flex flex-col gap-1">
        <div>VideoSaaS Engine v1.2</div>
        <div className="flex justify-center gap-1.5 text-slate-600 font-mono">
          <span>React 19</span>
          <span>•</span>
          <span>Gemini 3.5</span>
        </div>
      </div>
    </div>
  );
}
