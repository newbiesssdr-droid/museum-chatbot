import express from "express";
import { 
  addShow, 
  updateShow, 
  deleteShow, 
  getShows,
  getPendingBookings,
  approveBooking,
  declineBooking
} from "../controllers/adminController.js";

const router = express.Router();

// CRUD routes for shows
router.get("/shows", getShows);
router.post("/add-show", addShow);
router.put("/update-show/:id", updateShow);
router.delete("/delete-show/:id", deleteShow);

// Admin approval workflow routes
router.get("/bookings", getPendingBookings);
router.post("/approve", approveBooking);
router.post("/decline", declineBooking);

export default router;
