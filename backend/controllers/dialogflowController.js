import { v4 as uuidv4 } from "uuid";
import { sessionClient, projectId } from "../config/dialogflow.js";
import { db } from "../config/db.js";
import { generateBookingCode } from "../utils/bookingHelper.js";

export async function handleDialogflow(req, res) {
  let { message, sessionId, userId } = req.body;
  if (!sessionId) sessionId = uuidv4();
  if (!userId) userId = "guest_user";

  // Regex to extract booking code directly from message (e.g. BKG-E25B7B)
  const codeMatch = message.match(/BKG-(?:\d{14}|[A-Z0-9]{6})/i);
  if (codeMatch) {
    const bookingCode = codeMatch[0].toUpperCase();
    
    db.query(
      `SELECT t.*, s.name 
       FROM tickets t 
       JOIN shows s ON t.show_id = s.id 
       WHERE t.booking_code = ?`,
      [bookingCode],
      (err, results) => {
        if (err || !results.length) {
          return res.json({ reply: `Booking ${bookingCode} not found.` });
        }

        const ticket = results[0];
        if (ticket.status === "confirmed") {
          const pdfUrl = `${process.env.BASE_URL || "http://localhost:5000"}${ticket.pdf_path}`;
          return res.json({
            reply: `Here is your confirmed ticket for ${ticket.name} (Qty: ${ticket.quantity}).`,
            options: [
              {
                id: ticket.id,
                name: ticket.name,
                pdfUrl,
              },
            ],
          });
        } else {
          return res.json({
            reply: "Your ticket is not available because payment has not been completed.",
          });
        }
      }
    );
    return;
  }

  try {
    const sessionPath =
      sessionClient.projectAgentSessionPath(projectId, sessionId);

    const [response] = await sessionClient.detectIntent({
      session: sessionPath,
      queryInput: {
        text: { text: message, languageCode: "en-US" },
      },
    });

    const intent = response.queryResult.intent?.displayName;
    const action = response.queryResult.action;
    const fulfillmentText = response.queryResult.fulfillmentText;

    // ==========================================
    // 1. Intercept "payment_required" from Dialogflow
    // ==========================================
    if (action === "payment_required") {
      const showNameParam = response.queryResult.parameters?.fields?.show?.stringValue ||
                            response.queryResult.parameters?.fields?.museum?.stringValue;
      const quantityParam = response.queryResult.parameters?.fields?.quantity?.numberValue ||
                            response.queryResult.parameters?.fields?.tickets?.numberValue || 1;

      if (!showNameParam) {
        return res.json({ reply: "Please specify which museum or show you want to book." });
      }

      // Find matching show
      db.query(
        "SELECT * FROM shows WHERE LOWER(name) LIKE LOWER(?) LIMIT 1",
        [`%${showNameParam}%`],
        (err, results) => {
          if (err || !results.length) {
            return res.json({ reply: `Sorry, I couldn't find a show matching "${showNameParam}".` });
          }

          const show = results[0];
          const qty = parseInt(quantityParam) || 1;

          // Transactionally create pending booking and deduct tickets
          db.beginTransaction((txErr) => {
            if (txErr) return res.json({ reply: "Database error during booking." });

            db.query(
              "SELECT available_tickets FROM shows WHERE id = ? FOR UPDATE",
              [show.id],
              (selectErr, selectResults) => {
                if (selectErr || !selectResults.length) {
                  return db.rollback(() => res.json({ reply: "Show not found." }));
                }

                const currentShow = selectResults[0];
                if (currentShow.available_tickets < qty) {
                  return db.rollback(() => res.json({ reply: `Sorry, there are only ${currentShow.available_tickets} tickets available for ${show.name}.` }));
                }

                const bookingCode = generateBookingCode();
                const totalPrice = show.price * qty;

                // Deduct seats immediately
                db.query(
                  "UPDATE shows SET available_tickets = available_tickets - ? WHERE id = ?",
                  [qty, show.id],
                  (deductErr) => {
                    if (deductErr) {
                      return db.rollback(() => res.json({ reply: "Seat reservation failed." }));
                    }

                    // Insert pending ticket
                    db.query(
                      `INSERT INTO tickets 
                       (user_id, show_id, quantity, booking_date, purchaser_name, purchaser_email, booking_code, status)
                       VALUES (?,?,?,?,?,?,?,?)`,
                      [
                        userId,
                        show.id,
                        qty,
                        new Date(),
                        userId,
                        "guest@example.com",
                        bookingCode,
                        "pending",
                      ],
                      (insertErr, insertResult) => {
                        if (insertErr) {
                          return db.rollback(() => res.json({ reply: "Booking insertion failed." }));
                        }

                        db.commit((commitErr) => {
                          if (commitErr) {
                            return db.rollback(() => res.json({ reply: "Commit booking failed." }));
                          }

                          return res.json({
                            reply: `Your booking has been created.\n\nBooking ID: ${bookingCode}\n\nMuseum:\n${show.name}\n\nVisitors:\n${qty}\n\nAmount:\n₹${totalPrice}\n\nPlease complete payment to confirm your booking.`,
                            action: "payment_required",
                            paymentInfo: {
                              ticketId: insertResult.insertId,
                              amount: totalPrice,
                              bookingCode,
                              showName: show.name,
                              quantity: qty,
                            },
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
      return;
    }

    // ==========================================
    // 2. Existing "Book Tickets by Date"
    // ==========================================
    if (intent === "Book Tickets by Date") {
      const date =
        response.queryResult.parameters?.fields?.date?.stringValue;

      if (!date)
        return res.json({ reply: "Please tell me the date." });

      const day = new Date(date).toLocaleString("en-US", {
        weekday: "long",
      });

      db.query(
        `SELECT * FROM shows WHERE LOWER(day_of_week)=LOWER(?)`,
        [day],
        (err, results) => {
          if (err || !results.length)
            return res.json({ reply: `No shows on ${day}` });

          res.json({
            reply: `Shows available on ${day}:`,
            options: results,
          });
        }
      );
      return;
    }

    // Handle generic ticket download intents if parameters specify a booking code
    const bookingCodeParam = response.queryResult.parameters?.fields?.bookingCode?.stringValue ||
                             response.queryResult.parameters?.fields?.bookingId?.stringValue;
    if (bookingCodeParam) {
      const bookingCode = bookingCodeParam.toUpperCase();
      db.query(
        `SELECT t.*, s.name 
         FROM tickets t 
         JOIN shows s ON t.show_id = s.id 
         WHERE t.booking_code = ?`,
        [bookingCode],
        (err, results) => {
          if (err || !results.length) {
            return res.json({ reply: `Booking ${bookingCode} not found.` });
          }

          const ticket = results[0];
          if (ticket.status === "confirmed") {
            const pdfUrl = `${process.env.BASE_URL || "http://localhost:5000"}${ticket.pdf_path}`;
            return res.json({
              reply: `Here is your confirmed ticket for ${ticket.name} (Qty: ${ticket.quantity}).`,
              options: [
                {
                  id: ticket.id,
                  name: ticket.name,
                  pdfUrl,
                },
              ],
            });
          } else {
            return res.json({
              reply: "Your ticket is not available because payment has not been completed.",
            });
          }
        }
      );
      return;
    }

    res.json({ reply: fulfillmentText, action });
  } catch (err) {
    console.error("Dialogflow error:", err);
    res.status(500).json({ reply: "Dialogflow failed" });
  }
}
