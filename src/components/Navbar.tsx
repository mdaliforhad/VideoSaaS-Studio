import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Video, Sparkles, LogOut, X, Play, Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State for the "New Live" stream modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [videoTitle, setVideoTitle] = React.useState("");
  const [videoSource, setVideoSource] = React.useState("");
  const [rtmpUrl, setRtmpUrl] = React.useState("");
  const [streamKey, setStreamKey] = React.useState("");
  const [loopMode, setLoopMode] = React.useState("infinite");
  const [youtubeCookies, setYoutubeCookies] = React.useState("");
  const [showCookiesConfig, setShowCookiesConfig] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/stream/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          videoSource,
          rtmpUrl,
          streamKey,
          videoTitle,
          loopMode,
          youtubeCookies: youtubeCookies.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate stream broadcast");
      }

      setSuccessMessage("Stream broadcast started successfully!");
      setVideoTitle("");
      setVideoSource("");
      setRtmpUrl("");
      setStreamKey("");

      setTimeout(() => {
        setIsModalOpen(false);
        navigate("/stream");
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to features on landing page, or go to landing page with anchor
  const handleFeaturesClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const featuresSection = document.getElementById("features");
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Glowing Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]">
            <Video className="h-4.5 w-4.5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 animate-pulse text-yellow-300" />
          </div>
          <span className="font-display text-lg font-black uppercase tracking-wider text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent group-hover:from-indigo-400 group-hover:to-purple-400 transition-all duration-300">
            VideoSaaS <span className="text-indigo-400 group-hover:text-purple-300 font-extrabold text-sm align-super tracking-normal">Studio</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
          <Link
            to="/#features"
            onClick={handleFeaturesClick}
            className="text-zinc-400 hover:text-white transition-colors duration-200"
          >
            Features
          </Link>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `relative py-1 transition-colors duration-200 hover:text-white ${
                isActive ? "text-indigo-400 font-semibold" : "text-zinc-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                Pricing
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
          <NavLink
            to="/videos"
            className={({ isActive }) =>
              `relative py-1 transition-colors duration-200 hover:text-white ${
                isActive ? "text-indigo-400 font-semibold" : "text-zinc-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                My Videos
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* Auth / CTA Button Controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3.5">


              {/* Profile Block */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-white leading-none">
                  {user.displayName || "Creator Profile"}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {user.email}
                </span>
              </div>

              {/* User Avatar */}
              <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-zinc-800 flex items-center justify-center text-indigo-400 font-bold text-xs select-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "Avatar"} 
                    className="h-full w-full rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(user.displayName || user.email || "?")[0].toUpperCase()}</span>
                )}
              </div>

              {/* Quick Sign Out Icon */}
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Launch Studio Link */}
              <Link
                to="/studio"
                className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95 transition-all duration-200"
              >
                <span className="relative z-10 flex items-center gap-1">
                  Dashboard
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors py-2 px-3.5"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95 transition-all duration-200"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  Launch Studio
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* New Live Stream Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Live Stream</h2>
                <p className="text-xs text-zinc-400">Launch a persistent 24/7 restream to any RTMP target</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleStartStream} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Stream Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24/7 Lo-Fi Beats & Visuals"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Video Source URL</label>
                <input
                  type="text"
                  required
                  placeholder="YouTube link, Google Drive video or MP4 stream"
                  value={videoSource}
                  onChange={(e) => setVideoSource(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Supports Google Drive video uploads, direct web MP4s, or YouTube live/videos.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">RTMP Ingestion Server</label>
                  <input
                    type="text"
                    required
                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Stream Key</label>
                  <input
                    type="password"
                    required
                    placeholder="••••-••••-••••-••••"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Loop Mode</label>
                <select
                  value={loopMode}
                  onChange={(e) => setLoopMode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="infinite">Infinite Looping (24/7 Streamer)</option>
                  <option value="once">Play Video Once & Terminate</option>
                </select>
              </div>

              {/* Advanced: YouTube Auth Cookies */}
              <div className="border border-zinc-900 rounded-xl bg-zinc-950/40 p-4 mt-3">
                <button
                  type="button"
                  onClick={() => setShowCookiesConfig(!showCookiesConfig)}
                  className="flex items-center justify-between w-full text-left focus:outline-none"
                >
                  <div>
                    <span className="text-xs font-black uppercase text-zinc-300 tracking-wider">Advanced: YouTube Auth Cookies</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Paste Netscape format cookies to bypass bot checks on YouTube links.</p>
                  </div>
                  <span className="text-zinc-500 hover:text-white transition-colors text-xs font-bold select-none cursor-pointer">
                    {showCookiesConfig ? "Hide" : "Configure"}
                  </span>
                </button>

                {showCookiesConfig && (
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                      Netscape Cookie File Data
                    </label>
                    <textarea
                      rows={3}
                      value={youtubeCookies}
                      onChange={(e) => setYoutubeCookies(e.target.value)}
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#10;..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-800 font-mono"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                      Paste exported cookies to bypass "Sign in to confirm you're not a bot" errors.
                    </p>
                  </div>
                )}
              </div>



              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-900 mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-805 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold text-white shadow-lg cursor-pointer hover:shadow-red-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Initiating Broadcast..." : "Start Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
