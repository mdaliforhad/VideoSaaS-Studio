import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Check, Sparkles, HelpCircle, ArrowRight, Zap, Info } from "lucide-react";
import Navbar from "../components/Navbar";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Starter",
      price: isAnnual ? 0 : 0,
      description: "Perfect for testing automation workflows and drafting storyboards.",
      features: [
        "Up to 3 AI script drafts / month",
        "Standard multi-language narration",
        "Standard stock search alignments",
        "HD preview canvas (16:9 or 9:16)",
        "Local script blueprint saving",
      ],
      cta: "Get Started Free",
      popular: false,
      glow: "border-zinc-800",
    },
    {
      name: "Content Creator",
      price: isAnnual ? 14 : 19,
      description: "Our most popular tier. Designed for daily active short-form publishers.",
      features: [
        "Unlimited AI script drafting",
        "Super-Shorts captions optimization",
        "Fast-paced automatic emoji injector",
        "Full access to natural TTS narration voices",
        "1-Click Direct YouTube publishing",
        "Priority stock media indexing pipelines",
        "Remove all rendering watermarks",
      ],
      cta: "Go Unlimited",
      popular: true,
      glow: "border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-zinc-900/60",
    },
    {
      name: "Agency Elite",
      price: isAnnual ? 39 : 49,
      description: "Engineered for marketing firms and volume content agencies.",
      features: [
        "Everything in Content Creator",
        "Multiple connected YouTube accounts",
        "Team collaboration (up to 5 seats)",
        "API access for batch automated rendering",
        "Dedicated account manager",
        "24/7 Priority priority customer support",
      ],
      cta: "Join Agency Elite",
      popular: false,
      glow: "border-zinc-800",
    },
  ];

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24 relative z-10">
        
        {/* Page Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Flexible Pricing for Modern Content Creators
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
            Choose Your Speed of <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Production</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            All plans include access to our Gemini automated storyboard editor. Save 20% on annual billing!
          </p>

          {/* Pricing Period Toggle */}
          <div className="flex items-center justify-center pt-4">
            <div className="relative flex items-center bg-zinc-900/90 border border-zinc-800 rounded-full p-1 text-xs">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-full font-bold transition-all ${
                  !isAnnual ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-1.5 ${
                  isAnnual ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Yearly
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border ${plan.glow} p-8 flex flex-col justify-between group transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest font-mono shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-black uppercase text-zinc-100">{plan.name}</h3>
                  <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed min-h-[40px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-5xl font-black text-white font-display">${plan.price}</span>
                  <span className="text-zinc-500 text-xs font-semibold">/ {isAnnual ? "mo billed annually" : "month"}</span>
                </div>

                <div className="border-t border-zinc-800/80 pt-6">
                  <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-4 font-mono">Features included:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-xs text-zinc-400">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-zinc-900">
                {plan.name === "Starter" ? (
                  <Link
                    to="/studio"
                    className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 text-center text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.name)}
                    className={`w-full py-3 px-4 rounded-xl text-center text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer ${
                      plan.popular
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                        : "bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200"
                    }`}
                  >
                    {plan.cta}
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Preview Banner */}
        <div className="mt-24 text-center max-w-xl mx-auto space-y-4">
          <HelpCircle className="h-8 w-8 text-indigo-400 mx-auto animate-pulse" />
          <h4 className="font-display font-bold text-white text-lg">HAVE QUESTIONS ABOUT PLANS?</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All user video data, scripts, and stock media links are stored locally and are fully exportable at any time. There are no hidden setup fees.
          </p>
        </div>
      </div>

      {/* Subscription Success Modal Pop-up */}
      <AnimatePresence>
        {selectedPlan && (
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
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-white text-base">Plan Upgraded Successfully!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are now fully subscribed to the <strong className="text-indigo-400">{selectedPlan}</strong> plan. All rendering limits, watermark restrictions, and direct publishing channels are instantly unlocked.
                </p>
              </div>

              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800/60 text-[11px] font-mono text-zinc-500 leading-relaxed text-left flex gap-2">
                <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>We've simulated this upgrade perfectly in your preview sandbox. No live payment was charged. You have full enterprise access!</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg transition-colors cursor-pointer"
                >
                  Continue to Studio Workspace
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
