import React, { useState } from "react";
import { motion } from "framer-motion";
import { Landmark, ScrollText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/museum.jpg";
import MuseumMap from "../map/MuseumMap"; // ✅ ADD THIS
import { useTheme } from "../context/ThemeContext";

export default function Home() {
  const [showMap, setShowMap] = useState(false); // ✅ ADD THIS
  const { theme } = useTheme();

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center text-white"
      style={{
        backgroundImage: "url(" + heroImage + ")", // ✅ safer version
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <div className={`min-h-screen backdrop-blur-sm flex flex-col transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-950/75" : "bg-black/45"
      }`}>

        {/* NAVBAR */}
        <nav className="flex items-center justify-between px-10 py-5">
          <h1 className="text-2xl font-bold tracking-wide">
            🏛️ Heritage Museum
          </h1>

          <div className="space-x-6 font-medium">
            <Link to="/login" className="hover:text-amber-300 transition">
              Login
            </Link>
            <Link to="/signup" className="hover:text-amber-300 transition">
              Sign Up
            </Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold drop-shadow-xl"
          >
            Journey Through Time & Civilization
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mt-4 text-lg md:text-xl max-w-xl text-white/80"
          >
            Explore centuries of history through rare artifacts, ancient
            manuscripts, cultural heritage, and stories that shaped humanity.
          </motion.p>

          <Link
            to="/login"
            className="mt-8 bg-amber-600 hover:bg-amber-800 px-8 py-3 rounded-lg text-xl shadow-lg transition"
          >
            Begin Your Visit →
          </Link>

          {/* ✅ ADD THIS BUTTON */}
          <button
            onClick={() => setShowMap(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-800 px-8 py-3 rounded-lg text-xl shadow-lg transition"
          >
            Explore Museum Map 🗺
          </button>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className={`py-16 px-6 md:px-16 transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-955 text-slate-100" : "bg-black/80 text-white"
      }`}>
        <h2 className="text-center text-4xl font-bold mb-12">
          Museum Highlights
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          <motion.div className={`p-6 rounded-2xl shadow-lg border transition-colors duration-200 ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white/10 border-white/20"
          }`}>
            <Landmark className="w-12 h-12 text-amber-400 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Historical Artifacts</h3>
            <p className={`${theme === "dark" ? "text-slate-350" : "text-white/80"}`}>
              Discover ancient tools, sculptures, coins, weapons, and relics.
            </p>
          </motion.div>

          <motion.div className={`p-6 rounded-2xl shadow-lg border transition-colors duration-200 ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white/10 border-white/20"
          }`}>
            <ScrollText className="w-12 h-12 text-emerald-400 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Manuscripts & Records</h3>
            <p className={`${theme === "dark" ? "text-slate-355" : "text-white/80"}`}>
              Explore preserved manuscripts and historical documents.
            </p>
          </motion.div>

          <motion.div className={`p-6 rounded-2xl shadow-lg border transition-colors duration-200 ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white/10 border-white/20"
          }`}>
            <Users className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Guided Experiences</h3>
            <p className={`${theme === "dark" ? "text-slate-355" : "text-white/80"}`}>
              Learn through curated tours and interactive exhibits.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-800 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Meet the Virtual Museum Guide
        </h2>

        <Link
          to="/app"
          className="bg-white text-amber-700 font-semibold px-10 py-3 rounded-lg shadow-lg"
        >
          Talk to the Guide 📜
        </Link>
      </div>

      {/* ✅ MAP OVERLAY */}
      {showMap && (
        <div className="fixed inset-0 bg-black z-50 overflow-auto">
          <button
            onClick={() => setShowMap(false)}
            className="absolute top-5 right-5 text-white text-2xl z-50"
          >
            ✖
          </button>

          <MuseumMap onClose={() => setShowMap(false)} />
        </div>
      )}
    </div>
  );
}