import mysql from "mysql2";

export const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ||"MyNewPass@127",
  database: process.env.DB_NAME || "museum_db"
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
    
    // Auto-migrate tables
    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        amount DECIMAL(7,2) NOT NULL,
        razorpay_order_id VARCHAR(255) UNIQUE,
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending Payment',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;

    db.query(createPaymentsTable, (tableErr) => {
      if (tableErr) {
        console.error("❌ Error ensuring payments table exists:", tableErr);
      } else {
        console.log("✅ Database schema verified / payments table ensured");

        const createNotificationsTable = `
          CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            ticket_id INT NOT NULL,
            booking_code VARCHAR(64) NOT NULL,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            event_key VARCHAR(128) NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_notification_event (event_key)
          ) ENGINE=InnoDB;
        `;

        db.query(createNotificationsTable, (notifErr) => {
          if (notifErr) {
            console.error("❌ Error ensuring notifications table exists:", notifErr);
          } else {
            console.log("✅ Notifications table ensured");
          }
        });
      }
    });
  }
});

