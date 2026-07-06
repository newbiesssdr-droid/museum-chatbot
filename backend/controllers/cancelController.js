// controllers/cancelController.js
import { db } from "../config/db.js";
import { createNotification } from "../utils/notificationHelper.js";

export const cancelTicket = (req, res) => {
  const { ticketId, userId = "guest_user" } = req.body;

  if (!ticketId) {
    return res.json({ reply: "Please provide a valid ticket ID to cancel." });
  }

  // Start a transaction to ensure atomic cancel and restore
  db.beginTransaction((txErr) => {
    if (txErr) return res.json({ reply: "Database cancellation failed." });

    const sql = "SELECT * FROM tickets WHERE id = ? AND user_id = ? FOR UPDATE";
    db.query(sql, [ticketId, userId], (err, results) => {
      if (err || results.length === 0) {
        return db.rollback(() => {
          res.json({ reply: "Ticket not found or not yours." });
        });
      }

      const ticket = results[0];

      const restoreSeats =
        ticket.status === "confirmed" ||
        ticket.status === "pending";

      const proceedDelete = () => {
        db.query("DELETE FROM tickets WHERE id = ?", [ticketId], (deleteErr) => {
          if (deleteErr) {
            return db.rollback(() => {
              res.json({ reply: "Failed to cancel the booking." });
            });
          }

          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => {
                res.json({ reply: "Commit cancellation failed." });
              });
            }

            // Failure-isolated notification (secondary action)
            createNotification({
              userId: ticket.user_id,
              ticketId,
              bookingCode: ticket.booking_code,
              type: "booking_cancelled",
              message: "Your booking was cancelled.",
            });

            return res.json({
              reply: `❌ Booking (Ticket ID: ${ticketId}) cancelled.`,
            });
          });
        });
      };

      if (restoreSeats) {
        db.query(
          "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
          [ticket.quantity, ticket.show_id],
          (restoreErr) => {
            if (restoreErr) {
              return db.rollback(() => {
                res.json({ reply: "Failed to restore available tickets." });
              });
            }
            proceedDelete();
          }
        );
      } else {
        proceedDelete();
      }
    });
  });
};