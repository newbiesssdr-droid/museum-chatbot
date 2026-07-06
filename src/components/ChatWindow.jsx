// src/components/ChatWindow.jsx
import React, { useRef, useEffect, useState } from "react";

// Helpers to check and parse booking status messages for custom UI rendering
const isBookingStatusMessage = (text) => {
  if (!text) return false;
  return text.includes("🎫 Booking ID:") &&
         text.includes("🗓️ Visit Schedule:") &&
         text.includes("💳 Payment Status:") &&
         text.includes("⏳ Booking Status:");
};

const parseBookingStatusMessage = (text) => {
  if (!text) return null;
  const idMatch = text.match(/🎫\s*Booking ID:\s*([^\n\r]+)/i);
  const scheduleMatch = text.match(/🗓️\s*Visit Schedule:\s*([^\n\r]+)/i);
  const paymentMatch = text.match(/💳\s*Payment Status:\s*([^\n\r]+)/i);
  const bookingStatusMatch = text.match(/⏳\s*Booking Status:\s*([^\n\r]+)/i);

  if (!idMatch || !scheduleMatch || !paymentMatch || !bookingStatusMatch) {
    return null;
  }

  return {
    bookingId: idMatch[1].trim(),
    visitSchedule: scheduleMatch[1].trim(),
    paymentStatus: paymentMatch[1].trim(),
    bookingStatus: bookingStatusMatch[1].trim(),
  };
};

const getBadgeStyle = (status) => {
  const s = status.toLowerCase();
  if (s.includes("confirmed") || s === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-250/60";
  }
  if (s.includes("pending") || s.includes("waiting")) {
    return "bg-amber-50 text-amber-700 border-amber-250/60";
  }
  if (s.includes("cancelled") || s.includes("failed")) {
    return "bg-rose-50 text-rose-700 border-rose-250/60";
  }
  if (s.includes("refunded")) {
    return "bg-blue-50 text-blue-700 border-blue-250/60";
  }
  return "bg-slate-50 text-slate-700 border-slate-200/60";
};

const getStatusLabel = (status) => {
  if (status.toLowerCase().includes("confirmed")) return `✓ Confirmed`;
  if (status.toLowerCase().includes("failed") || status.toLowerCase().includes("cancelled")) return `✕ ${status}`;
  return status;
};


/**
 * Props:
 *  - messages: [{ sender: 'user'|'bot', text: string, timestamp?: number, options?: [{id, name, day, time, price, available_tickets}] }])
 *  - isTyping: boolean
 *  - handleBook: function(showId, showName, quantity)
 *  - handleCancel: function(ticketId, showName)
 */
export default function ChatWindow({
  messages = [],
  isTyping = false,
  handleBook,
  handleCancel,
  handleOpenPayment,
  processingTicketId,
  paymentProcessingState,
  myTickets = [],
}) {
  const chatEndRef = useRef(null);
  const [ticketSelections, setTicketSelections] = useState({}); // { msgIndex: { [showId]: quantity } }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, isTyping]);

  // Toggle selection for booking
  const toggleSelect = (msgIndex, show) => {
    setTicketSelections((prev) => {
      const prevForMsg = { ...(prev[msgIndex] || {}) };
      if (prevForMsg[show.id]) delete prevForMsg[show.id];
      else prevForMsg[show.id] = Math.min(1, show.available_tickets || 1);
      return { ...prev, [msgIndex]: prevForMsg };
    });
  };

  const setQuantity = (msgIndex, showId, qty, max) => {
    if (qty < 1) qty = 1;
    if (max && qty > max) qty = max;
    setTicketSelections((prev) => ({
      ...prev,
      [msgIndex]: { ...(prev[msgIndex] || {}), [showId]: qty },
    }));
  };

  const increment = (msgIndex, showId, max) => {
    setTicketSelections((prev) => {
      const curr = (prev[msgIndex] && prev[msgIndex][showId]) || 0;
      const next = Math.min(max || curr + 1, curr + 1 || 1);
      return { ...prev, [msgIndex]: { ...(prev[msgIndex] || {}), [showId]: next } };
    });
  };

  const decrement = (msgIndex, showId) => {
    setTicketSelections((prev) => {
      const curr = (prev[msgIndex] && prev[msgIndex][showId]) || 1;
      return { ...prev, [msgIndex]: { ...(prev[msgIndex] || {}), [showId]: Math.max(1, curr - 1) } };
    });
  };

  const handleConfirm = (msgIndex, options = []) => {
    const selections = ticketSelections[msgIndex] || {};
    const selectedIds = Object.keys(selections);
    if (selectedIds.length === 0) {
      alert("Please select at least one show before confirming.");
      return;
    }

    selectedIds.forEach((showId) => {
      const show = options.find((o) => String(o.id) === String(showId));
      const quantity = selections[showId] || 1;
      if (show && handleBook) handleBook(show.id, show.name, quantity);
    });

    setTicketSelections((prev) => {
      const next = { ...prev };
      delete next[msgIndex];
      return next;
    });
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Helper to parse success info from message text dynamically
  const getSuccessInfo = (text) => {
    if (!text) return null;
    const isSuccess = text.includes("Payment successful!") && text.includes("awaiting administrator approval");
    if (!isSuccess) return null;

    const idMatch = text.match(/Booking ID:\s*([^\n\r]+)/i);
    const showMatch = text.match(/Show:\s*([^\n\r]+)/i);

    return {
      bookingCode: idMatch ? idMatch[1].trim() : "N/A",
      showName: showMatch ? showMatch[1].trim() : "Museum Gallery",
    };
  };

  return (
    <section className="flex-1 bg-transparent flex flex-col h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/20 bg-white/30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md text-sm">🏛️</div>
          <div>
            <div className="text-sm font-semibold text-slate-800 leading-tight">Museum Assistant</div>
            <div className="text-[11px] text-slate-500 font-medium">Here to help — ask about shows, bookings & more</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-transparent">
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          return (
            <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`} aria-live="polite">
              <div className={`max-w-[82%] flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 items-end`}>
                {/* Avatar */}
                {!isUser ? (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-semibold shadow shadow-emerald-250">🤖</div>
                ) : (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/50 border border-white/40 text-emerald-700 flex items-center justify-center font-bold shadow-sm">U</div>
                )}

                {/* Bubble */}
                <div className={`p-3 rounded-2xl shadow-sm break-words ${isUser ? "bg-emerald-600/80 backdrop-blur-sm text-white rounded-br-none border border-emerald-500/25" : "bg-white/70 backdrop-blur-sm text-slate-800 rounded-bl-none border border-white/40"}`} style={{ animation: "fadeIn .14s ease-out" }}>
                  
                  {(() => {
                    const successInfo = !isUser && getSuccessInfo(msg.text);
                    if (successInfo) {
                      // Find matching ticket by bookingCode
                      const ticket = myTickets.find((t) => t.bookingCode === successInfo.bookingCode);

                      // Define states explicitly
                      const isApproved = ticket?.status === "confirmed" && ticket?.paymentStatus === "Approved";
                      const isDeclined = ticket?.status === "cancelled" && ticket?.paymentStatus === "Refunded";
                      const isFailed = ticket?.status === "failed";
                      
                      // Otherwise, it's either pending, OR undefined (falling back to pending safely)
                      const isPending = !isApproved && !isDeclined && !isFailed;

                      return (
                        <div className="flex flex-col gap-3 p-1 max-w-sm text-left">
                          {/* Status header */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                              <span>✓</span>
                              <span>Payment Completed</span>
                            </div>
                            
                            {isPending && (
                              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                                <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                                <span>Waiting for Admin Approval</span>
                              </div>
                            )}

                            {isApproved && (
                              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                                <span>✓</span>
                                <span>Booking Approved & Confirmed</span>
                              </div>
                            )}

                            {isDeclined && (
                              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                                <span>✕</span>
                                <span>Booking Declined by Admin</span>
                              </div>
                            )}

                            {isFailed && (
                              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                                <span>✕</span>
                                <span>Payment Failed</span>
                              </div>
                            )}
                          </div>

                          {/* Main Message */}
                          <div className="text-xs text-slate-600 border-t border-white/20 pt-2 space-y-1">
                            {isPending && (
                              <>
                                <p>Your payment has been completed successfully.</p>
                                <p>The administrator is reviewing your booking.</p>
                              </>
                            )}
                            {isApproved && (
                              <p>Your booking has been approved. Your ticket is ready.</p>
                            )}
                            {isDeclined && (
                              <p>Your booking was declined by the administrator. The payment refund will be processed according to the existing refund flow.</p>
                            )}
                            {isFailed && (
                              <p>Your payment transaction failed. Please check with your bank or try booking again.</p>
                            )}
                          </div>

                          {/* Booking details card */}
                          <div className="bg-white/40 border border-white/30 rounded-xl p-2.5 text-xs text-slate-750 shadow-sm space-y-1">
                            <p><span className="font-semibold text-slate-500">Booking ID:</span> {successInfo.bookingCode}</p>
                            <p><span className="font-semibold text-slate-500">Show:</span> {successInfo.showName}</p>
                          </div>

                          {/* Action / Download for Approved */}
                          {isApproved && ticket?.pdfUrl && (
                            <a
                              href={ticket.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-center text-xs shadow transition duration-200 inline-block mt-1 cursor-pointer"
                            >
                              🎟 Download Ticket PDF
                            </a>
                          )}

                          {/* Info Note */}
                          <div className="text-[10px] text-slate-500 border-t border-white/20 pt-2 space-y-1">
                            {isPending && (
                              <p className="flex items-start gap-1">
                                <span>ℹ</span>
                                <span>If the administrator cancels your booking, your payment will be refunded within 24 hours.</span>
                              </p>
                            )}
                            {isApproved && <p className="font-semibold text-emerald-750">Enjoy your show at the City Museum!</p>}
                            {isDeclined && <p className="font-semibold text-red-755">Simulated project refund is processed to your original payment method.</p>}
                            {isFailed && <p className="font-semibold text-red-755">No ticket was issued for this failed booking.</p>}
                          </div>
                        </div>
                      );
                    }
                    if (!isUser) {
                      const parsedStatus = parseBookingStatusMessage(msg.text);
                      if (parsedStatus) {
                        return (
                          <div className="booking-status-card p-3.5 rounded-xl border border-slate-200/30 bg-white/40 shadow-xs w-full max-w-xs sm:max-w-sm space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                              <span>🎫</span>
                              <span>Booking Status</span>
                            </div>

                            {/* Main Row */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800 break-all select-all font-mono">
                                {parsedStatus.bookingId}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border tracking-wide shadow-2xs ${getBadgeStyle(parsedStatus.bookingStatus)}`}>
                                {getStatusLabel(parsedStatus.bookingStatus)}
                              </span>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-200/40 my-1" />

                            {/* Bottom Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                              {/* Visit Schedule */}
                              <div className="space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                                  <span>🗓️</span>
                                  <span>Visit Schedule</span>
                                </div>
                                <div className="font-semibold text-slate-700 leading-tight">
                                  {parsedStatus.visitSchedule}
                                </div>
                              </div>
                              
                              {/* Payment */}
                              <div className="space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                                  <span>💳</span>
                                  <span>Payment</span>
                                </div>
                                <div className="font-semibold text-slate-700 leading-tight">
                                  {parsedStatus.paymentStatus}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

                    return <div className="text-sm leading-relaxed">{msg.text}</div>;
                  })()}

                  {msg.timestamp && <div className={`mt-2 text-xs ${isUser ? "text-green-100" : "text-gray-400"}`}>{formatTime(msg.timestamp)}</div>}

                  {/* Payment Button */}
                  {msg.paymentInfo && handleOpenPayment && (
                    <div className="mt-3">
                      <button
                        disabled={!!processingTicketId}
                        onClick={() => handleOpenPayment(msg.paymentInfo)}
                        className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all duration-200 shadow-sm cursor-pointer text-center text-sm ${
                          processingTicketId === msg.paymentInfo.ticketId
                            ? "bg-emerald-700 cursor-wait animate-pulse"
                            : processingTicketId
                            ? "bg-gray-300 cursor-not-allowed text-gray-400"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {processingTicketId === msg.paymentInfo.ticketId
                          ? paymentProcessingState || "Processing..."
                          : `Pay ₹${msg.paymentInfo.amount}`}
                      </button>
                    </div>
                  )}

                  {/* Options */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {msg.options.map((opt) => {
                        const selected = ticketSelections[index] && ticketSelections[index][opt.id] !== undefined;
                        const qty = (ticketSelections[index] && ticketSelections[index][opt.id]) || 1;

                        return (
                          <div key={opt.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              {/* Booking UI */}
                              {handleBook && (
                                <>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleSelect(index, opt)}
                                    className="mt-1 w-4 h-4 text-green-600 border-gray-200 rounded focus:ring-0"
                                  />
                                  <div>
                                    <div className="font-semibold text-sm">{opt.name}</div>
                                    <div className="text-xs text-gray-500">{opt.day} · {opt.time}</div>
                                    <div className="text-xs text-gray-500">₹{opt.price} · {opt.available_tickets} available</div>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Quantity for booking */}
                              {handleBook && (
                                <div className="flex items-center border rounded-md px-1 bg-white">
                                  <button onClick={() => selected && decrement(index, opt.id)} className="px-2 py-1 text-gray-600" disabled={!selected || qty <= 1}>−</button>
                                  <input type="number" min="1" max={opt.available_tickets} value={qty} onChange={(e) => setQuantity(index, opt.id, parseInt(e.target.value) || 1, opt.available_tickets)} className="w-14 text-center px-1 py-1 text-sm outline-none" disabled={!selected} />
                                  <button onClick={() => selected && increment(index, opt.id, opt.available_tickets)} className="px-2 py-1 text-gray-600" disabled={!selected || qty >= opt.available_tickets}>+</button>
                                </div>
                              )}

                              {/* Subtotal */}
                              {handleBook && <div className="text-xs text-gray-500">Subtotal: <span className="font-semibold">₹{opt.price * qty}</span></div>}

                              {/* Cancel button */}
                              {handleCancel && (
                                <button onClick={() => handleCancel(opt.id, opt.name)} className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition">
                                  Cancel Ticket
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Confirm Booking */}
                      {handleBook && (
                        <div className="flex items-center justify-end">
                          <button onClick={() => handleConfirm(index, msg.options)} disabled={!ticketSelections[index] || Object.keys(ticketSelections[index]).length === 0} className={`px-4 py-2 rounded-md text-white font-semibold transition ${ticketSelections[index] && Object.keys(ticketSelections[index]).length > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"}`}>
                            Confirm Booking
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg shadow-sm max-w-[40%]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="text-sm text-gray-500">Bot is typing…</div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </section>
  );
}