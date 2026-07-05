// backend/controllers/ticketController.js
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { db } from "../config/db.js";

// Helper to convert QR Data URL to Uint8Array
function dataURLToUint8Array(dataURL) {
  const base64 = dataURL.split(",")[1];
  return new Uint8Array(Buffer.from(base64, "base64"));
}

// ===============================
// CREATE TICKET PDF
// ===============================
export async function createTicketPdf(booking) {
  const {
    bookingId,
    showName,
    date,
    time,
    purchaserName,
    purchaserEmail,
    quantity,
    pricePerTicket,
    totalPrice,
    venue = "City Museum",
    seatInfo = "General Admission",
  } = booking;

  const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
  const verifyUrl = `${BASE_URL.replace(/\/$/, "")}/verify?bookingId=${encodeURIComponent(bookingId)}`;

  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([540, 780]);
  const { width, height } = page.getSize();

  // Fonts (ensure fonts folder is directly in backend/)
  const fontsDir = path.join(process.cwd(), "fonts"); // backend/fonts
  if (!fs.existsSync(fontsDir)) throw new Error("Fonts folder not found in backend/fonts");

  const fontRegular = await pdfDoc.embedFont(
    fs.readFileSync(path.join(fontsDir, "NotoSans-Regular.ttf"))
  );
  const fontBold = await pdfDoc.embedFont(
    fs.readFileSync(path.join(fontsDir, "NotoSans-Bold.ttf"))
  );

  const dark = rgb(0.07, 0.09, 0.11);
  const accent = rgb(0.02, 0.58, 0.54);

  // Background card
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.9, 0.92, 0.94),
    borderWidth: 1,
  });

  // Header
  page.drawText(venue, { x: 40, y: height - 60, size: 20, font: fontBold, color: dark });
  page.drawText("Admission Ticket", { x: 40, y: height - 85, size: 12, font: fontRegular, color: rgb(0.4,0.45,0.5) });
  page.drawText(showName, { x: 40, y: height - 120, size: 18, font: fontBold, color: dark });

  // Ticket details
  let y = height - 160;
  const gap = 18;
  page.drawText(`Date: ${date}`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap;
  page.drawText(`Time: ${time}`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap;
  page.drawText(`Seat: ${seatInfo}`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap;
  page.drawText(`Quantity: ${quantity}`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap;
  page.drawText(`Price per ticket: ₹${pricePerTicket}`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap;
  page.drawText(`Total: ₹${totalPrice}`, { x: 40, y, size: 12, font: fontBold, color: accent }); y -= gap + 5;
  page.drawText(`Purchaser: ${purchaserName} (${purchaserEmail})`, { x: 40, y, size: 11, font: fontRegular, color: dark }); y -= gap + 5;
  page.drawText(`Booking ID: ${bookingId}`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.35,0.38,0.42) });

  // QR Code
  const qrBytes = dataURLToUint8Array(qrDataUrl);
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrDims = qrImage.scale(0.8);
  page.drawImage(qrImage, { x: width - 40 - qrDims.width, y: height - 300, width: qrDims.width, height: qrDims.height });
  page.drawText("Scan to verify", { x: width - 40 - qrDims.width, y: height - 315, size: 9, font: fontRegular, color: rgb(0.45,0.48,0.5) });

  // Save PDF
  const TICKETS_DIR = path.join(process.cwd(), "tickets"); // backend/tickets (served by Express)
  if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR, { recursive: true });

  const filename = `ticket_${bookingId}.pdf`;
  const filepath = path.join(TICKETS_DIR, filename);
  await fs.promises.writeFile(filepath, await pdfDoc.save());

  // Return path for API
  return { filename, filepath, webPath: `/tickets/${filename}` };
}

// ===============================
// GET MY TICKETS
// ===============================
export function getMyTickets(req, res) {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

  const sql = `
    SELECT t.id, t.booking_code, t.pdf_path, t.quantity, t.booking_date, t.status,
           s.id AS show_id, s.name AS show_name, s.day_of_week, s.start_time, s.price,
           p.status AS payment_status
    FROM tickets t
    LEFT JOIN shows s ON t.show_id = s.id
    LEFT JOIN payments p ON t.id = p.ticket_id
    WHERE t.user_id = ?
    ORDER BY t.booking_date DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });

    const tickets = results.map((r) => ({
      id: r.id,
      bookingCode: r.booking_code,
      pdfUrl: r.pdf_path ? `${process.env.BASE_URL || "http://localhost:5000"}${r.pdf_path}` : null,
      quantity: r.quantity,
      bookingDate: r.booking_date,
      showId: r.show_id,
      showName: r.show_name,
      day: r.day_of_week,
      time: r.start_time ? r.start_time.slice(0, 5) : null,
      pricePerTicket: r.price || 0,
      totalPrice: (r.price || 0) * r.quantity,
      status: r.status,
      paymentStatus: r.payment_status,
    }));

    res.json({ success: true, tickets });
  });
}
