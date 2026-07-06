import { db } from "../config/db.js";

// GET /api/notifications
export function getNotifications(req, res) {
  const userId = req.user.uid;

  const sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Failed to fetch notifications:", err);
      return res.status(500).json({ success: false, message: "Database query failed" });
    }
    res.json({ success: true, notifications: results });
  });
}

// GET /api/notifications/unread-count
export function getUnreadCount(req, res) {
  const userId = req.user.uid;

  const sql = "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Failed to fetch unread count:", err);
      return res.status(500).json({ success: false, message: "Database query failed" });
    }
    const count = results[0]?.count || 0;
    res.json({ success: true, count });
  });
}

// PUT /api/notifications/:id/read
export function markAsRead(req, res) {
  const userId = req.user.uid;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "Notification ID required" });
  }

  const sql = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?";
  db.query(sql, [id, userId], (err, result) => {
    if (err) {
      console.error("❌ Failed to update notification read state:", err);
      return res.status(500).json({ success: false, message: "Database query failed" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notification not found or unauthorized" });
    }
    res.json({ success: true, message: "Notification marked as read" });
  });
}

// PUT /api/notifications/read-all
export function markAllAsRead(req, res) {
  const userId = req.user.uid;

  const sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
  db.query(sql, [userId], (err) => {
    if (err) {
      console.error("❌ Failed to mark all notifications as read:", err);
      return res.status(500).json({ success: false, message: "Database query failed" });
    }
    res.json({ success: true, message: "All notifications marked as read" });
  });
}
