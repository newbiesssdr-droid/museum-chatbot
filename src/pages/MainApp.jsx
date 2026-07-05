// src/pages/MainApp.jsx
import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

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
    <div className="min-h-screen flex flex-col bg-gray-100">

      <Header onLogout={() => signOut(auth)} />

      <main className="flex-1 flex">

  {/* LEFT SIDEBAR */}
  <div className="w-16 flex flex-col items-center bg-white p-2 shadow-md">
    <button
      className={`my-2 p-2 rounded hover:bg-gray-200 ${activePanel === "tickets" ? "bg-gray-200" : ""}`}
      onClick={() => setActivePanel(prev => prev === "tickets" ? null : "tickets")}
    >
      🎟️
    </button>

    <button
      className={`my-2 p-2 rounded hover:bg-gray-200 ${activePanel === "history" ? "bg-gray-200" : ""}`}
      onClick={() => setActivePanel(prev => prev === "history" ? null : "history")}
    >
      💬
    </button>

    <button
      className={`my-2 p-2 rounded hover:bg-gray-200 ${activePanel === "shows" ? "bg-gray-200" : ""}`}
      onClick={() => setActivePanel(prev => prev === "shows" ? null : "shows")}
    >
      🎭
    </button>
  </div>

  {/* CHAT AREA */}
  <div className={`flex-1 flex flex-col bg-white m-2 rounded shadow ${activePanel ? "md:w-2/3" : "w-full"}`}>

    <ChatWindow
      messages={messages}
      isTyping={isTyping}
      handleBook={handleBook}
      handleCancel={handleCancel}
      handleOpenPayment={handleOpenPayment}
      processingTicketId={processingTicketId}
      paymentProcessingState={paymentProcessingState}
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
    <div className="w-80 bg-white rounded shadow m-2 p-2 overflow-y-auto">

      {/* 🎟️ TICKETS */}
      {activePanel === "tickets" && (
  <div>
    <h2 className="font-bold mb-2">🎟 My Tickets</h2>

    {myTickets.length === 0 ? (
      <p>No tickets yet</p>
    ) : (
      myTickets.map((t) => (
         <div key={t.id} className="border p-2 mb-2 rounded">

           <p className="font-semibold">{t.showName}</p>
           <p className="text-sm">Qty: {t.quantity}</p>

           {t.status === "pending" && t.paymentStatus === "Pending Approval" && (
             <p className="text-sm text-yellow-600 font-semibold mt-1">Awaiting Admin Approval</p>
           )}
           {t.status === "confirmed" && (
             <div>
               <p className="text-sm text-green-600 font-semibold mt-1">Confirmed</p>
               <div className="flex gap-2">
                 {t.pdfUrl && (
                   <a
                     href={t.pdfUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="mt-2 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200"
                   >
                     🎟 Download Ticket
                   </a>
                 )}
                 <button
                   onClick={() => handleCancel(t.id, t.showName)}
                   disabled={processingTicketId === t.id}
                   className="mt-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-2 rounded-lg text-sm transition duration-200"
                 >
                   {processingTicketId === t.id ? "Cancelling..." : "Cancel Ticket"}
                 </button>
               </div>
             </div>
           )}
           {t.status === "cancelled" && (
             <p className="text-sm text-gray-500 font-semibold mt-1">
               {t.paymentStatus === "Refunded" ? "Declined & Refunded" : "Cancelled"}
             </p>
           )}
           {t.status === "failed" && (
             <p className="text-sm text-red-600 font-semibold mt-1">Payment Failed</p>
           )}
           {t.status === "pending" && t.paymentStatus !== "Pending Approval" && (
             <div>
               <p className="text-sm text-yellow-600 font-semibold mt-1">Pending Payment</p>
               <button
                 onClick={() => handleCancel(t.id, t.showName)}
                 className="bg-red-500 text-white px-2 py-1 rounded mt-2 text-sm"
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