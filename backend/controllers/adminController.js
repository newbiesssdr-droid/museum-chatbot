import { db } from "../config/db.js";
import { createTicketPdf } from "./ticketController.js";
import { createNotification } from "../utils/notificationHelper.js";

// Fetch all shows
export const getShows = (req, res) => {
  const sql = `
    SELECT * FROM shows 
    ORDER BY FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), start_time
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

// Add a new show
export const addShow = (req, res) => {
  const { name, day_of_week, start_time, available_tickets, price } = req.body;
  const sql = "INSERT INTO shows (name, day_of_week, start_time, available_tickets, price) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, day_of_week, start_time, available_tickets, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Show added successfully!", id: result.insertId });
  });
};

// Update a show
export const updateShow = (req, res) => {
  const { id } = req.params;
  const { name, day_of_week, start_time, available_tickets, price } = req.body;
  const sql = "UPDATE shows SET name=?, day_of_week=?, start_time=?, available_tickets=?, price=? WHERE id=?";
  db.query(sql, [name, day_of_week, start_time, available_tickets, price, id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Show updated successfully!" });
  });
};

// Delete a show
export const deleteShow = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM shows WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Show deleted successfully!" });
  });
};

// Fetch bookings awaiting admin approval
export const getPendingBookings = (req, res) => {
  const sql = `
    SELECT t.id, t.booking_code, t.quantity, t.booking_date, t.purchaser_name, t.purchaser_email,
           s.name AS show_name, s.day_of_week, s.start_time, s.price,
           p.status AS payment_status
    FROM tickets t
    LEFT JOIN shows s ON t.show_id = s.id
    JOIN payments p ON t.id = p.ticket_id
    WHERE p.status = 'Pending Approval' AND t.status = 'pending'
    ORDER BY t.booking_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

// Approve booking request, generate PDF, change status to confirmed
export const approveBooking = (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ success: false, message: "ticketId required" });

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ success: false, message: "Transaction start failed" });

    // Select with FOR UPDATE to lock the row
    db.query(
      `SELECT t.*, s.name AS show_name, s.day_of_week, s.start_time, s.price
       FROM tickets t
       JOIN shows s ON t.show_id = s.id
       WHERE t.id = ? FOR UPDATE`,
      [ticketId],
      (err, results) => {
        if (err || !results.length) {
          return db.rollback(() => res.status(404).json({ success: false, message: "Booking not found" }));
        }

        const ticket = results[0];

        // Prevent duplicate actions
        if (ticket.status !== 'pending') {
          return db.rollback(() => res.json({ success: false, message: "Booking has already been processed" }));
        }

        const totalPrice = ticket.price * ticket.quantity;
        const bookingInfo = {
          bookingId: ticket.booking_code,
          showName: ticket.show_name,
          date: ticket.day_of_week,
          time: ticket.start_time ? ticket.start_time.slice(0, 5) : "",
          purchaserName: ticket.purchaser_name,
          purchaserEmail: ticket.purchaser_email,
          quantity: ticket.quantity,
          pricePerTicket: ticket.price,
          totalPrice,
        };

        // Generate PDF Ticket
        createTicketPdf(bookingInfo)
          .then(({ webPath }) => {
            // Update payment log status to 'Approved'
            db.query(
              "UPDATE payments SET status = 'Approved' WHERE ticket_id = ?",
              [ticketId],
              (payErr) => {
                if (payErr) {
                  return db.rollback(() => res.status(500).json({ success: false, message: "Failed to update payment status" }));
                }

                // Update ticket status to confirmed and save PDF path
                db.query(
                  "UPDATE tickets SET status = 'confirmed', pdf_path = ? WHERE id = ?",
                  [webPath, ticketId],
                  (ticketErr) => {
                    if (ticketErr) {
                      return db.rollback(() => res.status(500).json({ success: false, message: "Failed to update ticket status" }));
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        return db.rollback(() => res.status(500).json({ success: false, message: "Commit failed" }));
                      }

                      // Failure-isolated notification (secondary action)
                      createNotification({
                        userId: ticket.user_id,
                        ticketId,
                        bookingCode: ticket.booking_code,
                        type: "booking_approved",
                        message: "Your booking has been approved. Your ticket is ready to download.",
                      });

                      res.json({ success: true, message: "Booking approved successfully!" });
                    });
                  }
                );
              }
            );
          })
          .catch((pdfErr) => {
            console.error("❌ Admin PDF generation error:", pdfErr);
            db.rollback(() => res.status(500).json({ success: false, message: "Failed to generate PDF ticket" }));
          });
      }
    );
  });
};

// Decline booking request, release seats, change status to cancelled, mock refund
export const declineBooking = (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ success: false, message: "ticketId required" });

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ success: false, message: "Transaction start failed" });

    // Lock the row
    db.query(
      "SELECT * FROM tickets WHERE id = ? FOR UPDATE",
      [ticketId],
      (err, results) => {
        if (err || !results.length) {
          return db.rollback(() => res.status(404).json({ success: false, message: "Booking not found" }));
        }

        const ticket = results[0];

        // Prevent duplicate actions
        if (ticket.status !== 'pending') {
          return db.rollback(() => res.json({ success: false, message: "Booking has already been processed" }));
        }

        // Release reserved seats exactly once
        db.query(
          "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
          [ticket.quantity, ticket.show_id],
          (releaseErr) => {
            if (releaseErr) {
              return db.rollback(() => res.status(500).json({ success: false, message: "Failed to release seats" }));
            }

            // Update payments table to 'Refunded' (simulating refund)
            db.query(
              "UPDATE payments SET status = 'Refunded' WHERE ticket_id = ?",
              [ticketId],
              (payErr) => {
                if (payErr) {
                  return db.rollback(() => res.status(500).json({ success: false, message: "Failed to update payment status" }));
                }

                // Update ticket status to 'cancelled'
                db.query(
                  "UPDATE tickets SET status = 'cancelled' WHERE id = ?",
                  [ticketId],
                  (ticketErr) => {
                    if (ticketErr) {
                      return db.rollback(() => res.status(500).json({ success: false, message: "Failed to update ticket status" }));
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        return db.rollback(() => res.status(500).json({ success: false, message: "Commit failed" }));
                      }

                      // Failure-isolated notification (secondary action)
                      createNotification({
                        userId: ticket.user_id,
                        ticketId,
                        bookingCode: ticket.booking_code,
                        type: "booking_declined",
                        message: "Your booking was declined. Refund initiated.",
                      });

                      res.json({ success: true, message: "Booking declined and refund simulated." });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};
