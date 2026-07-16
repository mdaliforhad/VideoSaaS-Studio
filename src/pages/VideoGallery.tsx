import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  Trash2, 
  Youtube, 
  Play, 
  Film, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Search, 
  Layout, 
  Maximize2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Check,
  Info,
  UploadCloud,
  FileVideo,
  Plus,
  X
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthProvider";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, setDoc } from "firebase/firestore";

interface CompiledVideo {
  id: string;
  video_title: string;
  video_url: string;
  aspectRatio: string;
  createdAt: string;
  isDemo?: boolean;
}

export default function VideoGallery() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<CompiledVideo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "16:9" | "9:16">("all");
  
  // YouTube Publishing modal states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingVideo, setPublishingVideo] = useState<CompiledVideo | null>(null);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("unlisted");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isYtConnected, setIsYtConnected] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Video Playing modal states
  const [playingVideo, setPlayingVideo] = useState<CompiledVideo | null>(null);

  // My Device Video Upload states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAspectRatio, setUploadAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load from local storage / Firestore + mock seeding
  useEffect(() => {
    const defaultDemos: CompiledVideo[] = [
      {
        id: "demo-1",
        video_title: "5 Mind-Bending Space Facts Everyone Ignores",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-galaxy-exploration-with-a-spaceship-42993-large.mp4",
        aspectRatio: "16:9",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        isDemo: true,
      },
      {
        id: "demo-2",
        video_title: "The Ultimate Guide to Passive SaaS Income",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-mysterious-pills-falling-in-neon-vertical-video-45136-large.mp4",
        aspectRatio: "9:16",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        isDemo: true,
      },
      {
        id: "demo-3",
        video_title: "Why AI Will Not Replace Creative Software Engineers",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4",
        aspectRatio: "16:9",
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
        isDemo: true,
      }
    ];

    let active = true;

    const fetchVideos = async () => {
      if (user) {
        try {
          const q = query(collection(db, "compiled_videos"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetched: CompiledVideo[] = [];
          querySnapshot.forEach((docSnap) => {
            fetched.push(docSnap.data() as CompiledVideo);
          });
          if (active) {
            setVideos([...fetched, ...defaultDemos]);
            localStorage.setItem("compiled_saas_videos", JSON.stringify(fetched));
          }
        } catch (err) {
          console.error("Failed to load compiled videos from Firestore, falling back to cache:", err);
          const raw = localStorage.getItem("compiled_saas_videos");
          if (raw && active) {
            try {
              const stored = JSON.parse(raw);
              setVideos([...stored, ...defaultDemos]);
            } catch (e) {
              setVideos(defaultDemos);
            }
          } else if (active) {
            setVideos(defaultDemos);
          }
        }
      } else {
        const raw = localStorage.getItem("compiled_saas_videos");
        if (raw && active) {
          try {
            const stored = JSON.parse(raw);
            setVideos([...stored, ...defaultDemos]);
          } catch (e) {
            setVideos(defaultDemos);
          }
        } else if (active) {
          setVideos(defaultDemos);
        }
      }
    };

    fetchVideos();

    // Check YouTube connection status
    const checkYt = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/youtube/status", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setIsYtConnected(data.connected);
          }
        }
      } catch (err) {
        console.error("Failed to fetch YT connection state in gallery:", err);
      }
    };
    checkYt();

    return () => {
      active = false;
    };
  }, [user]);

  // Save changes helper
  const saveToStorage = (updatedList: CompiledVideo[]) => {
    setVideos(updatedList);
    const nonDemos = updatedList.filter((v) => !v.isDemo);
    localStorage.setItem("compiled_saas_videos", JSON.stringify(nonDemos));
  };

  // Delete video handler
  const handleDeleteVideo = async (id: string) => {
    const updated = videos.filter((v) => v.id !== id);
    saveToStorage(updated);
    if (playingVideo?.id === id) {
      setPlayingVideo(null);
    }

    if (user) {
      try {
        const docRef = doc(db, "compiled_videos", id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Failed to delete video from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `compiled_videos/${id}`);
      }
    }
  };

  // Download MP4 action
  const handleDownloadMp4 = (video: CompiledVideo) => {
    if (video.isDemo) {
      // Direct mixkit link download
      window.open(video.video_url, "_blank");
    } else {
      // Production video compile download
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", video.video_url);
      downloadAnchor.setAttribute("download", `${video.video_title.toLowerCase().replace(/\s+/g, "_")}.mp4`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  // Publish to YT action
  const openPublishModal = (video: CompiledVideo) => {
    setPublishingVideo(video);
    setPublishTitle(video.video_title);
    setPublishDescription(`Title: ${video.video_title}\n\nThis video was rendered on the Script to Video SaaS Platform.\n\nEnjoy the production!`);
    setPublishSuccess(null);
    setPublishError(null);
    setIsPublishModalOpen(true);
  };

  const handlePublishToYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishingVideo) return;
    setIsPublishing(true);
    setPublishSuccess(null);
    setPublishError(null);

    try {
      // If connected, upload to real YouTube API
      if (isYtConnected && !publishingVideo.isDemo) {
        const res = await fetch("/api/youtube/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: publishingVideo.id,
            title: publishTitle,
            description: publishDescription,
            aspect_ratio: publishingVideo.aspectRatio,
            privacyStatus
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to publish video to YouTube.");
        }
        setPublishSuccess(data.videoUrl || "https://youtube.com");
      } else {
        // Simulated upload for demo videos or unconnected users
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setPublishSuccess("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      }
    } catch (err: any) {
      console.error(err);
      setPublishError(err.message || "Could not publish video due to connection limits.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle local video selection checks
  const handleFileChange = (file: File) => {
    setUploadError(null);
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "mp4" && fileExt !== "mov") {
      setUploadError("Unsupported format. Please upload an MP4 or MOV video file.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File too large. Maximum supported size is 500MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  // Perform device video upload flow
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(15);

    // Set up a 120-second network timeout guard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      // 1. Prepare FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("aspectRatio", uploadAspectRatio);
      
      setUploadProgress(50);

      // 2. POST payload to local server endpoint with Abort Signal
      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      // Clear timeout immediately upon response
      clearTimeout(timeoutId);
      setUploadProgress(75);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to upload video to the server." }));
        throw new Error(errorData.error || "Failed to upload video to the server.");
      }

      const result = await response.json();
      setUploadProgress(90);

      // 3. Document details for Firestore / Local Cache
      const newVideoId = result.video?.id || `upload_${Date.now()}`;
      const newVideoRecord: CompiledVideo = {
        id: newVideoId,
        video_title: result.video?.video_title || selectedFile.name,
        video_url: result.video?.video_url || result.videoUrl || "",
        aspectRatio: uploadAspectRatio,
        createdAt: result.video?.createdAt || new Date().toISOString(),
      };

      // 4. Prepend to current screen grid lists & trigger React render
      const updatedVideos = [newVideoRecord, ...videos];
      saveToStorage(updatedVideos);

      // 5. Save securely to Firestore database if authenticated (soft try/catch so db permission error won't block UI success)
      if (user) {
        try {
          const docRef = doc(db, "compiled_videos", newVideoId);
          await setDoc(docRef, {
            ...newVideoRecord,
            userId: user.uid,
          });
        } catch (dbErr) {
          console.warn("[Upload DB Warning] Could not sync compilation to cloud firestore database (proceeding with local storage):", dbErr);
        }
      }

      setUploadProgress(100);
      
      // Close modal and reset all states gracefully on success
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("[Upload Handler Error] Failed uploading file:", err);
      
      let friendlyError = err.message || "An unexpected error occurred during the video upload process.";
      if (err.name === "AbortError") {
        friendlyError = "Upload connection timed out. Please verify your network stability and try again.";
      }
      
      setUploadError(friendlyError);
      setIsUploading(false);
    }
  };

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.video_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = activeTab === "all" || video.aspectRatio === activeTab;
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-zinc-900 pb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg mb-2">
              <Film className="h-3.5 w-3.5" />
              PRODUCTION ARCHIVES
            </div>
            <h1 className="font-display text-2xl font-black uppercase text-white sm:text-4xl tracking-tight">
              My Video Gallery
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-xl">
              Manage, preview, and re-publish your compiled MP4 storyboards. Filter and trace all historical production jobs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setUploadError(null);
                setSelectedFile(null);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 px-5 py-3 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <UploadCloud className="h-4.5 w-4.5 text-indigo-400" />
              Upload MP4
            </button>

            <Link
              to="/studio"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/10 hover:scale-[1.01] transition-all"
            >
              Create New Video
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Toolbar Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl">
          {/* Format filter tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold font-display transition-colors cursor-pointer ${
                activeTab === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => setActiveTab("16:9")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold font-display transition-colors cursor-pointer ${
                activeTab === "16:9" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Landscape (16:9)
            </button>
            <button
              onClick={() => setActiveTab("9:16")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold font-display transition-colors cursor-pointer ${
                activeTab === "9:16" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Vertical (9:16)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search historical compilations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Video Grid */}
        <AnimatePresence mode="popLayout">
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => {
                const isVert = video.aspectRatio === "9:16";
                return (
                  <motion.div
                    key={video.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 shadow-lg"
                  >
                    {/* Media Container Aspect Ratio matches exactly */}
                    <div className="relative overflow-hidden bg-black aspect-[16/9] border-b border-zinc-900 flex items-center justify-center">
                      
                      {/* Video clip loop simulation */}
                      <video
                        src={video.video_url}
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-300"
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />

                      {/* Overlays */}
                      <button
                        onClick={() => setPlayingVideo(video)}
                        className="absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 cursor-pointer"
                      >
                        <Play className="h-5 w-5 fill-current translate-x-0.5" />
                      </button>

                      {/* Formatting pill */}
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-md px-2 py-1 text-[9px] font-mono tracking-wide text-zinc-300">
                        <span className={`h-1.5 w-1.5 rounded-full ${isVert ? "bg-rose-500 animate-pulse" : "bg-indigo-500"}`} />
                        {isVert ? "VERTICAL (9:16)" : "LANDSCAPE (16:9)"}
                      </div>

                      {/* Demo indicator */}
                      {video.isDemo && (
                        <div className="absolute top-3 right-3 z-10 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[8px] font-black uppercase font-mono tracking-widest px-2 py-0.5 rounded">
                          SAMPLE
                        </div>
                      )}
                    </div>

                    {/* Meta info bottom card body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="font-display font-bold text-sm text-zinc-100 leading-snug tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {video.video_title}
                        </h3>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-zinc-600 shrink-0" />
                            {new Date(video.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Card Overlay Actions */}
                      <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-3.5">
                        <button
                          onClick={() => handleDownloadMp4(video)}
                          className="flex-1 py-2 px-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Download high definition MP4 video file"
                        >
                          <Download className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          Download
                        </button>

                        <button
                          onClick={() => openPublishModal(video)}
                          className="flex-1 py-2 px-2.5 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 hover:border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Publish video to connected YouTube channel"
                        >
                          <Youtube className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
                          Publish to YT
                        </button>

                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="py-2 px-2 border border-zinc-800 hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete video compilation record"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-8 max-w-md mx-auto"
            >
              <Film className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-zinc-300 text-sm">No Videos Match Filter</h3>
              <p className="text-zinc-500 text-xs leading-relaxed mt-1 max-w-xs mx-auto">
                Try clearing your search query or routing back to the **Studio Workspace** to write and compile your first video!
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActiveTab("all");
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Overlay Playing Modal */}
        <AnimatePresence>
          {playingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-1"
              >
                {/* Header */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-zinc-800">
                  <Film className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-white max-w-xs truncate font-display">{playingVideo.video_title}</span>
                </div>

                <button
                  onClick={() => setPlayingVideo(null)}
                  className="absolute top-4 right-4 z-10 rounded-full bg-black/60 backdrop-blur-md border border-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>

                <div className="aspect-[16/9] bg-black flex items-center justify-center">
                  <video
                    src={playingVideo.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* YouTube Publishing modal */}
        <AnimatePresence>
          {isPublishModalOpen && publishingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-rose-500 animate-pulse" />
                    <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wider">
                      Publish to YouTube
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsPublishModalOpen(false)}
                    className="text-zinc-400 hover:text-zinc-200 text-xs font-bold px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                    disabled={isPublishing}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 overflow-y-auto max-h-[75vh]">
                  {publishSuccess ? (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                        <Check className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-xs text-zinc-100">Successfully Uploaded!</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                          Your video has been successfully published to YouTube with <strong>{privacyStatus}</strong> status. It is ready for the world!
                        </p>
                      </div>
                      <div className="pt-2 flex flex-col gap-2">
                        <a
                          href={publishSuccess}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/30 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on YouTube
                        </a>
                        <button
                          type="button"
                          onClick={() => setIsPublishModalOpen(false)}
                          className="w-full py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePublishToYouTube} className="space-y-4">
                      
                      {publishingVideo.isDemo && (
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 leading-relaxed flex gap-2">
                          <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>This is a <strong>Demo/Sample video</strong>. Connecting with a real API will be simulated so you can verify our full-screen publish UI experience safely!</span>
                        </div>
                      )}

                      {!isYtConnected && !publishingVideo.isDemo && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>YouTube channel not connected yet. We will simulate publication for you, or you can connect your channel in the Studio workspace sidebar.</span>
                        </div>
                      )}

                      {publishError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 leading-relaxed flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{publishError}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300">YouTube Video Title</label>
                        <input
                          type="text"
                          required
                          value={publishTitle}
                          onChange={(e) => setPublishTitle(e.target.value)}
                          maxLength={100}
                          disabled={isPublishing}
                          placeholder="E.g., 5 Crazy Facts about the Universe"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-rose-500 outline-none transition-all disabled:opacity-50"
                        />
                        <div className="text-right text-[9px] text-zinc-500">
                          {publishTitle.length}/100 characters
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300">Video Description</label>
                        <textarea
                          required
                          rows={4}
                          value={publishDescription}
                          onChange={(e) => setPublishDescription(e.target.value)}
                          disabled={isPublishing}
                          placeholder="Add description and keywords..."
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs leading-relaxed focus:border-rose-500 outline-none transition-all resize-none disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300">Privacy Status</label>
                        <select
                          value={privacyStatus}
                          onChange={(e) => setPrivacyStatus(e.target.value)}
                          disabled={isPublishing}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-rose-500 outline-none transition-all cursor-pointer"
                        >
                          <option value="unlisted">Unlisted (Recommended for review)</option>
                          <option value="public">Public (Publish immediately)</option>
                          <option value="private">Private (Only you can view)</option>
                        </select>
                      </div>

                      <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPublishing}
                          onClick={() => setIsPublishModalOpen(false)}
                          className="py-2 px-3 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPublishing}
                          className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/20 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          {isPublishing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Youtube className="w-3.5 h-3.5 text-rose-200" />
                              <span>Publish Now</span>
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Device Video Upload Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileVideo className="w-5 h-5 text-indigo-400 shrink-0" />
                    <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wider">
                      Upload Video from Device
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (!isUploading) {
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                      }
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-xs font-bold px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                  {uploadError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 leading-relaxed flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Drag and Drop Zone */}
                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]" 
                          : "border-zinc-850 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/70"
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload-input"
                        accept=".mp4,.mov"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            handleFileChange(files[0]);
                          }
                        }}
                      />
                      <UploadCloud className={`h-10 w-10 mx-auto mb-3 transition-transform ${isDragging ? "animate-bounce text-indigo-400" : "text-zinc-500"}`} />
                      <p className="text-zinc-200 text-xs font-bold leading-snug">
                        Drag & Drop your video from Device or Click to Browse
                      </p>
                      <p className="text-zinc-500 text-[10px] mt-2 font-mono">
                        Supports MP4, MOV up to 500MB
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 flex items-start gap-3.5 relative">
                      <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                        <FileVideo className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-bold text-zinc-100 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.type || "Video File"}
                        </p>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Aspect Ratio Config */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Video Format Alignment</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => setUploadAspectRatio("16:9")}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          uploadAspectRatio === "16:9"
                            ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-950/10"
                            : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        }`}
                      >
                        <Layout className="w-3.5 h-3.5" />
                        Landscape (16:9)
                      </button>

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => setUploadAspectRatio("9:16")}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          uploadAspectRatio === "9:16"
                            ? "bg-rose-600/10 border-rose-500 text-rose-400 shadow-md shadow-rose-950/10"
                            : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5 rotate-90" />
                        Vertical (9:16)
                      </button>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-indigo-400 animate-pulse font-bold">Uploading to media storage...</span>
                        <span className="text-zinc-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer Action Controls */}
                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                      }}
                      className="py-2.5 px-4 border border-zinc-850 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/50 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile || isUploading}
                      onClick={handleUploadSubmit}
                      className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Upload Video</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
