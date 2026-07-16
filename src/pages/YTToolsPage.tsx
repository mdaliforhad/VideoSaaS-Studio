import React, { useState } from "react";
import { 
  Search, 
  Copy, 
  Download, 
  Tag, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import SaaSSidebar from "../components/SaaSSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthProvider";

export default function YTToolsPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    title: string;
    description: string;
    tags: string[];
    thumbnail: string;
    videoId: string;
    isFallback: boolean;
  } | null>(null);

  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const handleFetchMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/yt-tools/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract YouTube metadata.");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error("[YT Tools] Error fetching metadata:", err);
      setError(err.message || "An error occurred while communicating with the extraction service.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, type: "title" | "desc" | "tags") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else if (type === "desc") {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    } else if (type === "tags") {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2000);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* SaaS Sidebar Navigation */}
      <SaaSSidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-zinc-950 overflow-y-auto">
        <Navbar />

        <div className="p-6 sm:p-10 max-w-5xl mx-auto w-full space-y-8 pb-16 animate-fade-in">
          
          {/* Header Introduction */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold font-mono tracking-wider uppercase">
                <span>Optimization Suite</span>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-zinc-400">SEO Toolkit</span>
              </div>
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                YouTube SEO Tools
              </h1>
              <p className="text-zinc-500 text-xs sm:text-sm max-w-xl">
                Inspect, optimize, and pull metadata directly from any public YouTube URL. Clean, cookie-free metadata parsing.
              </p>
            </div>
          </div>

          {/* URL Entry Section */}
          <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Extract Metadata</h2>
            </div>
            
            <form onSubmit={handleFetchMetadata} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Paste YouTube URL</label>
                <div className="relative flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g., https://www.youtube.com/watch?v=-VICkpHWWCQ or YouTube Shorts link"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:border-indigo-500 outline-none transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-black uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-50 shrink-0"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {loading ? "Parsing..." : "Extract"}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase">
                  <AlertCircle className="w-4 h-4" />
                  Extraction Incident
                </div>
                <p className="text-[11px] text-zinc-300 font-mono leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Results Output Component */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Left Column - Text Details */}
              <div className="space-y-6">
                
                {/* Title Box */}
                <div id="seo-title-card" className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      Extracted Title
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(data.title, "title")}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/50 rounded border border-indigo-900/40 transition-all cursor-pointer"
                    >
                      {copiedTitle ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedTitle ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm font-bold text-zinc-100 font-sans tracking-tight leading-snug">
                    {data.title}
                  </p>
                </div>

                {/* Description Box */}
                <div id="seo-desc-card" className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      Extracted Description
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(data.description, "desc")}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/50 rounded border border-indigo-900/40 transition-all cursor-pointer"
                    >
                      {copiedDesc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedDesc ? "Copied" : "Copy Description"}
                    </button>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900/80 rounded-xl p-3 h-60 overflow-y-auto text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed select-all selection:bg-indigo-500/20">
                    {data.description || <span className="text-zinc-600 italic">No description tags are set.</span>}
                  </div>
                </div>

              </div>

              {/* Right Column - Media and Tags */}
              <div className="space-y-6">
                
                {/* Thumbnail Preview and Action Link */}
                <div id="seo-thumbnail-card" className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">
                    HD Video Thumbnail Preview
                  </span>
                  
                  <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 relative group">
                    <img
                      src={data.thumbnail}
                      alt="YouTube HD Thumbnail"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[10px] font-bold text-white font-mono tracking-wider bg-black/60 backdrop-blur-md px-2 py-1 rounded">
                        {data.isFallback ? "HD_STANDARD_FALLBACK" : "MAX_RES_HD_RESOLVED"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <a
                      href={`/api/yt-tools/download-thumbnail?videoId=${data.videoId}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-black uppercase text-white rounded-xl transition-all shadow-lg shadow-indigo-600/10 text-center cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download HD Thumbnail
                    </a>
                  </div>
                </div>

                {/* Tags Section */}
                <div id="seo-tags-card" className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      Extracted Tag Pills
                    </span>
                    {data.tags && data.tags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(data.tags.join(", "), "tags")}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/50 rounded border border-indigo-900/40 transition-all cursor-pointer"
                      >
                        {copiedTags ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedTags ? "Copied" : "Copy All Tags"}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-zinc-950 border border-zinc-900/80 rounded-xl p-3 h-28 overflow-y-auto flex flex-wrap gap-2 select-all selection:bg-indigo-500/20">
                    {data.tags && data.tags.length > 0 ? (
                      data.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/40 px-2.5 py-1 rounded-full"
                        >
                          <Tag className="w-2.5 h-2.5 text-indigo-500" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-xs italic self-center mx-auto">
                        No tag descriptors are assigned to this video.
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Guidelines info */}
          <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-300">Direct CDN Processing</h4>
              <p className="text-[10px] text-zinc-500 leading-normal font-mono">
                The extraction engine operates outside of Google credentials loops. Results are retrieved using the production-level yt-dlp layer directly. HD Thumbnail points to maxresdefault.jpg CDN endpoint.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
