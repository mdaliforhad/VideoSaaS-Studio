/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  Sparkles,
  Check,
  Search,
  BookOpen,
  Subtitles,
  Key,
  GripVertical
} from "lucide-react";
import { VideoScript, VideoScene } from "../types";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function stripSSML(text: string): string {
  if (!text) return "";
  return text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
}

interface SceneEditorProps {
  script: VideoScript | null;
  setScript: React.Dispatch<React.SetStateAction<VideoScript | null>>;
  activeSceneIndex: number;
  setActiveSceneIndex: (idx: number) => void;
  onRefreshMedia: (idx: number) => void;
  pexelsApiKey: string;
}

// Sortable Scene Card Component
function SortableSceneCard({ 
  idx, 
  scene, 
  isActive, 
  density, 
  setActiveSceneIndex, 
  handleDeleteScene, 
  onRefreshMedia, 
  updateSceneField, 
  handleRegenerateScene, 
  isRegeneratingScene, 
  regenPopupIndex, 
  setRegenPopupIndex, 
  regenInstructions, 
  setRegenInstructions 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: scene.scene_number });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-xl transition-all duration-200 relative group/card ${
        isActive
          ? "bg-slate-900/60 border-indigo-500/80 shadow-md shadow-indigo-500/5"
          : "bg-slate-950/40 border-slate-800 hover:border-slate-700/60"
      }`}
    >
      {/* Card Title & Actions */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setActiveSceneIndex(idx)}
          className="flex items-center gap-2 text-left outline-none cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-slate-600 hover:text-slate-400" />
          <span className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
            isActive ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500"
          }`}>
            {idx + 1}
          </span>
          <span className="text-xs font-semibold text-slate-300 font-display">
            Scene Script
          </span>
        </button>

        <div className="flex items-center gap-1">
          {/* AI Refine scene trigger button */}
          <div className="relative">
            <button
              onClick={() => setRegenPopupIndex(regenPopupIndex === idx ? null : idx)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400/90 hover:text-indigo-300 transition-colors"
              title="Adjust with AI instructions"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {/* AI Rewrite mini dropdown popup */}
            {regenPopupIndex === idx && (
              <div className="absolute right-0 mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-xl w-64 z-20 space-y-2">
                <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">
                  AI Scene Editor
                </div>
                <input
                  type="text"
                  placeholder="E.g., Make it more dramatic/shorter..."
                  value={regenInstructions}
                  onChange={(e) => setRegenInstructions(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-indigo-500 outline-none"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleRegenerateScene(idx)}
                    disabled={isRegeneratingScene === idx}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1 px-2 rounded-md font-medium transition-colors"
                  >
                    {isRegeneratingScene === idx ? "Rewriting..." : "Adjust Scene"}
                  </button>
                  <button
                    onClick={() => {
                      setRegenPopupIndex(null);
                      setRegenInstructions("");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] py-1 px-2 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual search refresh */}
          <button
            onClick={() => onRefreshMedia(idx)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh video media search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteScene(idx)}
            disabled={true /* temporarily disable delete to simplify */}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
            title="Delete Scene"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="space-y-3">
        {/* Voiceover Text Field */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <BookOpen className="w-3 h-3 text-slate-500" />
            <span>Voiceover / Narration Text</span>
          </div>
          <textarea
            rows={2}
            placeholder="Enter narrational monologue here..."
            value={stripSSML(scene.voiceover_text)}
            onChange={(e) => updateSceneField(idx, "voiceover_text", stripSSML(e.target.value))}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs leading-relaxed text-slate-200 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Subtitle Text Field */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1">
                <Subtitles className="w-3 h-3 text-slate-500" />
                <span>Captions Text</span>
              </div>
            </div>
            <input
              type="text"
              value={scene.subtitle}
              onChange={(e) => updateSceneField(idx, "subtitle", e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-200 focus:border-indigo-500 outline-none transition-all"
            />
            {density && (
              <div className={`flex items-center gap-1 mt-1 text-[9px] px-1.5 py-0.5 rounded-md ${density.color}`}>
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>{density.msg}</span>
              </div>
            )}
          </div>

          {/* Stock Search Keywords Field */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <Key className="w-3 h-3 text-slate-500" />
              <span>Stock Search Terms (English)</span>
            </div>
            <input
              type="text"
              value={scene.search_keywords}
              onChange={(e) => updateSceneField(idx, "search_keywords", e.target.value)}
              onBlur={() => onRefreshMedia(idx)} // Auto query refresh when search term focus lost
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-300 font-mono focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tiny Visual Thumb indicator at active state */}
      {isActive && (
        <div className="absolute top-1/2 -left-[1px] transform -translate-y-1/2 w-[3px] h-8 bg-indigo-500 rounded-r-md" />
      )}
    </div>
  );
}

export default function SceneEditor({
  script,
  setScript,
  activeSceneIndex,
  setActiveSceneIndex,
  onRefreshMedia,
  pexelsApiKey,
}: SceneEditorProps) {
  const [regenInstructions, setRegenInstructions] = useState("");
  const [isRegeneratingScene, setIsRegeneratingScene] = useState<number | null>(null);
  const [regenPopupIndex, setRegenPopupIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!script) return null;

  // Update specific scene field
  const updateSceneField = (idx: number, field: keyof VideoScene, value: any) => {
    setScript((prev) => {
      if (!prev) return null;
      const updatedScenes = [...prev.scenes];
      updatedScenes[idx] = {
        ...updatedScenes[idx],
        [field]: value,
      };
      return {
        ...prev,
        scenes: updatedScenes,
      };
    });
  };

  // Add a new scene
  const handleAddScene = () => {
    setScript((prev) => {
      if (!prev) return null;
      const nextNum = prev.scenes.length + 1;
      const newScene: VideoScene = {
        scene_number: nextNum,
        voiceover_text: "Write your voiceover script here.",
        subtitle: "On-screen subtitle",
        search_keywords: "scenic backdrop, atmospheric",
      };
      return {
        ...prev,
        scenes: [...prev.scenes, newScene],
      };
    });
    // Jump to the newly added scene
    setTimeout(() => setActiveSceneIndex(script.scenes.length), 50);
  };

  // Delete scene
  const handleDeleteScene = (idx: number) => {
    if (script.scenes.length <= 1) return; // Keep at least 1 scene
    setScript((prev) => {
      if (!prev) return null;
      const filtered = prev.scenes.filter((_, i) => i !== idx);
      // Remap scene numbers
      const remapped = filtered.map((scene, i) => ({
        ...scene,
        scene_number: i + 1,
      }));
      return {
        ...prev,
        scenes: remapped,
      };
    });
    if (activeSceneIndex >= script.scenes.length - 1) {
      setActiveSceneIndex(Math.max(0, script.scenes.length - 2));
    }
  };

  // Trigger server-side scene regeneration via Gemini
  const handleRegenerateScene = async (idx: number) => {
    setIsRegeneratingScene(idx);
    try {
      const response = await fetch("/api/regenerate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: script.video_title,
          sceneNumber: idx + 1,
          currentScene: script.scenes[idx],
          instructions: regenInstructions,
          tone: script.tone || "informative",
          language: script.language || "English",
          aspectRatio: script.aspectRatio || "16:9",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate scene content");
      }

      const freshScene = (await response.json()) as VideoScene;
      
      setScript((prev) => {
        if (!prev) return null;
        const updated = [...prev.scenes];
        updated[idx] = {
          ...updated[idx],
          voiceover_text: freshScene.voiceover_text,
          subtitle: freshScene.subtitle,
          search_keywords: freshScene.search_keywords,
        };
        return { ...prev, scenes: updated };
      });

      // Clear instructions state
      setRegenInstructions("");
      setRegenPopupIndex(null);
      
      // Auto-trigger video/image query refresh for the newly regenerated keywords
      setTimeout(() => onRefreshMedia(idx), 50);

    } catch (err) {
      console.error(err);
      alert("Could not adjust the scene right now. Please try again.");
    } finally {
      setIsRegeneratingScene(null);
    }
  };

  // Check subtitles length guidelines
  const getSubtitlesDensity = (text: string) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 7) {
      return { status: "high", color: "text-rose-400 bg-rose-500/10", msg: "Too long for shorts (7+ words)" };
    }
    if (wordCount > 5) {
      return { status: "moderate", color: "text-amber-400 bg-amber-500/10", msg: "Moderately dense (6+ words)" };
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setScript((prev) => {
        if (!prev) return null;
        const oldIndex = prev.scenes.findIndex(s => s.scene_number === active.id);
        const newIndex = prev.scenes.findIndex(s => s.scene_number === over.id);
        const updatedScenes = arrayMove(prev.scenes, oldIndex, newIndex);
        
        // Remap scene numbers
        const remapped = updatedScenes.map((scene, i) => ({
          ...(scene as VideoScene),
          scene_number: i + 1,
        }));
        
        // Adjust active index
        const activeScene = prev.scenes[activeSceneIndex];
        const newActiveIndex = remapped.findIndex(s => s.scene_number === activeScene.scene_number);
        setActiveSceneIndex(newActiveIndex);

        return { ...prev, scenes: remapped };
      });
    }
  };

  return (
    <div className="space-y-4 text-slate-200 select-none font-sans">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
          Storyboard Timeline
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-medium">
            {script.scenes.length} Scenes
          </span>
        </h2>
        <button
          onClick={handleAddScene}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-indigo-400 rounded-lg text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Scene
        </button>
      </div>

      {/* Storyboard Cards */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={script.scenes.map(s => s.scene_number)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {script.scenes.map((scene, idx) => (
              <SortableSceneCard
                key={scene.scene_number}
                idx={idx}
                scene={scene}
                isActive={idx === activeSceneIndex}
                density={getSubtitlesDensity(scene.subtitle)}
                setActiveSceneIndex={setActiveSceneIndex}
                handleDeleteScene={handleDeleteScene}
                onRefreshMedia={onRefreshMedia}
                updateSceneField={updateSceneField}
                handleRegenerateScene={handleRegenerateScene}
                isRegeneratingScene={isRegeneratingScene}
                regenPopupIndex={regenPopupIndex}
                setRegenPopupIndex={setRegenPopupIndex}
                regenInstructions={regenInstructions}
                setRegenInstructions={setRegenInstructions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
