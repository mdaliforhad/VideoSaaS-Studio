import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Save, 
  FileJson, 
  FileText, 
  Check, 
  Video, 
  RefreshCw, 
  Info,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import Sidebar from "../components/Sidebar";
import VideoPlayer from "../components/VideoPlayer";
import SceneEditor from "../components/SceneEditor";
import SavedProjects from "../components/SavedProjects";
import SaaSSidebar from "../components/SaaSSidebar";
import { VideoScript, WorkspaceSettings } from "../types";
import { useAuth } from "../components/AuthProvider";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export default function StudioDashboard() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WorkspaceSettings>({
    topic: "",
    aspectRatio: "16:9",
    language: "English",
    sceneCount: 5,
    tone: "educational",
    pexelsApiKey: "",
    voiceId: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4",
  });

  const [script, setScript] = useState<VideoScript | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [savedScripts, setSavedScripts] = useState<VideoScript[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Load saved projects on mount or when auth state changes
  useEffect(() => {
    let active = true;

    const fetchProjects = async () => {
      if (user) {
        try {
          const q = query(collection(db, "projects"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const projects: VideoScript[] = [];
          querySnapshot.forEach((docSnap) => {
            projects.push(docSnap.data() as VideoScript);
          });
          if (active) {
            setSavedScripts(projects);
            localStorage.setItem("video_saas_blueprints", JSON.stringify(projects));
          }
        } catch (err) {
          console.error("Failed to fetch projects from Firestore, falling back to cache:", err);
          const raw = localStorage.getItem("video_saas_blueprints");
          if (raw && active) {
            try {
              setSavedScripts(JSON.parse(raw));
            } catch (e) {
              console.error(e);
            }
          }
        }
      } else {
        const raw = localStorage.getItem("video_saas_blueprints");
        if (raw && active) {
          try {
            setSavedScripts(JSON.parse(raw));
          } catch (err) {
            console.error("Failed to parse local projects cache", err);
          }
        }
      }
    };

    fetchProjects();
    return () => {
      active = false;
    };
  }, [user]);

  // Synchronize cloned voice and Cartesia voice selection reactively from settings to active script
  useEffect(() => {
    if (script) {
      setScript((prev) => {
        if (!prev) return null;
        if (
          prev.useClonedVoice === settings.useClonedVoice && 
          prev.clonedVoicePath === settings.clonedVoicePath &&
          prev.voiceId === settings.voiceId
        ) {
          return prev;
        }
        return {
          ...prev,
          useClonedVoice: settings.useClonedVoice,
          clonedVoicePath: settings.clonedVoicePath,
          voiceId: settings.voiceId,
        };
      });
    }
  }, [settings.useClonedVoice, settings.clonedVoicePath, settings.voiceId]);

  // Save scripts collection to LocalStorage
  const saveScriptsToStorage = (updated: VideoScript[]) => {
    setSavedScripts(updated);
    localStorage.setItem("video_saas_blueprints", JSON.stringify(updated));
  };

  // Helper to trigger stock media search for all scenes
  const resolveStockVideos = async (rawScript: VideoScript, pexelsKey: string) => {
    setIsLoadingVideos(true);
    try {
      const updatedScenes = await Promise.all(
        rawScript.scenes.map(async (scene) => {
          try {
            const res = await fetch("/api/pexels-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: scene.search_keywords,
                customApiKey: pexelsKey,
                aspectRatio: rawScript.aspectRatio || settings.aspectRatio,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              return {
                ...scene,
                video_url: data.video_url,
                image_url: data.image_url,
              };
            }
          } catch (err) {
            console.warn("Could not load media for scene index", scene.scene_number - 1, err);
          }
          return scene;
        })
      );

      setScript((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: updatedScenes,
        };
      });
    } catch (err) {
      console.error("Failed to resolve stock videos:", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Triggers video/image media refresh for a single scene
  const handleRefreshMedia = async (idx: number) => {
    if (!script) return;
    const activeScene = script.scenes[idx];
    
    // Set a tiny loading state for visual feedback
    setIsLoadingVideos(true);
    try {
      const res = await fetch("/api/pexels-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeScene.search_keywords,
          customApiKey: settings.pexelsApiKey,
          aspectRatio: script.aspectRatio || settings.aspectRatio,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScript((prev) => {
          if (!prev) return null;
          const updated = [...prev.scenes];
          updated[idx] = {
            ...updated[idx],
            video_url: data.video_url,
            image_url: data.image_url,
          };
          return {
            ...prev,
            scenes: updated,
          };
        });
      }
    } catch (err) {
      console.error("Could not refresh scene media", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Generate full script using Express Gemini backend
  const handleGenerateScript = async () => {
    setIsLoading(true);
    setGenerationError(null);
    setIsPlaying(false);
    setScript(null);
    setActiveSceneIndex(0);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: settings.topic,
          aspectRatio: settings.aspectRatio,
          language: settings.language,
          sceneCount: settings.sceneCount,
          tone: settings.tone,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Failed to generate AI script";
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch {
          if (errText && errText.trim().startsWith("<!doctype") || errText.includes("<html")) {
            errMsg = "The backend server returned an HTML error. Please try restarting the development server.";
          } else if (errText) {
            errMsg = errText;
          }
        }
        throw new Error(errMsg);
      }

      const resText = await res.text();
      let rawGenerated: any;
      try {
        rawGenerated = JSON.parse(resText);
      } catch {
        throw new Error("The backend server returned an invalid non-JSON response. Please check backend logs.");
      }
      
      // Normalize to ensure compatibility with all schemas (with or without Root-level video_title)
      const generated: VideoScript = {
        video_title: rawGenerated.video_title || rawGenerated.meta?.topic || settings.topic || "Untitled Video",
        language: rawGenerated.language || settings.language || "English",
        scenes: rawGenerated.scenes || [],
        isFallback: rawGenerated.isFallback || false,
      };
      
      // Inject settings metadata
      const fullyFeaturedScript: VideoScript = {
        ...generated,
        id: crypto.randomUUID(),
        aspectRatio: settings.aspectRatio,
        tone: settings.tone,
        voiceId: settings.voiceId,
        createdAt: new Date().toISOString(),
      };

      setScript(fullyFeaturedScript);

      // Trigger stock search keywords queries
      await resolveStockVideos(fullyFeaturedScript, settings.pexelsApiKey);

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit Save of current script (with any custom modifications)
  const handleSaveScript = async () => {
    if (!script) return;
    
    const existingIdx = savedScripts.findIndex((s) => s.id === script.id);
    let updated: VideoScript[];

    const savedVersion: VideoScript = {
      ...script,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updated = [...savedScripts];
      updated[existingIdx] = savedVersion;
    } else {
      updated = [savedVersion, ...savedScripts];
    }

    saveScriptsToStorage(updated);

    if (user) {
      try {
        const docRef = doc(db, "projects", script.id!);
        await setDoc(docRef, {
          ...savedVersion,
          userId: user.uid
        });
      } catch (err) {
        console.error("Failed to save project to Firestore:", err);
        handleFirestoreError(err, OperationType.UPDATE, `projects/${script.id}`);
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const onLoadScript = (selected: VideoScript) => {
    setScript(selected);
    setSettings((prev) => ({
      ...prev,
      aspectRatio: selected.aspectRatio || "16:9",
      tone: selected.tone || "educational",
      language: selected.language || "English",
      sceneCount: selected.scenes.length,
    }));
    setActiveSceneIndex(0);
    setIsPlaying(false);
    setShowSavedModal(false);
  };

  const onDeleteScript = async (id: string) => {
    const filtered = savedScripts.filter((s) => s.id !== id);
    saveScriptsToStorage(filtered);

    if (user) {
      try {
        const docRef = doc(db, "projects", id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Failed to delete project from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
      }
    }
  };

  // Copy structured JSON payload
  const handleCopyJSON = () => {
    if (!script) return;
    
    // Strip client-side visual links to match raw schema requested by backend
    const strippedScript = {
      video_title: script.video_title,
      language: script.language === "Bengali" ? "bn" : "en",
      scenes: script.scenes.map((s) => ({
        scene_number: s.scene_number,
        voiceover_text: s.voiceover_text,
        subtitle: s.subtitle,
        search_keywords: s.search_keywords,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(strippedScript, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download export JSON file
  const handleDownloadJSON = () => {
    if (!script) return;
    
    const strippedScript = {
      video_title: script.video_title,
      language: script.language === "Bengali" ? "bn" : "en",
      scenes: script.scenes.map((s) => ({
        scene_number: s.scene_number,
        voiceover_text: s.voiceover_text,
        subtitle: s.subtitle,
        search_keywords: s.search_keywords,
      })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strippedScript, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${script.video_title.toLowerCase().replace(/\s+/g, "_")}_script.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download styled Production Markdown Script File
  const handleDownloadMarkdown = () => {
    if (!script) return;

    let md = `# Production Script: ${script.video_title}\n\n`;
    md += `**Topic:** ${settings.topic || "Custom Topic"}\n`;
    md += `**Language:** ${script.language}\n`;
    md += `**Tone:** ${script.tone}\n`;
    md += `**Format:** ${script.aspectRatio}\n\n`;
    md += `--- \n\n`;

    script.scenes.forEach((scene) => {
      md += `## Scene ${scene.scene_number}\n`;
      md += `🗣️ **Voiceover Narration:** \n> ${scene.voiceover_text}\n\n`;
      md += `📺 **On-Screen Subtitle:** \n> "${scene.subtitle}"\n\n`;
      md += `🔍 **Pexels/Pixabay Search Terms:** \n\`${scene.search_keywords}\`\n\n`;
      md += `--- \n\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${script.video_title.toLowerCase().replace(/\s+/g, "_")}_production.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Sidebar Navigation Layout on the left */}
      <SaaSSidebar />

      {/* Main Studio center canvas */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-zinc-950 overflow-hidden">
        
        {/* Sidebar Workspace settings Panel (Prompt options on left pane) */}
        <div className="w-full md:w-[350px] lg:w-[380px] flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950">
          <Sidebar
            settings={settings}
            setSettings={setSettings}
            onGenerate={handleGenerateScript}
            isLoading={isLoading}
            onOpenSaved={() => setShowSavedModal(true)}
            savedCount={savedScripts.length}
          />
        </div>

        {/* Studio Active Workspace (Viewports, Timelines on right pane) */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-900/10 p-5 overflow-y-auto">
          
          {/* Workspace Action Toolbar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-900">
            <div>
              <h2 className="font-display font-black text-lg tracking-tight text-white uppercase flex items-center gap-2">
                Script Production Studio
                {isLoadingVideos && (
                  <span className="flex items-center gap-1.5 text-[9px] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    SYNCING STOCK ASSETS
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Compose, refine, and preview video scripts in multiple languages with synchronized visual elements.
              </p>
            </div>

            {/* Quick Toolbar Action buttons */}
            {script && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSaveScript}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  title="Save script blueprint locally"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-zinc-400" />
                      Save Project
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyJSON}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  title="Copy standard JSON schema"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied JSON!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      Copy JSON
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  title="Download exportable JSON schema file"
                >
                  <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                  Export JSON
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  title="Download structured markdown story file"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Export MD Script
                </button>
              </div>
            )}
          </div>

          {/* Workspace Bento Grids */}
          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full flex flex-col items-center justify-center text-center py-24 space-y-4"
                >
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <Sparkles className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-white text-sm uppercase">Gemini Producer is writing...</h3>
                    <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mx-auto">
                      Structuring scenes, translating narration, designing captions, and optimizing stock keyword search formulas...
                    </p>
                  </div>
                </motion.div>
              ) : generationError ? (
                <motion.div
                  key="error-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3 bg-rose-950/20 border border-rose-500/10 rounded-2xl p-6 max-w-lg mx-auto mt-12"
                >
                  <Info className="w-8 h-8 text-rose-400 animate-pulse" />
                  <h3 className="font-display font-bold text-rose-300 text-sm uppercase">Failed to Generate Script</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {generationError}
                  </p>
                  <button
                    onClick={handleGenerateScript}
                    className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Retry Script Generation
                  </button>
                </motion.div>
              ) : script ? (
                <motion.div
                  key="workspace-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {script.isFallback && (
                    <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
                      <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-indigo-300">Resilient Fallback Mode:</span> Gemini is currently experiencing extremely high traffic (503). To maintain seamless operation, we have generated an optimized storyboard template for <span className="font-mono text-white bg-indigo-500/10 px-1 py-0.5 rounded font-bold">"{script.video_title}"</span> in <span className="text-white font-semibold">{script.language}</span>. You can customize, preview, and export this script!
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-start">
                    {/* Visual Video Preview Player Canvas (Landscape/Portrait viewport auto-adjusts) */}
                    <div className="xl:col-span-6 h-full">
                      <VideoPlayer
                        script={script}
                        activeSceneIndex={activeSceneIndex}
                        setActiveSceneIndex={setActiveSceneIndex}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        isLoadingVideos={isLoadingVideos}
                      />
                    </div>

                    {/* Direct Scene Editor Timeline Script and Manual refresh queries */}
                    <div className="xl:col-span-6 h-full">
                      <SceneEditor
                        script={script}
                        setScript={setScript}
                        activeSceneIndex={activeSceneIndex}
                        setActiveSceneIndex={setActiveSceneIndex}
                        onRefreshMedia={handleRefreshMedia}
                        pexelsApiKey={settings.pexelsApiKey}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-500 space-y-4 max-w-sm mx-auto mt-12"
                >
                  <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-full">
                    <Video className="w-8 h-8 text-zinc-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-zinc-300 text-sm uppercase">Studio Workspace is Empty</h3>
                    <p className="text-xs leading-relaxed">
                      Write your topic on the sidebar and click **Generate AI Script**, or click the **Niche Ideas** tab to select from our pre-curated high-performing concepts!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Saved Blueprints Modal Popup Drawer */}
      {showSavedModal && (
        <SavedProjects
          savedScripts={savedScripts}
          onLoadScript={onLoadScript}
          onDeleteScript={onDeleteScript}
          onClose={() => setShowSavedModal(false)}
        />
      )}
    </div>
  );
}
