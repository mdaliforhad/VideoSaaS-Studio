import React, { useState, useEffect } from "react";
import { Plug, Cloud, Youtube, HardDrive, FileText, Music, Check, X, RefreshCw } from "lucide-react";
import SaaSSidebar from "../components/SaaSSidebar";
import { useAuth } from "../components/AuthProvider";

export default function Connections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchConnections = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/connections", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        setConnections(data);
      } catch (err) {
        console.error("Error fetching connections:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [user]);

  const handleConnect = async () => {
    try {
      const response = await fetch(`/api/auth/google?userId=${user?.uid}`);
      const { url } = await response.json();
      const authWindow = window.open(url, "oauth_popup", "width=600,height=700");
      
      const handleMessage = async (event: MessageEvent) => {
        const isSuccess = event.data === "SUCCESS" || event.data?.type === "OAUTH_AUTH_SUCCESS";
        const isFailure = event.data === "FAILURE" || event.data?.type === "OAUTH_AUTH_FAILURE";

        if (isSuccess) {
          window.removeEventListener("message", handleMessage);
          
          // Instantly fetch updated connection status
          if (user) {
            try {
              setLoading(true);
              const token = await user.getIdToken();
              const res = await fetch("/api/connections", {
                headers: { "Authorization": `Bearer ${token}` }
              });
              const data = await res.json();
              setConnections(data);
            } catch (err) {
              console.error("Error re-fetching connections:", err);
            } finally {
              setLoading(false);
            }
          }
        } else if (isFailure) {
          window.removeEventListener("message", handleMessage);
          const errorMsg = event.data?.error || "Unknown authentication error";
          console.error("OAuth authentication failed:", errorMsg);
        }
      };
      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("OAuth error:", error);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/connections/" + platform, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setConnections(prev => ({ ...prev, [platform]: false }));
    } catch (err) {
      console.error("Error disconnecting platform:", err);
    }
  };

  const platforms = [
    { id: "google_drive", name: "Google Drive", icon: Cloud, type: "primary" },
    { id: "youtube", name: "YouTube API", icon: Youtube, type: "primary" },
    { id: "dropbox", name: "Dropbox", icon: HardDrive, type: "placeholder" },
    { id: "onedrive", name: "OneDrive", icon: FileText, type: "placeholder" },
    { id: "tiktok", name: "TikTok", icon: Music, type: "placeholder" },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <SaaSSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Plug className="text-indigo-400" />
            Connections
          </h1>
          <p className="text-zinc-400 mt-2">Manage your third-party platform integrations.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map(platform => (
            <div key={platform.id} className={`p-6 rounded-2xl border ${platform.type === "placeholder" ? "bg-zinc-900/30 border-zinc-800 opacity-70" : "bg-zinc-900/50 border-zinc-800"}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${connections[platform.id] ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                  <platform.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">{platform.name}</h3>
              </div>
              
              {platform.type === "placeholder" ? (
                <div className="text-sm text-zinc-500 italic">Coming Soon</div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${connections[platform.id] ? "text-emerald-400" : "text-zinc-400"}`}>
                    {connections[platform.id] ? "Connected" : "Not Connected"}
                  </span>
                  <button 
                    onClick={() => connections[platform.id] ? handleDisconnect(platform.id) : handleConnect()}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${connections[platform.id] ? "bg-rose-600/10 text-rose-400 hover:bg-rose-600/20" : "bg-indigo-600 hover:bg-indigo-700"}`}
                  >
                    {connections[platform.id] ? "Disconnect" : "Connect"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
