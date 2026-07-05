import React, { useState, useEffect } from "react";
import ManageShows from "./ManageShows";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("bookings"); // local tab toggling only
  const [theme, setTheme] = useState(() => localStorage.getItem("admin-theme") || "light");

  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/bookings");
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  // Approve booking
  const handleApprove = async (id) => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id })
      });
      const data = await res.json();
      alert(data.message);
      fetchPendingBookings();
    } catch (err) {
      console.error(err);
    }
  };

  // Decline booking
  const handleDecline = async (id) => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id })
      });
      const data = await res.json();
      alert(data.message);
      fetchPendingBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("admin-theme", next);
      return next;
    });
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-200 ${
      theme === "dark" ? "bg-slate-955 text-slate-100" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-850 shrink-0 min-h-screen">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            🏛️ Heritage Admin
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Management Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer ${
              activeTab === "bookings"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10"
                : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="text-base">📥</span> Pending Bookings
          </button>
          <button
            onClick={() => setActiveTab("shows")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer ${
              activeTab === "shows"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10"
                : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="text-base">🎭</span> Manage Shows
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-600 font-medium">v1.2.0 • Project Mode</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Header */}
        <header className={`py-4 px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm border-b transition-colors duration-200 ${
          theme === "dark" ? "bg-slate-900 border-slate-805 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div>
            <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
              {activeTab === "bookings" ? "Pending Bookings" : "Manage Shows"}
            </h2>
            <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              {activeTab === "bookings" ? "Review and approve pending ticket reservations" : "Add, modify or delete museum shows"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition duration-205 cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-100 border-slate-200 text-slate-750 hover:bg-slate-200"
              }`}
            >
              {theme === "dark" ? "☀ Light" : "🌙 Dark"}
            </button>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              theme === "dark" ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              Admin Mode
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
          {activeTab === "bookings" && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
                }`}>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl ${
                    theme === "dark" ? "bg-amber-950/20 border-amber-900/30" : "bg-amber-50 border-amber-200/50"
                  }`}>
                    ⏳
                  </div>
                  <div>
                    <span className={`text-2xl font-bold block leading-none ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{bookings.length}</span>
                    <span className={`text-xs font-semibold mt-1 block ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Pending Approvals</span>
                  </div>
                </div>
              </div>

              {/* Bookings Section */}
              <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
              }`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
                  theme === "dark" ? "border-slate-800" : "border-slate-150"
                }`}>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${theme === "dark" ? "text-slate-300" : "text-slate-850"}`}>📥 Booking Request Inbox</h3>
                </div>
                
                <div className="p-6">
                  {bookings.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-3xl block mb-2">🎉</span>
                      <p className="text-slate-500 text-sm font-medium">No pending bookings awaiting approval.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            theme === "dark" ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-150 bg-slate-50/50 text-slate-500"
                          }`}>
                            <th className="py-3.5 px-4">Booking Code</th>
                            <th className="py-3.5 px-4">Show Details</th>
                            <th className="py-3.5 px-4 text-center">Qty</th>
                            <th className="py-3.5 px-4">Total Price</th>
                            <th className="py-3.5 px-4">Purchaser</th>
                            <th className="py-3.5 px-4">Payment Status</th>
                            <th className="py-3.5 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors ${
                          theme === "dark" ? "divide-slate-800/60" : "divide-slate-100"
                        }`}>
                          {bookings.map((booking) => (
                            <tr key={booking.id} className={`transition-colors ${
                              theme === "dark" ? "hover:bg-slate-850/30" : "hover:bg-slate-50/50"
                            }`}>
                              <td className={`py-4 px-4 font-mono text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{booking.booking_code}</td>
                              <td className="py-4 px-4">
                                <span className={`font-semibold text-sm block leading-tight ${theme === "dark" ? "text-slate-200" : "text-slate-855"}`}>{booking.show_name}</span>
                                <span className={`text-[11px] mt-0.5 block ${theme === "dark" ? "text-slate-500" : "text-slate-450"}`}>{booking.day_of_week}</span>
                              </td>
                              <td className={`py-4 px-4 text-center text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{booking.quantity}</td>
                              <td className={`py-4 px-4 text-sm font-bold ${theme === "dark" ? "text-emerald-400" : "text-slate-800"}`}>₹{booking.price * booking.quantity}</td>
                              <td className="py-4 px-4">
                                <span className={`text-sm font-medium block ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{booking.purchaser_name}</span>
                                <span className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-450"}`}>{booking.purchaser_email}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                                  theme === "dark" ? "bg-amber-955/20 border-amber-900/30 text-amber-500" : "bg-amber-50 border-amber-200/50 text-amber-700"
                                }`}>
                                  ● {booking.payment_status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleApprove(booking.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDecline(booking.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                                      theme === "dark"
                                        ? "bg-red-955/20 hover:bg-red-900/30 border-red-900/30 text-red-400"
                                        : "bg-red-50 text-red-650 hover:bg-red-100 border-red-200/50"
                                    }`}
                                  >
                                    Decline
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "shows" && (
            <div className="space-y-6">
              <ManageShows theme={theme} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
