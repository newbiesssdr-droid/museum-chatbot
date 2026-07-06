import { db } from "../config/db.js";
import razorpay from "../services/razorpayService.js";
import { createTicketPdf } from "./ticketController.js";
import Razorpay from "razorpay";
import { createNotification } from "../utils/notificationHelper.js";

// ==========================================
// 1. CREATE RAZORPAY ORDER (With Retry Support)
// ==========================================
export function createPayment(req, res) {
  const { ticketId, bookingId } = req.body;
  const id = ticketId || bookingId;

  if (!id) {
    return res.json({ success: false, message: "ticketId required" });
  }

  // Get the booking details
  db.query(
    `SELECT t.*, s.name, s.price, s.available_tickets 
     FROM tickets t 
     JOIN shows s ON t.show_id = s.id 
     WHERE t.id = ?`,
    [id],
    (err, results) => {
      if (err || !results.length) {
        return res.json({ success: false, message: "Booking not found" });
      }

      const ticket = results[0];

      if (ticket.status === "confirmed") {
        return res.json({ success: false, message: "Booking is already paid" });
      }

      const needsSeatReservation = (ticket.status === "cancelled" || ticket.status === "failed");

      const proceedOrderCreation = () => {
        const totalAmount = ticket.quantity * ticket.price;
        const mockOrderId = "order_mock_" + Math.random().toString(36).substr(2, 9);

        // Save the payment order details in transactions
        db.beginTransaction((txErr) => {
          if (txErr) return res.json({ success: false, message: "Transaction failed" });

          // Update ticket status to pending if it was retryable
          db.query(
            "UPDATE tickets SET status = 'pending' WHERE id = ?",
            [ticket.id],
            (updateTicketErr) => {
              if (updateTicketErr) {
                return db.rollback(() => res.json({ success: false, message: "Failed to update ticket" }));
              }

              // Insert into payments log
              db.query(
                `INSERT INTO payments (ticket_id, amount, razorpay_order_id, status)
                 VALUES (?, ?, ?, 'Pending Payment')
                 ON DUPLICATE KEY UPDATE status = 'Pending Payment', amount = ?`,
                [ticket.id, totalAmount, mockOrderId, totalAmount],
                (insertPaymentErr) => {
                  if (insertPaymentErr) {
                    return db.rollback(() => res.json({ success: false, message: "Failed to record payment" }));
                  }

                  db.commit((commitErr) => {
                    if (commitErr) {
                      return db.rollback(() => res.json({ success: false, message: "Commit failed" }));
                    }

                    return res.json({
                      success: true,
                      orderId: mockOrderId,
                      amount: Math.round(totalAmount * 100),
                      currency: "INR",
                      keyId: "rzp_test_placeholder",
                      ticketId: ticket.id,
                      bookingCode: ticket.booking_code,
                    });
                  });
                }
              );
            }
          );
        });
      };

      if (needsSeatReservation) {
        // Re-check and re-reserve seats for previously cancelled/expired booking retry
        if (ticket.available_tickets < ticket.quantity) {
          return res.json({ success: false, message: "Cannot retry payment: show is now sold out" });
        }

        db.beginTransaction((txErr) => {
          if (txErr) return res.json({ success: false, message: "Transaction failed" });

          db.query(
            "UPDATE shows SET available_tickets = available_tickets - ? WHERE id = ?",
            [ticket.quantity, ticket.show_id],
            (deductErr) => {
              if (deductErr) {
                return db.rollback(() => res.json({ success: false, message: "Failed to reserve seats" }));
              }
              db.commit((commitErr) => {
                if (commitErr) return db.rollback(() => res.json({ success: false, message: "Commit failed" }));
                // Proceed to order creation
                proceedOrderCreation();
              });
            }
          );
        });
      } else {
        // Already has reserved seats, just proceed
        proceedOrderCreation();
      }
    }
  );
}

// ==========================================
// 2. VERIFY RAZORPAY PAYMENT (Transactional)
// ==========================================
export function verifyPayment(req, res) {
  const { ticketId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!ticketId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.json({ success: false, message: "Missing required verification fields" });
  }

  // Success! Update DB in a transaction
  db.beginTransaction((txErr) => {
    if (txErr) return res.json({ success: false, message: "Database transaction failed" });

    // Retrieve ticket details first to get the user_id and booking_code
    db.query("SELECT user_id, booking_code FROM tickets WHERE id = ?", [ticketId], (ticketErr, ticketResults) => {
      if (ticketErr || !ticketResults.length) {
        return db.rollback(() => res.json({ success: false, message: "Ticket not found" }));
      }
      const ticket = ticketResults[0];

      // Update payment log status to 'Pending Approval'
      db.query(
        `UPDATE payments 
         SET status = 'Pending Approval', razorpay_payment_id = ?, razorpay_signature = ? 
         WHERE razorpay_order_id = ?`,
        [razorpay_payment_id, razorpay_signature, razorpay_order_id],
        (updatePayErr) => {
          if (updatePayErr) {
            return db.rollback(() => res.json({ success: false, message: "Failed to update payment status" }));
          }

          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => res.json({ success: false, message: "Commit verification failed" }));
            }

            // Failure-isolated notification creation (secondary action)
            createNotification({
              userId: ticket.user_id,
              ticketId,
              bookingCode: ticket.booking_code,
              type: "payment_success",
              message: "Payment completed. Your booking is waiting for admin approval.",
            });

            res.json({
              success: true,
              message: "Payment successful. Awaiting administrator approval.",
            });
          });
        }
      );
    });
  });
}

// ==========================================
// 3. FAIL PAYMENT
// ==========================================
export function failPayment(req, res) {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.json({ success: false, message: "ticketId required" });
  }

  db.beginTransaction((txErr) => {
    if (txErr) return res.json({ success: false, message: "Transaction failed" });

    // Retrieve ticket details to get show_id and quantity to release seats
    db.query("SELECT * FROM tickets WHERE id = ?", [ticketId], (err, results) => {
      if (err || !results.length) {
        return db.rollback(() => res.json({ success: false, message: "Ticket not found" }));
      }

      const ticket = results[0];

      // Release reserved seats
      db.query(
        "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
        [ticket.quantity, ticket.show_id],
        (releaseErr) => {
          if (releaseErr) {
            return db.rollback(() => res.json({ success: false, message: "Failed to release seats" }));
          }

          // Mark ticket as failed
          db.query("UPDATE tickets SET status = 'failed' WHERE id = ?", [ticketId], (updateErr) => {
            if (updateErr) {
              return db.rollback(() => res.json({ success: false, message: "Failed to update ticket status" }));
            }

            db.query(
              "UPDATE payments SET status = 'Failed' WHERE ticket_id = ? AND status = 'Pending Payment'",
              [ticketId],
              () => {
                db.commit(() => {
                  res.json({ success: true, status: "failed", message: "Payment status set to failed, seats released" });
                });
              }
            );
          });
        }
      );
    });
  });
}

// ==========================================
// 4. CANCEL PAYMENT
// ==========================================
export function cancelPayment(req, res) {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.json({ success: false, message: "ticketId required" });
  }

  db.beginTransaction((txErr) => {
    if (txErr) return res.json({ success: false, message: "Transaction failed" });

    // Retrieve ticket details to get show_id and quantity to release seats
    db.query("SELECT * FROM tickets WHERE id = ?", [ticketId], (err, results) => {
      if (err || !results.length) {
        return db.rollback(() => res.json({ success: false, message: "Ticket not found" }));
      }

      const ticket = results[0];

      // Release reserved seats
      db.query(
        "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
        [ticket.quantity, ticket.show_id],
        (releaseErr) => {
          if (releaseErr) {
            return db.rollback(() => res.json({ success: false, message: "Failed to release seats" }));
          }

          // Mark ticket as cancelled
          db.query("UPDATE tickets SET status = 'cancelled' WHERE id = ?", [ticketId], (updateErr) => {
            if (updateErr) {
              return db.rollback(() => res.json({ success: false, message: "Failed to update ticket status" }));
            }

            db.query(
              "UPDATE payments SET status = 'Cancelled' WHERE ticket_id = ? AND status = 'Pending Payment'",
              [ticketId],
              () => {
                db.commit(() => {
                  res.json({ success: true, status: "cancelled", message: "Payment status set to cancelled, seats released" });
                });
              }
            );
          });
        }
      );
    });
  });
}

// ==========================================
// 5. GET PAYMENT STATUS
// ==========================================
export function getStatus(req, res) {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.json({ success: false, message: "bookingId required" });
  }

  db.query(
    `SELECT t.*, p.razorpay_order_id, p.razorpay_payment_id, p.status AS payment_status 
     FROM tickets t 
     LEFT JOIN payments p ON t.id = p.ticket_id 
     WHERE t.booking_code = ? OR t.id = ? 
     ORDER BY p.created_at DESC LIMIT 1`,
    [bookingId, bookingId],
    (err, results) => {
      if (err || !results.length) {
        return res.json({ success: false, message: "Booking not found" });
      }

      const ticket = results[0];

      res.json({
        success: true,
        status: ticket.status,
        bookingCode: ticket.booking_code,
        ticketId: ticket.id,
        pdfUrl: ticket.pdf_path ? `${process.env.BASE_URL || "http://localhost:5000"}${ticket.pdf_path}` : null,
        paymentStatus: ticket.payment_status || null,
      });
    }
  );
}