import React, { useState, useEffect } from "react";
import ManageShows from "./ManageShows";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-100 p-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">🛠️ Admin Dashboard</h1>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">📥 Pending Bookings (Awaiting Approval)</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No pending bookings awaiting approval.</p>
        ) : (
          <table className="w-full border border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="border p-2">Booking Code</th>
                <th className="border p-2">Show</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Purchaser Name</th>
                <th className="border p-2">Purchaser Email</th>
                <th className="border p-2">Payment Status</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-mono text-sm">{booking.booking_code}</td>
                  <td className="border p-2">{booking.show_name} ({booking.day_of_week})</td>
                  <td className="border p-2">{booking.quantity}</td>
                  <td className="border p-2">₹{booking.price * booking.quantity}</td>
                  <td className="border p-2">{booking.purchaser_name}</td>
                  <td className="border p-2">{booking.purchaser_email}</td>
                  <td className="border p-2 text-yellow-600 font-semibold">{booking.payment_status}</td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => handleApprove(booking.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(booking.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Decline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow">
        <ManageShows />
      </div>
    </div>
  );
}
