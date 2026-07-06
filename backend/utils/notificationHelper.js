import { db } from "../config/db.js";

/**
 * Failure-isolated, duplicate-proof notification creator helper.
 * Performs a secondary notification action that will never throw or crash the primary action.
 */
export function createNotification({ userId, ticketId, bookingCode, type, message }) {
  if (!userId || !ticketId || !bookingCode || !type || !message) {
    console.error("❌ Missing required fields for createNotification");
    return;
  }

  const eventKey = `${type}:${ticketId}`;
  const sql = `
    INSERT INTO notifications (user_id, ticket_id, booking_code, type, message, event_key)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE id = id
  `;

  db.query(sql, [userId, ticketId, bookingCode, type, message, eventKey], (err) => {
    if (err) {
      console.error("❌ Notification creation failed (Secondary Action):", err);
    } else {
      console.log(`✅ Notification created: ${type} for ticket ${ticketId}`);
    }
  });
}
