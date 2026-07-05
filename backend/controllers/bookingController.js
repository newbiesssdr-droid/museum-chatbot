// bookingController.js
import { db } from "../config/db.js";
import { createTicketPdf } from "./ticketController.js";
import { generateBookingCode } from "../utils/bookingHelper.js";

// ===============================
// 🟡 STEP 1: CREATE PENDING BOOKING (With Transactions & Seat Reservation)
// ===============================
export function createPendingBooking(req, res) {
  const {
    showId,
    quantity,
    userId = "guest_user",
    purchaserName,
    purchaserEmail,
  } = req.body;

  if (!showId || !quantity) {
    return res.json({
      success: false,
      message: "Show ID & quantity required",
    });
  }

  // Start MySQL Transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("❌ Transaction start error:", err);
      return res.json({ success: false, message: "Database transaction failed" });
    }

    // Lock the show row to prevent race conditions
    db.query("SELECT * FROM shows WHERE id = ? FOR UPDATE", [showId], (selectErr, results) => {
      if (selectErr || !results.length) {
        return db.rollback(() => {
          res.json({ success: false, message: "Show not found" });
        });
      }

      const show = results[0];

      if (show.available_tickets < quantity) {
        return db.rollback(() => {
          res.json({
            success: false,
            message: "Not enough tickets available",
          });
        });
      }

      const bookingCode = generateBookingCode();
      const totalPrice = show.price * quantity;

      // 1. Reserve seats immediately by deducting them
      db.query(
        "UPDATE shows SET available_tickets = available_tickets - ? WHERE id = ?",
        [quantity, showId],
        (deductErr) => {
          if (deductErr) {
            return db.rollback(() => {
              console.error("❌ Seat reservation error:", deductErr);
              res.json({ success: false, message: "Failed to reserve seats" });
            });
          }

          // 2. Insert the pending booking
          db.query(
            `INSERT INTO tickets 
             (user_id, show_id, quantity, booking_date, purchaser_name, purchaser_email, booking_code, status)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              userId,
              showId,
              quantity,
              new Date(),
              purchaserName || userId,
              purchaserEmail || "guest@example.com",
              bookingCode,
              "pending",
            ],
            (insertErr, result) => {
              if (insertErr) {
                return db.rollback(() => {
                  console.error("❌ Insert ticket error:", insertErr);
                  res.json({ success: false, message: "Failed to create booking" });
                });
              }

              // Commit Transaction
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error("❌ Commit error:", commitErr);
                    res.json({ success: false, message: "Failed to commit booking" });
                  });
                }

                return res.json({
                  success: true,
                  ticketId: result.insertId,
                  bookingCode,
                  showName: show.name,
                  quantity,
                  totalPrice,
                  message: "Proceed to payment",
                });
              });
            }
          );
        }
      );
    });
  });
}

// ===============================
// 🟢 STEP 2: CONFIRM BOOKING (Compatibility Flow)
// ===============================
export function confirmBooking(req, res) {
  const { ticketId, paymentStatus } = req.body;

  if (!ticketId) {
    return res.json({
      success: false,
      message: "Missing ticketId",
    });
  }

  // Handle failure state (release seats)
  if (paymentStatus !== "success") {
    db.beginTransaction((txErr) => {
      if (txErr) return res.json({ success: false, message: "Transaction failed" });

      db.query("SELECT * FROM tickets WHERE id = ?", [ticketId], (err, results) => {
        if (err || !results.length) {
          return db.rollback(() => res.json({ success: false, message: "Booking not found" }));
        }

        const booking = results[0];

        // Release seats if it was previously pending
        if (booking.status === "pending") {
          db.query(
            "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
            [booking.quantity, booking.show_id],
            (releaseErr) => {
              if (releaseErr) {
                return db.rollback(() => res.json({ success: false, message: "Failed to release seats" }));
              }
              db.query("UPDATE tickets SET status='failed' WHERE id=?", [ticketId], (updateErr) => {
                if (updateErr) {
                  return db.rollback(() => res.json({ success: false, message: "Failed to update booking" }));
                }
                db.commit((commitErr) => {
                  if (commitErr) return db.rollback(() => res.json({ success: false, message: "Commit failed" }));
                  return res.json({ success: false, message: "Payment failed, seats released" });
                });
              });
            }
          );
        } else {
          db.query("UPDATE tickets SET status='failed' WHERE id=?", [ticketId], (updateErr) => {
            if (updateErr) return db.rollback(() => res.json({ success: false }));
            db.commit(() => res.json({ success: false, message: "Payment failed" }));
          });
        }
      });
    });
    return;
  }

  db.beginTransaction((txErr) => {
    if (txErr) return res.json({ success: false, message: "Transaction failed" });

    db.query(
      `SELECT t.*, s.name, s.day_of_week, s.start_time, s.price, s.available_tickets
       FROM tickets t
       JOIN shows s ON t.show_id = s.id
       WHERE t.id=?`,
      [ticketId],
      (err, results) => {
        if (err || !results.length) {
          return db.rollback(() => res.json({ success: false, message: "Booking not found" }));
        }

        const booking = results[0];
        const wasPending = (booking.status === "pending");

        // If it wasn't pending, check if we need to deduct seats now
        if (!wasPending && booking.available_tickets < booking.quantity) {
          return db.rollback(() => res.json({ success: false, message: "Tickets sold out" }));
        }

        const proceedConfirm = () => {
          const totalPrice = booking.price * booking.quantity;
          const bookingInfo = {
            bookingId: booking.booking_code,
            showName: booking.name,
            date: booking.day_of_week,
            time: booking.start_time ? booking.start_time.slice(0, 5) : "",
            purchaserName: booking.purchaser_name,
            purchaserEmail: booking.purchaser_email,
            quantity: booking.quantity,
            pricePerTicket: booking.price,
            totalPrice,
          };

          createTicketPdf(bookingInfo)
            .then(({ webPath }) => {
              db.query(
                "UPDATE tickets SET status='confirmed', pdf_path=? WHERE id=?",
                [webPath, ticketId],
                (updateErr) => {
                  if (updateErr) {
                    return db.rollback(() => res.json({ success: false, message: "Database update failed" }));
                  }
                  db.commit((commitErr) => {
                    if (commitErr) {
                      return db.rollback(() => res.json({ success: false, message: "Commit failed" }));
                    }
                    res.json({
                      success: true,
                      message: "Booking confirmed",
                      pdfUrl: `${process.env.BASE_URL || "http://localhost:5000"}${webPath}`,
                    });
                  });
                }
              );
            })
            .catch((pdfErr) => {
              console.error(pdfErr);
              db.rollback(() => res.json({ success: false, message: "PDF generation failed" }));
            });
        };

        if (!wasPending) {
          // Deduct seats now if not already deducted
          db.query(
            "UPDATE shows SET available_tickets = available_tickets - ? WHERE id=?",
            [booking.quantity, booking.show_id],
            (deductErr) => {
              if (deductErr) {
                return db.rollback(() => res.json({ success: false, message: "Failed to deduct seats" }));
              }
              proceedConfirm();
            }
          );
        } else {
          proceedConfirm();
        }
      }
    );
  });
}

// ===============================
// ⏰ PAYMENT EXPIRATION BACKGROUND CHECKER (10-Minute Timeout)
// ===============================
export function startExpirationChecker() {
  console.log("⏰ Starting background payment expiration checker (10-minute timeout)...");
  
  setInterval(() => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    db.query(
      `SELECT id, show_id, quantity, booking_code 
       FROM tickets 
       WHERE status = 'pending' AND booking_date < ?`,
      [tenMinutesAgo],
      (err, expiredTickets) => {
        if (err) {
          console.error("❌ Expiration check query failed:", err);
          return;
        }

        if (expiredTickets.length === 0) return;

        console.log(`⏰ Expiration Cron: Found ${expiredTickets.length} expired bookings. Releasing seats...`);

        expiredTickets.forEach((ticket) => {
          db.beginTransaction((txErr) => {
            if (txErr) {
              console.error(`❌ Transaction failed to start for ticket ${ticket.id} expiration:`, txErr);
              return;
            }

            // 1. Release the reserved seats
            db.query(
              "UPDATE shows SET available_tickets = available_tickets + ? WHERE id = ?",
              [ticket.quantity, ticket.show_id],
              (releaseErr) => {
                if (releaseErr) {
                  return db.rollback(() => {
                    console.error(`❌ Failed to release seats for expired ticket ${ticket.id}:`, releaseErr);
                  });
                }

                // 2. Mark ticket status as 'failed'
                db.query(
                  "UPDATE tickets SET status = 'failed' WHERE id = ?",
                  [ticket.id],
                  (updateTicketErr) => {
                    if (updateTicketErr) {
                      return db.rollback(() => {
                        console.error(`❌ Failed to set status to failed for ticket ${ticket.id}:`, updateTicketErr);
                      });
                    }

                    // 3. Mark payment status as 'Expired' (if payment record exists)
                    db.query(
                      "UPDATE payments SET status = 'Expired' WHERE ticket_id = ?",
                      [ticket.id],
                      (updatePaymentErr) => {
                        db.commit((commitErr) => {
                          if (commitErr) {
                            return db.rollback(() => {
                              console.error(`❌ Commit failed for expired ticket ${ticket.id}:`, commitErr);
                            });
                          }
                          console.log(`✅ Ticket ${ticket.booking_code} (ID: ${ticket.id}) expired. Seats released.`);
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        });
      }
    );
  }, 60000); // Run every 60 seconds
}