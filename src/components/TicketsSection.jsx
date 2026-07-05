import React, { useEffect, useState } from "react";
import { getMyTickets } from "../services/bookingService";

export default function TicketsSection({ userId }) {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    async function fetchTickets() {
      const data = await getMyTickets(userId);
      setTickets(data);
    }
    if (userId) fetchTickets();
  }, [userId]);

  if (!tickets.length) return <p className="text-slate-500 text-sm">No tickets booked yet.</p>;

  return (
    <div className="w-full bg-transparent p-0">
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-white/20 pb-2">🎟️ My Tickets</h2>
      <div className="space-y-3">
        {tickets.map(ticket => (
          <div key={ticket.id} className="border border-white/30 bg-white/40 p-3 rounded-xl shadow-sm hover:shadow transition-shadow flex flex-col gap-1 text-xs text-slate-700">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight">{ticket.showName}</h3>
            <p><span className="font-semibold text-slate-500">Date:</span> {ticket.day}</p>
            <p><span className="font-semibold text-slate-500">Time:</span> {ticket.time}</p>
            <p><span className="font-semibold text-slate-500">Quantity:</span> {ticket.quantity}</p>
            <p><span className="font-semibold text-slate-500">Booking ID:</span> {ticket.bookingCode}</p>
            {ticket.pdfUrl && (
              <a 
                href={ticket.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition duration-200 w-fit cursor-pointer"
              >
                🎟 Download Ticket PDF
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
