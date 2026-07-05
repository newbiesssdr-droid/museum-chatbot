// src/components/ChatWindow.jsx
import React, { useRef, useEffect, useState } from "react";

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
    <section className="flex-1 bg-white rounded-lg shadow-md flex flex-col h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">M</div>
          <div>
            <div className="text-sm font-medium text-gray-800">Museum Assistant</div>
            <div className="text-xs text-gray-400">Here to help — ask about shows, bookings & more</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          return (
            <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`} aria-live="polite">
              <div className={`max-w-[82%] flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 items-end`}>
                {/* Avatar */}
                {!isUser ? (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-white flex items-center justify-center font-semibold">🤖</div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">U</div>
                )}

                {/* Bubble */}
                <div className={`p-3 rounded-xl shadow-sm break-words ${isUser ? "bg-green-600 text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border border-gray-100"}`} style={{ animation: "fadeIn .14s ease-out" }}>
                  
                  {(() => {
                    const successInfo = !isUser && getSuccessInfo(msg.text);
                    if (successInfo) {
                      return (
                        <div className="flex flex-col gap-3 p-1 max-w-sm text-left">
                          {/* Status header */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                              <span>✓</span>
                              <span>Payment Completed</span>
                            </div>
                            <div className="flex items-center gap-2 text-yellow-600 font-semibold text-sm">
                              <span className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></span>
                              <span>Waiting for Admin Approval</span>
                            </div>
                          </div>

                          {/* Main Message */}
                          <div className="text-xs text-gray-600 border-t border-gray-100 pt-2 space-y-1">
                            <p>Your payment has been completed successfully.</p>
                            <p>The administrator is reviewing your booking.</p>
                          </div>

                          {/* Booking details card */}
                          <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-xs text-gray-700 space-y-1">
                            <p><span className="font-semibold text-gray-500">Booking ID:</span> {successInfo.bookingCode}</p>
                            <p><span className="font-semibold text-gray-500">Show:</span> {successInfo.showName}</p>
                          </div>

                          {/* Info Note */}
                          <div className="text-[10px] text-gray-400 border-t border-gray-100 pt-2 space-y-1">
                            <p className="flex items-start gap-1">
                              <span>ℹ</span>
                              <span>If the administrator cancels your booking, your payment will be refunded within 24 hours.</span>
                            </p>
                            <p className="font-medium text-gray-500 mt-1">Once approved, you can download your ticket from My Tickets.</p>
                          </div>
                        </div>
                      );
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