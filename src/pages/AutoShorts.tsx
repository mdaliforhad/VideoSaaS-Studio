import React, { useState, useEffect } from "react";
import { Scissors, Upload, Play, Loader2, Download, Cloud, Key, AlertCircle } from "lucide-react";
import SaaSSidebar from "../components/SaaSSidebar";
import { useAuth } from "../components/AuthProvider";

export default function AutoShorts() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [engine, setEngine] = useState("gemini-1.5-flash");
  const [driveConnected, setDriveConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        user.getIdToken().then(token => {
            fetch("/api/connections", {
              headers: { "Authorization": `Bearer ${token}` }
            })
              .then(res => res.json())
              .then(data => setDriveConnected(data.google_drive));
        });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setYoutubeUrl("");
    }
  };

  const processShorts = async () => {
    if (!file && !youtubeUrl) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    if (file) formData.append("video", file);
    if (youtubeUrl) formData.append("youtubeUrl", youtubeUrl);
    formData.append("engine", engine);

    try {
      const headers: Record<string, string> = {};
      if (user) {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/process-shorts", {
        method: "POST",
        headers: headers,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process short");
      }
      setResult(data.videoUrl);
    } catch (err: any) {
      console.error("Error processing shorts:", err);
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <SaaSSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Scissors className="text-indigo-400" />
            AutoShorts AI
          </h1>
          <p className="text-zinc-400 mt-2">Convert long videos into viral short-form clips.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-zinc-300">Upload Long Video</label>
              <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
                <input type="file" onChange={handleFileChange} className="hidden" id="videoUpload" />
                <label htmlFor="videoUpload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-zinc-500" />
                  <span className="text-sm text-zinc-400">{file ? file.name : "Click to upload"}</span>
                </label>
              </div>
              
              {driveConnected && (
                <button className="w-full py-3 mb-4 bg-zinc-800 border border-zinc-700 rounded-xl font-bold hover:bg-zinc-700 flex items-center justify-center gap-2">
                  <Cloud className="h-4 w-4" /> Select from Google Drive
                </button>
              )}
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-zinc-500">Or paste URL</span>
                </div>
              </div>

              <input 
                type="text" 
                placeholder="https://youtube.com/... or direct video .mp4 URL" 
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); setFile(null); }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-zinc-500 leading-normal font-mono mt-1">
                💡 <strong>Source Tip:</strong> Upload a long video file directly using the box above for 100% reliability. Direct video MP4 URLs also work perfectly. YouTube link extraction is frequently restricted by bot challenges on cloud hosting environments.
              </p>


              
              <label className="block text-sm font-bold text-zinc-300">AI Engine</label>
              <select 
                value={engine} 
                onChange={(e) => setEngine(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={processShorts}
                disabled={(!file && !youtubeUrl) || loading}
                className="w-full py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Scissors className="h-4 w-4" />}
                Process Short
              </button>
            </div>
          </section>

          <section className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h2 className="text-lg font-bold mb-4">Preview</h2>
            {result ? (
              <div className="space-y-4">
                <video src={result} controls className="w-full rounded-xl border border-zinc-800" />
                <a href={result} download className="w-full py-3 bg-zinc-800 rounded-xl font-bold hover:bg-zinc-700 flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                Result will appear here
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
