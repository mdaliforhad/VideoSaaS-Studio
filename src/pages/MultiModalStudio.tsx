import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Video, 
  Image, 
  UploadCloud, 
  Play, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Download, 
  ExternalLink, 
  Plus, 
  X, 
  ChevronRight, 
  Layers, 
  Settings, 
  Activity, 
  RefreshCw, 
  HelpCircle,
  Film,
  Radio,
  FileVideo
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SaaSSidebar from "../components/SaaSSidebar";
import { useAuth } from "../components/AuthProvider";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

interface CompiledVideo {
  id: string;
  video_title: string;
  video_url: string;
  aspectRatio: string;
  createdAt: string;
  isDemo?: boolean;
  generationInfo?: any;
}

export default function MultiModalStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<"t2v" | "i2v" | "f2v">("t2v");
  const [activeVideo, setActiveVideo] = useState<CompiledVideo | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Tab 1: Text-to-Video State
  const [t2vPrompt, setT2vPrompt] = useState("");
  const [t2vModel, setT2vModel] = useState("Wan2.1");
  
  // Tab 2: Image-to-Video State
  const [i2vImage, setI2vImage] = useState<string | null>(null);
  const [i2vImageFilename, setI2vImageFilename] = useState("");
  const [i2vModel, setI2vModel] = useState("CogVideoX-5b");
  const [i2vIsDragging, setI2vIsDragging] = useState(false);
  const [i2vMotionStrength, setI2vMotionStrength] = useState("Normal");

  // Tab 3: Frame-to-Video State
  const [f2vFiles, setF2vFiles] = useState<{ filename: string; data: string }[]>([]);
  const [f2vIsDragging, setF2vIsDragging] = useState(false);
  const [f2vFps, setF2vFps] = useState(24);

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Helper: Run simulated progress logs during heavy compilation
  const runSimulatedLogs = (steps: string[], speed: number = 800) => {
    setGenLogs([]);
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setGenLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
      }, idx * speed);
    });
  };

  // Action: Save to Gallery & Firestore
  const handleSaveToGallery = async (videoToSave: CompiledVideo) => {
    try {
      setActionSuccess(null);
      setActionError(null);
      
      // Save locally to localStorage
      const cachedRaw = localStorage.getItem("compiled_saas_videos");
      let cached: CompiledVideo[] = [];
      if (cachedRaw) {
        try { cached = JSON.parse(cachedRaw); } catch (e) {}
      }
      // Avoid duplicate saves
      if (!cached.some(v => v.id === videoToSave.id)) {
        cached = [videoToSave, ...cached];
        localStorage.setItem("compiled_saas_videos", JSON.stringify(cached));
      }

      // Save to cloud Firestore
      if (user) {
        const docRef = doc(db, "compiled_videos", videoToSave.id);
        await setDoc(docRef, {
          ...videoToSave,
          userId: user.uid
        });
      }

      setActionSuccess("Video successfully stored in your media gallery!");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error("Save to Gallery failed:", err);
      setActionError("Failed to sync video with cloud storage: " + err.message);
    }
  };

  // Action: Inject into 24/7 Live Streamer
  const handleInjectIntoStream = async (videoToInject: CompiledVideo) => {
    try {
      setActionSuccess(null);
      setActionError(null);
      
      // Save to gallery first to guarantee it is visible in the streamer page list
      await handleSaveToGallery(videoToInject);

      // Redirect user to streamer page with selected video ID preloaded
      setActionSuccess("Injecting video into live stream queue... redirecting!");
      setTimeout(() => {
        navigate(`/stream?videoId=${videoToInject.id}`);
      }, 1000);
    } catch (err: any) {
      setActionError("Stream injection failed: " + err.message);
    }
  };

  // Trigger T2V Generation
  const handleGenerateT2V = async () => {
    if (!t2vPrompt.trim()) return;
    setIsGenerating(true);
    setActionError(null);
    setActionSuccess(null);
    setActiveVideo(null);

    const logSteps = [
      "Contacting Hugging Face Serverless Worker cluster...",
      "Validating inference request parameters...",
      `Routing text prompt vector map into ${t2vModel} pipeline...`,
      "Synthesizing dynamic temporal latent frames (Hugging Face / FFmpeg)...",
      "Compiling sequence layers into high-definition MP4 file...",
      "Finalizing media asset output streams and registering URL..."
    ];
    runSimulatedLogs(logSteps, 900);

    try {
      if (!user) {
        throw new Error("You must be logged in to generate videos.");
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/generate-text-to-video", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: t2vPrompt, model: t2vModel })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to generate Text-To-Video");
      }

      const data = await response.json();
      if (data.success && data.video) {
        setActiveVideo(data.video);
        setActionSuccess("Text-to-Video generation successfully completed!");
      } else {
        throw new Error(data.error || "Failed to compile AI clip.");
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "An error occurred during Text-to-Video compilation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger I2V Generation
  const handleGenerateI2V = async () => {
    if (!i2vImage) return;
    setIsGenerating(true);
    setActionError(null);
    setActionSuccess(null);
    setActiveVideo(null);

    const logSteps = [
      "Analyzing static photo contours and color space histogram...",
      "Constructing 3D Ken Burns motion matrices...",
      `Feeding static visual anchor pixels into ${i2vModel} engine...`,
      "Extrapolating temporal pixel motion path values...",
      "Spawning offline FFmpeg pan-and-zoom transformation subprocess...",
      "Rendering video container & sealing H.264 video stream..."
    ];
    runSimulatedLogs(logSteps, 1000);

    try {
      if (!user) {
        throw new Error("You must be logged in to generate videos.");
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/generate-image-to-video", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          image: i2vImage, 
          filename: i2vImageFilename, 
          model: i2vModel 
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to animate static photo");
      }

      const data = await response.json();
      if (data.success && data.video) {
        setActiveVideo(data.video);
        setActionSuccess("Photo animation successfully completed!");
      } else {
        throw new Error(data.error || "Failed to animate photo.");
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "An error occurred during static image animation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger F2V Stitch Compiler
  const handleCompileF2V = async () => {
    if (f2vFiles.length === 0) return;
    setIsGenerating(true);
    setActionError(null);
    setActionSuccess(null);
    setActiveVideo(null);

    const logSteps = [
      "Acquiring uploaded image frames matrix...",
      "Analyzing file sequences and sorting filenames naturally...",
      "Converting file data stream inputs to native file buffers...",
      `Configuring target output settings to ${f2vFps} Frames Per Second...`,
      "Spawning asynchronous FFmpeg sequence-stitcher process...",
      "Scaling frame dimensions to high-definition 1080p canvas with smart padding...",
      "Exporting completed H.264 MP4 output file into local disk storage..."
    ];
    runSimulatedLogs(logSteps, 850);

    try {
      if (!user) {
        throw new Error("You must be logged in to generate videos.");
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/compile-frames-to-video", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ frames: f2vFiles, fps: f2vFps })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to stitch image sequences");
      }

      const data = await response.json();
      if (data.success && data.video) {
        setActiveVideo(data.video);
        setActionSuccess("Frames stitched and compiled into high-definition video!");
      } else {
        throw new Error(data.error || "Compiler failed.");
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "An error occurred during frame compile sequence.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle image uploader for Tab 2
  const handleI2VFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await fileToBase64(file);
      setI2vImage(b64);
      setI2vImageFilename(file.name);
    }
  };

  const handleI2VDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setI2vIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const b64 = await fileToBase64(file);
      setI2vImage(b64);
      setI2vImageFilename(file.name);
    }
  };

  // Handle multi-frame uploader for Tab 3
  const handleF2VFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const loaded: { filename: string; data: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const b64 = await fileToBase64(file);
          loaded.push({ filename: file.name, data: b64 });
        }
      }
      setF2vFiles(prev => [...prev, ...loaded]);
    }
  };

  const handleF2VDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setF2vIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const loaded: { filename: string; data: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const b64 = await fileToBase64(file);
          loaded.push({ filename: file.name, data: b64 });
        }
      }
      setF2vFiles(prev => [...prev, ...loaded]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* SaaS Navigation bar */}
      <SaaSSidebar />

      {/* Main Studio layout */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
        
        {/* Workspace top header banner */}
        <header className="border-b border-zinc-900 bg-zinc-950 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                Multi-Modal AI Video Studio
              </h1>
              <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 font-mono font-bold text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                v2.1 Prime
              </span>
            </div>
            <p className="text-zinc-500 text-xs mt-1 max-w-xl">
              Compile, generate, and animate text scripts, static images, and sequence frames into broadcast-ready video feeds.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/videos")}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              View Gallery
            </button>
            <button
              onClick={() => navigate("/stream")}
              className="px-4 py-2 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <Radio className="w-3.5 h-3.5" />
              Live Streamer
            </button>
          </div>
        </header>

        {/* Studio split workspaces */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left panel: Mode select, configuration and triggers */}
          <div className="w-full lg:w-[420px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-zinc-950 flex flex-col overflow-y-auto">
            
            {/* Header Tabs Navigation */}
            <div className="p-5 border-b border-zinc-900 bg-zinc-950/50">
              <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-widest block mb-3.5">
                Select Creation Module
              </span>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                <button
                  onClick={() => { setActiveTab("t2v"); setActiveVideo(null); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-center transition-all cursor-pointer ${
                    activeTab === "t2v"
                      ? "bg-indigo-600/10 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wide">Text to Video</span>
                </button>

                <button
                  onClick={() => { setActiveTab("i2v"); setActiveVideo(null); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-center transition-all cursor-pointer ${
                    activeTab === "i2v"
                      ? "bg-indigo-600/10 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                  }`}
                >
                  <Image className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wide">Image to Video</span>
                </button>

                <button
                  onClick={() => { setActiveTab("f2v"); setActiveVideo(null); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-center transition-all cursor-pointer ${
                    activeTab === "f2v"
                      ? "bg-indigo-600/10 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wide">Frame Compiler</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: TEXT-TO-VIDEO */}
            {activeTab === "t2v" && (
              <div className="p-6 flex-1 flex flex-col space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Enter AI Clip Prompt
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the motion scene you want to synthesize (e.g., 'An astronaut float-dancing inside an illuminated space station with cosmic star fields visible through circular windows, cyberpunk aesthetic, high fidelity, cinematic...')"
                    value={t2vPrompt}
                    onChange={(e) => setT2vPrompt(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-slate-100 placeholder-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setT2vPrompt("Cinematic neon cyberpunk grid highway with speeding high-speed data stream loops, abstract 8k")}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-850 text-[9px] font-bold rounded-lg transition-all"
                    >
                      Cyber Loop Idea
                    </button>
                    <button
                      onClick={() => setT2vPrompt("Majestic flight over a thick emerald-green river cutting through deep pine forests, slow camera sweep")}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-850 text-[9px] font-bold rounded-lg transition-all"
                    >
                      Nature Flight Idea
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-900">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      Inference Engine Settings
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 block">Target Model</span>
                        <select
                          value={t2vModel}
                          onChange={(e) => setT2vModel(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 py-2.5 px-3 rounded-lg text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="Wan2.1">Wan2.1 (T2V-14B)</option>
                          <option value="Mochi-1-preview">Mochi-1-preview</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 block">Aspect Ratio</span>
                        <div className="py-2.5 text-xs font-mono text-zinc-400 bg-zinc-900/40 border border-zinc-850/50 rounded-lg text-center select-none">
                          Auto-detected (16:9)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-900 mt-auto">
                  <button
                    onClick={handleGenerateT2V}
                    disabled={isGenerating || !t2vPrompt.trim()}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Video Clip...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Video Clip
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-zinc-500 mt-3 font-mono">
                    Hugging Face serverless cluster is active. High compatibility mode guaranteed.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: IMAGE-TO-VIDEO */}
            {activeTab === "i2v" && (
              <div className="p-6 flex-1 flex flex-col space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                    Upload Static Source Photo
                  </label>
                  
                  {i2vImage ? (
                    <div className="relative border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80 aspect-video flex items-center justify-center">
                      <img
                        src={i2vImage}
                        alt="Uploaded context"
                        className="w-full h-full object-cover max-h-56"
                      />
                      <button
                        onClick={() => { setI2vImage(null); setI2vImageFilename(""); }}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/90 border border-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-2.5 left-2.5 bg-black/70 px-2 py-1 rounded text-[9px] font-mono text-zinc-400 border border-zinc-800 max-w-[200px] truncate">
                        {i2vImageFilename}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setI2vIsDragging(true); }}
                      onDragLeave={() => setI2vIsDragging(false)}
                      onDrop={handleI2VDrop}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                        i2vIsDragging 
                          ? "border-indigo-500 bg-indigo-500/5" 
                          : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
                      }`}
                      onClick={() => document.getElementById("i2v-file-input")?.click()}
                    >
                      <input
                        type="file"
                        id="i2v-file-input"
                        className="hidden"
                        accept="image/*"
                        onChange={handleI2VFileSelect}
                      />
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform duration-200">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-white mt-4">Drop photo here or browse device</p>
                      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                        Supports PNG, JPG, JPEG. Max resolution 4K.<br />Will be compiled into H.264 high definition.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-900">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      Animation Settings
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 block">Motion Model</span>
                        <select
                          value={i2vModel}
                          onChange={(e) => setI2vModel(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 py-2.5 px-3 rounded-lg text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="CogVideoX-5b">CogVideoX-5b</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 block">Motion Speed</span>
                        <select
                          value={i2vMotionStrength}
                          onChange={(e) => setI2vMotionStrength(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 text-zinc-200 py-2.5 px-3 rounded-lg text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="Normal">Normal Zoom</option>
                          <option value="Fast">Fast Kinetic</option>
                          <option value="Cinematic">Cinematic Pan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-900 mt-auto">
                  <button
                    onClick={handleGenerateI2V}
                    disabled={isGenerating || !i2vImage}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Animating Static Photo...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Animate Static Photo
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-zinc-500 mt-3 font-mono">
                    Using direct high-fidelity FFmpeg pan-and-zoom matrix translation.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FRAME-TO-VIDEO COMPILER */}
            {activeTab === "f2v" && (
              <div className="p-6 flex-1 flex flex-col space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Sequence Image Dropzone
                    </label>
                    {f2vFiles.length > 0 && (
                      <button
                        onClick={() => setF2vFiles([])}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All ({f2vFiles.length})
                      </button>
                    )}
                  </div>

                  {f2vFiles.length > 0 ? (
                    <div className="space-y-3">
                      {/* Grid preview of some frames */}
                      <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-2 bg-zinc-950 border border-zinc-850 rounded-xl pr-1.5">
                        {f2vFiles.map((file, i) => (
                          <div key={i} className="relative group aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-850/60">
                            <img
                              src={file.data}
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => setF2vFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-black border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/60 text-[7px] font-mono text-zinc-400 px-1 py-0.2 rounded border border-zinc-800">
                              #{i + 1}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => document.getElementById("f2v-file-input")?.click()}
                          className="aspect-square bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-indigo-400 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[7px] font-bold uppercase mt-1">Add</span>
                        </button>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-850/80 rounded-xl p-3 flex items-center justify-between text-xs text-zinc-400 font-mono">
                        <span className="text-[11px]">Successfully sorted sequence frames:</span>
                        <span className="text-white font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-[10px]">
                          {f2vFiles.length} Images
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setF2vIsDragging(true); }}
                      onDragLeave={() => setF2vIsDragging(false)}
                      onDrop={handleF2VDrop}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                        f2vIsDragging 
                          ? "border-indigo-500 bg-indigo-500/5" 
                          : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
                      }`}
                      onClick={() => document.getElementById("f2v-file-input")?.click()}
                    >
                      <input
                        type="file"
                        id="f2v-file-input"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleF2VFileSelect}
                      />
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform duration-200">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-white mt-4">Drop multiple frames here or browse device</p>
                      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                        Select multiple numbered files (e.g. frame1.png, frame2.png...)<br />to compile a flawless high-definition MP4.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-900">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      Stitcher Frame Settings
                    </label>
                    <div className="space-y-2 p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Target Framerate</span>
                        <span className="text-indigo-400 font-bold">{f2vFps} FPS</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={f2vFps}
                        onChange={(e) => setF2vFps(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                        <span>1 FPS (Slide)</span>
                        <span>24 FPS (Cinematic)</span>
                        <span>30 FPS (Standard)</span>
                        <span>60 FPS (Ultra)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-900 mt-auto">
                  <button
                    onClick={handleCompileF2V}
                    disabled={isGenerating || f2vFiles.length === 0}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Stitching Frame Sequence...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        Stitch Frames to Video
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-zinc-500 mt-3 font-mono">
                    Compiles using direct asynchronous server-side FFmpeg pipeline.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Live monitor, outputs, downloads and stream integrations */}
          <div className="flex-1 bg-zinc-950 p-6 flex flex-col overflow-y-auto">
            
            <div className="space-y-6 max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between">
              
              {/* Alert Feedback Messages */}
              <AnimatePresence mode="wait">
                {actionSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-3 shrink-0"
                  >
                    <Check className="w-4.5 h-4.5 shrink-0" />
                    <p className="font-bold">{actionSuccess}</p>
                  </motion.div>
                )}
                
                {actionError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-3 shrink-0"
                  >
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                    <p className="font-bold">{actionError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Media Console Screen */}
              <div className="bg-zinc-950 rounded-2xl border border-zinc-900/80 overflow-hidden flex flex-col shadow-2xl flex-1 min-h-[350px]">
                
                {/* Console header bar */}
                <div className="bg-zinc-950 border-b border-zinc-900 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400">
                      Studio Live Monitor Output
                    </span>
                  </div>
                  {activeVideo && (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-0.5 text-[9px] font-mono text-indigo-400 font-bold uppercase">
                      READY
                    </div>
                  )}
                </div>

                {/* Video screen box */}
                <div className="flex-1 bg-zinc-900/30 flex items-center justify-center p-6 relative min-h-[250px]">
                      {activeVideo ? (
                    <div className="w-full max-w-xl aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-lg relative group">
                      <video
                        src={activeVideo.video_url}
                        controls
                        autoPlay
                        muted
                        loop
                        className="w-full h-full object-contain rounded-lg bg-zinc-950"
                        key={activeVideo.video_url}
                      />
                    </div>
                  ) : isGenerating ? (
                    <div className="text-center p-6 flex flex-col items-center">
                      <div className="relative mb-6">
                        <div className="h-14 w-14 rounded-full border-2 border-indigo-500/10 border-t-2 border-t-indigo-500 animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        Generating High-Definition Video Feed
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-2 max-w-xs leading-relaxed">
                        Please wait while our backend servers pipeline the render and stitch the video buffers.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-8 flex flex-col items-center max-w-sm">
                      <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-600 mb-5 shadow-inner">
                        <FileVideo className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        Waiting for Compilation Task
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                        Configure your parameters in the left pane and press generate. The finalized video stream will appear here instantly.
                      </p>
                    </div>
                  )}
                </div>

                {/* Console footer logs / status line */}
                <div className="bg-zinc-950 border-t border-zinc-900 p-4 min-h-[100px] max-h-[140px] overflow-y-auto font-mono text-[10px] text-zinc-500 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 pb-1 border-b border-zinc-900/60 mb-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span className="font-bold">SYSTEM TELEMETRY ENGINE LOGS</span>
                  </div>
                  {genLogs.length > 0 ? (
                    genLogs.map((log, i) => (
                      <div key={i} className="text-zinc-400 leading-normal animate-fade-in">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-650 italic">
                      [System standby. Ready to trigger compiler process...]
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar bottom (Visible only when video is active) */}
              <AnimatePresence>
                {activeVideo && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="p-5 bg-gradient-to-tr from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xl"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[300px]">
                        {activeVideo.video_title}
                      </h4>
                      <div className="flex items-center gap-2.5 mt-1 text-[9px] font-mono text-zinc-500">
                        <span>Aspect: {activeVideo.aspectRatio}</span>
                        <span>•</span>
                        <span>Format: MP4 Container (H.264)</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => handleSaveToGallery(activeVideo)}
                        className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Save to Gallery
                      </button>

                      <a
                        href={activeVideo.video_url}
                        download={`${activeVideo.video_title.toLowerCase().replace(/\s+/g, "_")}.mp4`}
                        className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        Download MP4
                      </a>

                      <button
                        onClick={() => handleInjectIntoStream(activeVideo)}
                        className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        Inject into 24/7 Restream
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
