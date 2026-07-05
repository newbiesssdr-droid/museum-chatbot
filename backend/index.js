import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import showRoutes from "./routes/showRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import cancelRoutes from "./routes/cancelRoutes.js";
import dialogflowRoutes from "./routes/dialogflowRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import verifyRoutes from "./routes/verifyRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import { startExpirationChecker } from "./controllers/bookingController.js";

// Start background expiration task
startExpirationChecker();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve ticket PDFs
app.use("/tickets", express.static(path.join(__dirname, "tickets")));

// routes
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dialogflow", dialogflowRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/my-tickets", ticketRoutes);
app.use("/verify", verifyRoutes);
app.use("/api/cancel", cancelRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/payment", paymentRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on port ${PORT}`)
);
