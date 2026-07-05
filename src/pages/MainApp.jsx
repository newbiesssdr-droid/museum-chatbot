// src/pages/MainApp.jsx
import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import museumImage from "../assets/museum.jpg";

import { cancelTicket, getMyTickets } from "../services/bookingService";
import { processPayment } from "../services/paymentService";

import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import SidebarSessions from "../components/SidebarSessions";
import ShowsSidebar from "../components/ShowsSidebar";
import Header from "../components/Header";

import {
  loadChatHistory,
  loadSessions,
  saveMessage,
  deleteSession,
} from "../services/chatService";

import { sendToDialogflow } from "../services/dialogflowService";

export default function MainApp() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "👋 Welcome to the Museum Chatbot! How can I assist you today?",
    },
  ]);

  const [shows, setShows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [isTyping, setIsTyping] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [input, setInput] = useState("");
  const [activePanel, setActivePanel] = useState(null);

  const [processingTicketId, setProcessingTicketId] = useState(null);
  const [paymentProcessingState, setPaymentProcessingState] = useState("");

  const chatEndRef = useRef(null);

  // =========================
  // Auto-scroll
  // =========================
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // =========================
  // Load sessions + history
  // =========================
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    loadSessions(userId, setSessions);

    (async () => {
      const history = await loadChatHistory(userId, sessionId);
      if (history.length > 0) setMessages(history);
    })();
  }, [sessionId]);

  // =========================
  // Fetch shows
  // =========================
  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/shows");
        const data = await res.json();
        if (data.success) setShows(data.shows || []);
      } catch {
        setShows([]);
      }
    };
    fetchShows();
  }, []);

  // =========================
  // Fetch tickets
  // =========================
  const fetchTickets = async () => {
    const userId = auth.currentUser?.uid || "guest";
    const tickets = await getMyTickets(userId);
    setMyTickets(tickets);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // =========================
  // Chat send
  // =========================
  const handleSend = async () => {
    if (!input.trim()) return;

    const userId = auth.currentUser?.uid || "guest";

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    await saveMessage(userId, "user", input, sessionId);

    try {
      const botReply = await sendToDialogflow(input, sessionId, userId);

      // Check if action is payment_required
      if (botReply.action === "payment_required" && botReply.paymentInfo) {
        const botMsg = {
          sender: "bot",
          text: botReply.text,
          paymentInfo: botReply.paymentInfo,
        };
        setMessages((prev) => [...prev, botMsg]);
        await saveMessage(userId, "bot", botReply.text, sessionId);
      } else {
        const botMsg = {
          sender: "bot",
          text: botReply.text,
          options: botReply.options || [],
        };
        setMessages((prev) => [...prev, botMsg]);
        await saveMessage(userId, "bot", botReply.text, sessionId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Server error" },
      ]);
    }

    setIsTyping(false);
  };

  // =========================
  // 🔥 NEW BOOKING FLOW
  // =========================
  const handleBook = async (showId, showName, qty = 1) => {
    const userId = auth.currentUser?.uid || "guest";

    console.log("🚀 STEP 1: Creating Pending Booking");

    try {
      const res = await fetch("http://localhost:5000/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showId,
          quantity: qty,
          userId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.message }]);
        return;
      }

      // Display booking pending receipt in chatbot conversation
      const paymentInfo = {
        ticketId: data.ticketId,
        amount: data.totalPrice,
        bookingCode: data.bookingCode,
        showName: data.showName,
        quantity: data.quantity,
      };

      const botMsg = {
        sender: "bot",
        text: `Your booking has been created.\n\nBooking ID: ${data.bookingCode}\n\nMuseum:\n${data.showName}\n\nVisitors:\n${data.quantity}\n\nAmount:\n₹${data.totalPrice}\n\nPlease complete payment to confirm your booking.`,
        paymentInfo,
      };

      setMessages((prev) => [...prev, botMsg]);
      await saveMessage(userId, "bot", botMsg.text, sessionId);

    } catch (err) {
      console.error("❌ ERROR booking tickets:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "⚠️ Network error while booking" }]);
    }
  };

  // =========================
  // 🔥 PAYMENT OPENER & VERIFIER
  // =========================
  const handleOpenPayment = (paymentInfo) => {
    const userId = auth.currentUser?.uid || "guest";
    const userEmail = auth.currentUser?.email || "guest@example.com";
    const userName = auth.currentUser?.displayName || "Guest User";

    processPayment(
      {
        ticketId: paymentInfo.ticketId,
        amount: paymentInfo.amount,
        bookingCode: paymentInfo.bookingCode,
        showName: paymentInfo.showName,
        quantity: paymentInfo.quantity,
        userEmail,
        userName,
      },
      {
        onStateChange: (state) => {
          setProcessingTicketId(paymentInfo.ticketId);
          setPaymentProcessingState(state);
        },
        onSuccess: async (verifyData) => {
          setProcessingTicketId(null);
          setPaymentProcessingState("");

          const successMsg = {
            sender: "bot",
            text: `✅ Payment successful! Your booking is awaiting administrator approval.\n\nBooking ID: ${paymentInfo.bookingCode}\n\nShow: ${paymentInfo.showName || "Museum Gallery"}\n\nYou can download the ticket PDF from the My Tickets sidebar once approved.`,
          };
          setMessages((prev) => [...prev, successMsg]);
          await saveMessage(userId, "bot", successMsg.text, sessionId);

          fetchTickets();
        },
        onCancel: async () => {
          setProcessingTicketId(null);
          setPaymentProcessingState("");

          const cancelMsg = {
            sender: "bot",
            text: "Payment was cancelled. Your booking is still pending.",
            paymentInfo,
          };
          setMessages((prev) => [...prev, cancelMsg]);
          await saveMessage(userId, "bot", cancelMsg.text, sessionId);
        },
        onFail: async (errMessage) => {
          setProcessingTicketId(null);
          setPaymentProcessingState("");

          const failMsg = {
            sender: "bot",
            text: `Payment was not completed: ${errMessage}. You can try again whenever you're ready.`,
            paymentInfo,
          };
          setMessages((prev) => [...prev, failMsg]);
          await saveMessage(userId, "bot", failMsg.text, sessionId);
        },
      }
    );
  };

  // =========================
  // Cancel
  // =========================
  const handleCancel = async (ticketId, showName) => {
    if (processingTicketId) return;

    const confirmCancel = window.confirm(`Are you sure you want to cancel your ticket for ${showName}?`);
    if (!confirmCancel) return;

    setProcessingTicketId(ticketId);
    try {
      const userId = auth.currentUser?.uid || "guest";
      const result = await cancelTicket(ticketId, userId);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: result.message },
      ]);
    } catch (err) {
      console.error("Cancel ticket error:", err);
    } finally {
      setProcessingTicketId(null);
      fetchTickets();
    }
  };

  // =========================
  // UI
  // =========================
  console.log("🎟 myTickets:", myTickets);
  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center text-slate-800"
      style={{ backgroundImage: `url(${museumImage})`, backgroundAttachment: "fixed" }}
    >

      <Header onLogout={() => signOut(auth)} />

      <main className="flex-1 flex">

  {/* LEFT SIDEBAR */}
  <div className="w-16 flex flex-col items-center bg-white/40 backdrop-blur-md border border-white/20 m-2 rounded-2xl p-2 shadow-lg z-10">
    <button
      className={`my-2 p-2 rounded-xl transition-all duration-200 hover:bg-white/45 ${activePanel === "tickets" ? "bg-white/60 shadow-sm" : ""}`}
      onClick={() => setActivePanel(prev => prev === "tickets" ? null : "tickets")}
      title="My Tickets"
    >
      🎟️
    </button>

    <button
      className={`my-2 p-2 rounded-xl transition-all duration-200 hover:bg-white/45 ${activePanel === "history" ? "bg-white/60 shadow-sm" : ""}`}
      onClick={() => setActivePanel(prev => prev === "history" ? null : "history")}
      title="Chat History"
    >
      💬
    </button>

    <button
      className={`my-2 p-2 rounded-xl transition-all duration-200 hover:bg-white/45 ${activePanel === "shows" ? "bg-white/60 shadow-sm" : ""}`}
      onClick={() => setActivePanel(prev => prev === "shows" ? null : "shows")}
      title="Shows"
    >
      🎭
    </button>
  </div>

  {/* CHAT AREA */}
  <div className={`flex-1 flex flex-col bg-white/50 backdrop-blur-md border border-white/25 m-2 rounded-2xl shadow-xl overflow-hidden z-10 ${activePanel ? "md:w-2/3" : "w-full"}`}>

    <ChatWindow
      messages={messages}
      isTyping={isTyping}
      handleBook={handleBook}
      handleCancel={handleCancel}
      handleOpenPayment={handleOpenPayment}
      processingTicketId={processingTicketId}
      paymentProcessingState={paymentProcessingState}
      myTickets={myTickets}
    />

    <div ref={chatEndRef} />

    <ChatInput
      input={input}
      setInput={setInput}
      onSend={handleSend}
    />
  </div>

  {/* RIGHT PANEL */}
  {activePanel && (
    <div className="w-80 bg-white/50 backdrop-blur-md border border-white/25 rounded-2xl shadow-xl m-2 p-4 overflow-y-auto z-10 flex flex-col gap-4">

      {/* 🎟️ TICKETS */}
      {activePanel === "tickets" && (
  <div>
    <h2 className="font-bold text-lg mb-4 text-slate-800 border-b border-white/20 pb-2">🎟️ My Tickets</h2>

    {myTickets.length === 0 ? (
      <p className="text-slate-500 text-sm">No tickets yet</p>
    ) : (
      myTickets.map((t) => (
         <div key={t.id} className="border border-white/30 bg-white/40 p-3 mb-3 rounded-xl shadow-sm hover:shadow transition-shadow">

           <p className="font-semibold text-slate-800">{t.showName}</p>
           <p className="text-xs text-slate-500">Qty: {t.quantity}</p>

           {t.status === "pending" && t.paymentStatus === "Pending Approval" && (
             <p className="text-xs text-yellow-700 font-semibold mt-1.5 bg-yellow-50/50 px-2 py-0.5 rounded border border-yellow-200/50 w-fit">Awaiting Admin Approval</p>
           )}
           {t.status === "confirmed" && (
             <div>
               <p className="text-xs text-green-700 font-semibold mt-1.5 bg-green-50/50 px-2 py-0.5 rounded border border-green-200/50 w-fit">Confirmed</p>
               <div className="flex gap-2">
                 {t.pdfUrl && (
                   <a
                     href={t.pdfUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition duration-200"
                   >
                     🎟 Download Ticket
                   </a>
                 )}
                 <button
                   onClick={() => handleCancel(t.id, t.showName)}
                   disabled={processingTicketId === t.id}
                   className="mt-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition duration-200"
                 >
                   {processingTicketId === t.id ? "Cancelling..." : "Cancel Ticket"}
                 </button>
               </div>
             </div>
           )}
           {t.status === "cancelled" && (
             <p className="text-xs text-slate-500 font-semibold mt-1.5 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/50 w-fit">
               {t.paymentStatus === "Refunded" ? "Declined & Refunded" : "Cancelled"}
             </p>
           )}
           {t.status === "failed" && (
             <p className="text-xs text-red-700 font-semibold mt-1.5 bg-red-50/50 px-2 py-0.5 rounded border border-red-200/50 w-fit">Payment Failed</p>
           )}
           {t.status === "pending" && t.paymentStatus !== "Pending Approval" && (
             <div>
               <p className="text-xs text-yellow-700 font-semibold mt-1.5 bg-yellow-50/50 px-2 py-0.5 rounded border border-yellow-200/50 w-fit">Pending Payment</p>
               <button
                 onClick={() => handleCancel(t.id, t.showName)}
                 className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg mt-2 text-xs font-semibold shadow transition duration-200"
               >
                 Cancel
               </button>
             </div>
           )}

         </div>
      ))
    )}
  </div>
)}

      {/* 💬 HISTORY */}
      {activePanel === "history" && (
        <SidebarSessions
          sessions={sessions}
          sessionId={sessionId}
          setSessionId={setSessionId}
          handleDeleteSession={deleteSession}
        />
      )}

      {/* 🎭 SHOWS */}
      {activePanel === "shows" && (
        <ShowsSidebar
          shows={shows}
          handleBook={handleBook}
          setShows={setShows}
        />
      )}
    </div>
  )}

</main>



    </div>
  );
}