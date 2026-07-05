import React, { useState, useEffect } from "react";

export default function ManageShows({ theme = "light" }) {
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState({
    name: "",
    day_of_week: "",
    start_time: "",
    available_tickets: 0,
    price: 0
  });
  const [editingId, setEditingId] = useState(null);

  // Fetch shows
  const fetchShows = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/shows");
      const data = await res.json();
      setShows(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  // Add or update show
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update
        await fetch(`http://localhost:5000/api/admin/update-show/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
      } else {
        // Add
        await fetch("http://localhost:5000/api/admin/add-show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
      }
      setForm({ name: "", day_of_week: "", start_time: "", available_tickets: 0, price: 0 });
      setEditingId(null);
      fetchShows();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete show
  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/admin/delete-show/${id}`, { method: "DELETE" });
      fetchShows();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit show
  const handleEdit = (show) => {
    setForm({
      name: show.name,
      day_of_week: show.day_of_week,
      start_time: show.start_time.slice(0, 5),
      available_tickets: show.available_tickets,
      price: show.price
    });
    setEditingId(show.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Form Editor */}
      <div className="lg:col-span-1 space-y-4">
        <div className={`p-6 rounded-2xl border transition-colors ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-55/50 border-slate-150"
        }`}>
          <h2 className={`text-base font-bold mb-4 uppercase tracking-wider ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            {editingId ? "Edit Show" : "Add New Show"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Show Name</label>
              <input
                type="text"
                placeholder="e.g. Prehistoric Era Exhibit"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Day of Week</label>
              <input
                type="text"
                placeholder="e.g. Wednesday"
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === "dark" ? "bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === "dark" ? "bg-slate-955 border-slate-800 text-slate-100 focus:bg-slate-955" : "bg-white border-slate-200 text-slate-800"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Available Tickets</label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={form.available_tickets}
                onChange={(e) => setForm({ ...form, available_tickets: Number(e.target.value) })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === "dark" ? "bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Price per Ticket (₹)</label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === "dark" ? "bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
                required
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition duration-200 cursor-pointer"
              >
                {editingId ? "Update Show" : "Add Show"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ name: "", day_of_week: "", start_time: "", available_tickets: 0, price: 0 }); }}
                  className={`w-full mt-2 font-semibold py-2.5 rounded-xl text-sm transition duration-200 cursor-pointer ${
                    theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-355 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Shows List */}
      <div className="lg:col-span-2 space-y-4">
        <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
        }`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
            theme === "dark" ? "border-slate-800" : "border-slate-150"
          }`}>
            <h2 className={`font-bold text-xs uppercase tracking-wider ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>🎭 Current Museum Shows</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    theme === "dark" ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-150 bg-slate-50/50 text-slate-500"
                  }`}>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-center">Tickets</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  theme === "dark" ? "divide-slate-800/60" : "divide-slate-100"
                }`}>
                  {shows.map(show => (
                    <tr key={show.id} className={`transition-colors ${
                      theme === "dark" ? "hover:bg-slate-850/30" : "hover:bg-slate-50/50"
                    }`}>
                      <td className={`py-4 px-4 font-semibold text-sm leading-tight ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{show.name}</td>
                      <td className={`py-4 px-4 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-650"}`}>{show.day_of_week}</td>
                      <td className={`py-4 px-4 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-650"}`}>{show.start_time.slice(0,5)}</td>
                      <td className={`py-4 px-4 text-sm text-center font-medium ${theme === "dark" ? "text-slate-350" : "text-slate-700"}`}>{show.available_tickets}</td>
                      <td className={`py-4 px-4 text-sm font-bold ${theme === "dark" ? "text-emerald-450" : "text-slate-800"}`}>₹{show.price}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(show)} 
                            className={`font-semibold px-3 py-1.5 rounded-lg text-xs transition duration-200 cursor-pointer ${
                              theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(show.id)} 
                            className={`text-xs font-semibold border transition duration-200 cursor-pointer ${
                              theme === "dark" 
                                ? "bg-red-955/20 hover:bg-red-900/30 border-red-900/30 text-red-400" 
                                : "bg-red-50 hover:bg-red-100 border-red-200/50 text-red-650"
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
