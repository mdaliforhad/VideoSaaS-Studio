import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Video, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

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
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
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
    </header>
  );
}
