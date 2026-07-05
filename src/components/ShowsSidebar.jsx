import React from "react";
import { formatTime } from "../utils/formatTime";

export default function ShowsSidebar({ shows, handleBook, setShows }) {
  return (
    <section className="w-full bg-transparent p-0"
             style={{ maxHeight: "100%" }}>
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-white/20 pb-2">🎭 Available Shows</h2>
      {shows.length === 0 ? (
        <p className="text-slate-500 text-sm">Loading shows...</p>
      ) : (
        <ul className="space-y-3">
          {shows.map((show) => (
            <li
              key={show.id}
              className="border border-white/30 bg-white/40 p-3 rounded-xl shadow-sm hover:shadow transition flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 text-sm md:text-base leading-tight">{show.name}</h3>
                <span className="text-xs text-slate-500 font-semibold">{show.day_of_week}</span>
              </div>

              <div className="flex justify-between text-xs md:text-sm text-slate-700">
                <span>🕒 {formatTime(show.start_time)}</span>
                <span>🎟 {show.available_tickets} left</span>
                <span>💰 ₹{show.price}</span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <input
                  type="number"
                  min="1"
                  max={show.available_tickets}
                  defaultValue="1"
                  className="w-12 md:w-16 bg-white/40 border border-white/30 rounded-lg px-2 py-1 text-center text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
                  onChange={(e) =>
                    setShows((prev) =>
                      prev.map((s) =>
                        s.id === show.id
                          ? { ...s, selectedTickets: parseInt(e.target.value) }
                          : s
                      )
                    )
                  }
                />
                <button
                  onClick={() => handleBook(show.id, show.name, show.selectedTickets || 1)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs md:text-sm shadow transition duration-200 cursor-pointer"
                >
                  Book
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
