import React, { useEffect, useRef, useState } from "react";

export default function ChatInput({ input, setInput, onSend }) {
  const [isListening, setIsListening] = useState(false);

  const timerRef = useRef(null);

  // ⏱️ AUTO SEND AFTER 5s SILENCE
  const resetAutoSendTimer = (value) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const msg = value?.trim();

      if (msg) {
        onSend(msg);
        setInput("");
      }
    }, 5000);
  };

  // 🧠 whenever input changes → restart timer
  useEffect(() => {
    if (input?.trim()) {
      resetAutoSendTimer(input);
    }

    return () => clearTimeout(timerRef.current);
  }, [input]);

  // 📤 manual send
  const sendMessage = () => {
    const msg = input.trim();
    if (!msg) return;

    clearTimeout(timerRef.current);
    onSend(msg);
    setInput("");
  };

  // 🎤 voice input
  const handleVoice = () => {
    if (isListening) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice not supported");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    setIsListening(true);

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;

      if (text?.trim()) {
        setInput(text); // 🔥 same as typing
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="px-4 py-4 bg-white/30 border-t border-white/20">
      <div className="flex gap-3 max-w-3xl mx-auto">

        {/* 🎤 Mic */}
        <button
          onClick={handleVoice}
          disabled={isListening}
          className={`p-3 rounded-full shadow-sm hover:shadow transition duration-200 cursor-pointer ${
            isListening ? "bg-red-500 text-white animate-pulse" : "bg-white/50 hover:bg-white/70 border border-white/30"
          }`}
          title="Speak"
        >
          🎤
        </button>

        {/* 📝 Input */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder={isListening ? "Listening..." : "Type or speak..."}
          className="flex-1 px-5 py-3 bg-white/40 border border-white/30 rounded-full focus:ring-2 focus:ring-emerald-400 focus:outline-none placeholder-slate-500 text-slate-800 shadow-inner"
        />

        {/* 📤 Send */}
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-white/30 disabled:text-slate-400 text-white font-semibold rounded-full shadow-md transition duration-200 cursor-pointer disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}