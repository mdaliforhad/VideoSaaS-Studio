import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import StudioDashboard from "./pages/StudioDashboard";
import MultiModalStudio from "./pages/MultiModalStudio";
import VideoGallery from "./pages/VideoGallery";
import LiveStreamerPage from "./pages/LiveStreamerPage";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/studio" 
            element={
              <ProtectedRoute>
                <MultiModalStudio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/script-studio" 
            element={
              <ProtectedRoute>
                <StudioDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/videos" 
            element={
              <ProtectedRoute>
                <VideoGallery />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stream" 
            element={
              <ProtectedRoute>
                <LiveStreamerPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
