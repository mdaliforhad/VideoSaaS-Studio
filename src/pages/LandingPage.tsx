import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Play, 
  Mic, 
  Smile, 
  Youtube, 
  ArrowRight, 
  Zap, 
  Cpu, 
  TrendingUp, 
  Video,
  Layers,
  Award,
  Globe,
  Plus
} from "lucide-react";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const features = [
    {
      icon: <Mic className="h-6 w-6 text-indigo-400" />,
      title: "AI Voice & Narration",
      badge: "ULTRA NATURAL",
      description: "Generate professional human-like voiceovers in multiple languages instantly. No mechanical voice tones.",
    },
    {
      icon: <Smile className="h-6 w-6 text-purple-400" />,
      title: "Hormozi-Style Auto-Emojis",
      badge: "MAX ENGAGEMENT",
      description: "Our advanced syntax parser automatically clusters context keywords and adds high-impact bouncy emojis above captions.",
    },
    {
      icon: <Youtube className="h-6 w-6 text-emerald-400" />,
      title: "1-Click YT Publishing",
      badge: "STREAMLINED",
      description: "Directly compile, render and publish your shorts or cinematic videos to your YouTube channel as Public, Private, or Unlisted.",
    }
  ];

  const stats = [
    { value: "10x", label: "Faster Production" },
    { value: "85%", label: "Higher CTR" },
    { value: "2M+", label: "Videos Rendered" },
    { value: "99.9%", label: "Uptime SLA" }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      <Navbar />

      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden opacity-30 select-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/10 blur-[100px]" />
        <div className="absolute top-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-600/20 to-pink-500/10 blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Top tag badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300">
            <Zap className="h-3 w-3 text-indigo-400 animate-pulse" />
            Empowering 20,000+ creators worldwide
          </div>

          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.1]">
            Transform Ideas Into{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              Viral Videos
            </span>{" "}
            In One Click
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Automate script writing, realistic voiceover narration, and high-impact captioning with synced stock footage. Crafted for vertical Shorts, Reels, and cinematic horizontal formats.
          </p>

          {/* Interactive Hero CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/studio"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 text-indigo-200" />
            </Link>

            <button
              onClick={() => setShowDemoModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 px-8 py-4 text-sm font-bold text-zinc-200 hover:text-white transition-all duration-200 cursor-pointer"
            >
              <Play className="h-4 w-4 text-indigo-400 shrink-0" />
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Floating Mock Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 sm:mt-20 max-w-5xl mx-auto relative rounded-2xl border border-zinc-800 bg-zinc-900/30 p-2 backdrop-blur-md overflow-hidden shadow-2xl shadow-black/80 group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-40" />
          <div className="absolute -inset-px bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 aspect-[16/9] bg-zinc-950 flex items-center justify-center">
            
            {/* Visual simulation overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950" />
            
            {/* Interactive demo button trigger */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-110 active:scale-95 transition-all duration-300 group/btn cursor-pointer"
            >
              <Play className="h-6 w-6 text-white fill-current translate-x-0.5 group-hover/btn:scale-105" />
            </button>
            
            <div className="absolute bottom-6 left-6 text-left max-w-xs z-10">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">WORKSPACE DASHBOARD DEMO</span>
              <h4 className="text-sm font-bold text-white mt-1">Experience seamless storyboard automation.</h4>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              AUTO-MEDIA ALIGNMENT
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Divider bar */}
      <section className="border-y border-zinc-900 bg-zinc-950/40 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent font-display">
                  {stat.value}
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-24 relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">Core Capabilities</h2>
          <h3 className="font-display text-3xl font-black uppercase text-white sm:text-5xl tracking-tight">
            Designed for Instant Virality
          </h3>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            Eliminate hours of manual editing, script block brainstorming, and caption alignments with smart automation.
          </p>
        </div>

        {/* 3-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between group cursor-default"
            >
              {/* Subtle background glow on hover */}
              <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300 pointer-events-none" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-md">
                    {feat.icon}
                  </div>
                  <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded px-2 py-0.5">
                    {feat.badge}
                  </span>
                </div>
                
                <h4 className="font-display text-lg font-bold text-white group-hover:text-indigo-300 transition-colors duration-200">
                  {feat.title}
                </h4>
                
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-900 mt-6 flex items-center text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors duration-200">
                Explore in Studio
                <ArrowRight className="h-3.5 w-3.5 ml-1.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Conversion Banner Section */}
      <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/20 p-8 sm:p-12 text-center backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h3 className="font-display text-2xl font-black uppercase text-white sm:text-4xl tracking-tight">
              Ready to automate your pipeline?
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Create your first fully synthesized video story with high-impact captions in minutes. No credit card required.
            </p>
            <div className="pt-2">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Launch Automation Studio
                <Zap className="h-4 w-4 text-indigo-200 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="border-t border-zinc-900 bg-zinc-950 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <span className="font-display text-base font-black uppercase tracking-wider text-white">
                  VideoSaaS <span className="text-indigo-400">Studio</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                The leading enterprise-grade automation engine designed to turn raw storyboard descriptions and scripts into ready-to-publish short and horizontal content.
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">SaaS Platform</h5>
              <ul className="space-y-2 text-xs text-zinc-500 font-medium">
                <li><Link to="/studio" className="hover:text-white transition-colors">Studio App</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing Tiers</Link></li>
                <li><Link to="/videos" className="hover:text-white transition-colors">Video Gallery</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">Legal & Social</h5>
              <ul className="space-y-2 text-xs text-zinc-500 font-medium">
                <li><span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">YouTube Policy</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-900/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-zinc-600 font-medium font-mono">
              &copy; {new Date().getFullYear()} VideoSaaS Studio Inc. All rights reserved.
            </span>
            <div className="flex gap-4 text-xs text-zinc-600 font-medium">
              <span className="hover:text-zinc-400 cursor-pointer">Twitter</span>
              <span className="hover:text-zinc-400 cursor-pointer">Discord</span>
              <span className="hover:text-zinc-400 cursor-pointer">GitHub</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Video Modal Player Overlay */}
      <AnimatePresence>
        {showDemoModal && (
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
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDemoModal(false)}
                className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 border border-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="aspect-[16/9] bg-zinc-950/80 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <Video className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="font-display font-bold text-white text-base">PRE-PRODUCTION DEMO STREAM</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    This demonstrates our automated voice synthesis, subtitle pacing, and Ken Burns panning effects on stock assets.
                  </p>
                </div>
                <Link
                  to="/studio"
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors"
                >
                  Launch Studio & Try It Out
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
