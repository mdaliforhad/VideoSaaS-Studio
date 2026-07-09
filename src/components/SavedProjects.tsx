/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Folder, 
  Trash2, 
  Calendar, 
  FileText, 
  X,
  Clapperboard,
  ArrowRight
} from "lucide-react";
import { VideoScript } from "../types";

interface SavedProjectsProps {
  savedScripts: VideoScript[];
  onLoadScript: (script: VideoScript) => void;
  onDeleteScript: (id: string) => void;
  onClose: () => void;
}

export default function SavedProjects({
  savedScripts,
  onLoadScript,
  onDeleteScript,
  onClose,
}: SavedProjectsProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display font-bold text-sm text-slate-100 tracking-tight">
              Saved Video Blueprints
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedScripts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Folder className="w-10 h-10 mx-auto text-slate-700 stroke-1" />
              <p className="text-xs">No saved scripts yet.</p>
              <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-relaxed">
                Generate a script in the workspace and click the Save button to persist it locally.
              </p>
            </div>
          ) : (
            savedScripts.map((script) => (
              <div
                key={script.id}
                className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700/60 rounded-xl transition-all flex items-start justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <h3 className="font-display font-medium text-xs text-slate-200 truncate group-hover:text-white transition-colors">
                      {script.video_title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      {script.createdAt ? new Date(script.createdAt).toLocaleDateString() : "Just now"}
                    </span>
                    <span>•</span>
                    <span>🎬 {script.scenes.length} Scenes</span>
                    <span>•</span>
                    <span className="uppercase text-indigo-400 font-semibold">{script.language}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-center">
                  <button
                    onClick={() => onLoadScript(script)}
                    className="flex items-center gap-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                  >
                    Open
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => script.id && onDeleteScript(script.id)}
                    className="p-1.5 hover:bg-slate-800 text-slate-600 hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete Saved script"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/20 text-center text-[10px] text-slate-500">
          Projects are cached locally in your current web browser.
        </div>

      </div>
    </div>
  );
}
