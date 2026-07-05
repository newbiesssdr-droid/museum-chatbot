import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase"; // <- uses your existing auth export
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";

export default function Header({ onNewChat, onLogout }) {
  const [open, setOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Subscribe to Firebase auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return () => unsub();
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const onKeyToggle = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((s) => !s);
    }
  };

  const displayName = firebaseUser?.displayName || firebaseUser?.email || "Guest";
  const email = firebaseUser?.email || "guest@museum.example";
  const photoURL = firebaseUser?.photoURL || null;

  return (
    <header className={`w-full sticky top-0 z-40 shadow-sm border-b transition-colors duration-200 ${
      theme === "dark" ? "bg-slate-900/70 backdrop-blur-md border-white/10" : "bg-white/40 backdrop-blur-md border-white/20"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 focus:outline-none cursor-pointer"
              aria-label="Go to homepage"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 3v4M16 3v4" />
                </svg>
              </div>
              <div className={`hidden sm:block text-left ${theme === "dark" ? "text-slate-205" : "text-slate-800"}`}>
                <div className="text-sm font-semibold">City Museum</div>
                <div className={`text-xs -mt-0.5 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>Ticketing & Chat</div>
              </div>
            </button>
          </div>

          {/* Center nav (optional) */}
          <nav className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate("/app")} 
              className={`text-sm px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                theme === "dark" ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-700 hover:text-slate-900 hover:bg-white/30"
              }`}
            >
              Shows
            </button>
            <button 
              onClick={() => navigate("/chatbot")} 
              className={`text-sm px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                theme === "dark" ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-700 hover:text-slate-900 hover:bg-white/30"
              }`}
            >
              Chatbot
            </button>
            <button 
              onClick={() => navigate("/signup")} 
              className={`text-sm px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                theme === "dark" ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-700 hover:text-slate-900 hover:bg-white/30"
              }`}
            >
              Membership
            </button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {firebaseUser?.email === "newbies.ssdr@gmail.com" && (
              <button
                onClick={() => navigate("/admin")}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition duration-200 cursor-pointer"
              >
                🛠️ Admin Mode
              </button>
            )}

            <button
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center p-2 rounded-xl border shadow-sm transition duration-200 cursor-pointer text-sm ${
                theme === "dark"
                  ? "bg-slate-800/60 hover:bg-slate-700/60 border-white/10 text-amber-400"
                  : "bg-white/50 hover:bg-white/75 border border-white/30 text-slate-750"
              }`}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>

            <button
              onClick={onNewChat}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-sm shadow-sm transition duration-200 cursor-pointer ${
                theme === "dark" ? "bg-slate-800/60 hover:bg-slate-700/60 border-white/10 text-slate-205" : "bg-white/50 hover:bg-white/75 border border-white/30 text-slate-700"
              }`}
            >
              <span className="text-lg">💬</span>
              <span className="font-semibold">New Chat</span>
            </button>

            <div className="relative">
              <button
                ref={btnRef}
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((s) => !s)}
                onKeyDown={onKeyToggle}
                className={`flex items-center gap-2 border px-2.5 py-1.5 rounded-full shadow-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none transition duration-200 cursor-pointer ${
                  theme === "dark" ? "bg-slate-800/60 hover:bg-slate-700/60 border-white/10 text-slate-205" : "bg-white/50 hover:bg-white/75 border border-white/30 text-slate-700"
                }`}
                title="Account menu"
              >
                {photoURL ? (
                  <img src={photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-sm">
                    {displayName[0]?.toUpperCase() ?? "G"}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className={`text-xs font-semibold leading-tight ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{displayName}</span>
                  <span className={`text-[10px] ${theme === "dark" ? "text-slate-450" : "text-slate-500"}`}>Account</span>
                </div>
                <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none">
                  <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                ref={menuRef}
                role="menu"
                aria-hidden={!open}
                className={`origin-top-right absolute right-0 mt-3 w-56 rounded-2xl shadow-xl border z-50 transform transition-all duration-150 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800 backdrop-blur-md" : "bg-white/80 border-white/35 backdrop-blur-md"
                } ${
                  open ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-1 scale-95 pointer-events-none"
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {photoURL ? (
                      <img src={photoURL} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold">
                        {displayName[0]?.toUpperCase() ?? "G"}
                      </div>
                    )}
                    <div>
                      <div className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{displayName}</div>
                      <div className={`text-[11px] ${theme === "dark" ? "text-slate-450" : "text-slate-500"}`}>{email}</div>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-white/20 pt-2">
                    <button onClick={() => { setOpen(false); navigate("/"); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition duration-155 cursor-pointer ${
                      theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-white/50"
                    }`}>🏠 Home</button>
                    <button onClick={() => { setOpen(false); navigate("/app"); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition duration-155 cursor-pointer ${
                      theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-white/50"
                    }`}>🎟️ My Tickets</button>
                    <button onClick={() => { setOpen(false); navigate("/profile"); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition duration-155 cursor-pointer ${
                      theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-white/50"
                    }`}>⚙️ Settings</button>
                    <div className="my-2 border-t border-white/20" />
                    <button onClick={() => { setOpen(false); onLogout?.(); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition duration-155 cursor-pointer ${
                      theme === "dark" ? "text-red-400 hover:bg-red-950/20" : "text-red-650 hover:bg-red-50"
                    }`}>🚪 Logout</button>
                  </div>

                  <div className={`mt-3 text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>Signed in: <span className={`font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-655"}`}>{firebaseUser ? "Yes" : "No"}</span></div>
                </div>
              </div>
            </div>
          </div> {/* Right end */}
        </div>
      </div>
    </header>
  );
}
