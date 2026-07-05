// routes/paymentRoutes.js
import express from "express";
import {
  createPayment,
  verifyPayment,
  failPayment,
  cancelPayment,
  getStatus,
} from "../controllers/paymentController.js";

const router = express.Router();

// Compatibility mapping
router.post("/create", createPayment);

// Razorpay Payment Flow mapping
router.post("/create-order", createPayment);
router.post("/verify", verifyPayment);
router.post("/fail", failPayment);
router.post("/cancel", cancelPayment);
router.get("/status/:bookingId", getStatus);

export default router;