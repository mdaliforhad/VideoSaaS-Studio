import React from "react";
import { NavLink, Link } from "react-router-dom";
import { Video, Film, CreditCard, Sparkles, LogOut, ExternalLink, User, Radio } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function SaaSSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-full md:w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between h-full shrink-0 select-none animate-fade-in">
      <div className="flex flex-col space-y-7 p-6">
        {/* Branding Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all group-hover:scale-105">
            <Video className="h-4.5 w-4.5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
          </div>
          <span className="font-display text-base font-black uppercase tracking-wider text-white">
            VideoSaaS <span className="text-indigo-400 text-xs">Studio</span>
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono block mb-3 px-3">
            Navigation Menu
          </span>
          <nav className="space-y-1.5">
            <NavLink
              to="/studio"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`
              }
            >
              <Video className="h-4 w-4 text-zinc-400 group-hover:text-indigo-400 shrink-0" />
              <span>Create Video</span>
              <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </NavLink>

            <NavLink
              to="/videos"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`
              }
            >
              <Film className="h-4 w-4 text-zinc-400 group-hover:text-indigo-400 shrink-0" />
              <span>My Video Gallery</span>
            </NavLink>

            <NavLink
              to="/stream"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`
              }
            >
              <Radio className="h-4 w-4 text-zinc-400 group-hover:text-indigo-400 shrink-0" />
              <span>24/7 Live Streamer</span>
            </NavLink>

            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`
              }
            >
              <CreditCard className="h-4 w-4 text-zinc-400 group-hover:text-indigo-400 shrink-0" />
              <span>Billing/Pricing</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Footer Info Box & User Profile Block */}
      <div className="p-6 border-t border-zinc-900 bg-zinc-950/40 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-center space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">PRO MEMBERSHIP</span>
          <span className="text-[11px] text-zinc-400 block leading-normal">Full production features unlocked</span>
          <Link
            to="/pricing"
            className="w-full py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-[10px] font-bold text-white block hover:opacity-90 transition-opacity"
          >
            Upgrade Tier
          </Link>
        </div>

        {/* User profile details bottom drawer */}
        {user && (
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-900 bg-zinc-950/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-zinc-800/80 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 select-none">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "Avatar"} 
                    className="h-full w-full rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(user.displayName || user.email || "?")[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white truncate leading-tight">
                  {user.displayName || "Creator"}
                </span>
                <span className="text-[9px] text-zinc-500 truncate font-mono">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer shrink-0 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
