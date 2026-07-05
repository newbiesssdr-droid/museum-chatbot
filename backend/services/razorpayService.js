import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn("⚠️ WARNING: RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET are missing from environment variables. Razorpay service running in unconfigured mode.");
}

const razorpay = new Razorpay({
  key_id: keyId || "rzp_test_placeholder",
  key_secret: keySecret || "placeholder_secret",
});

export default razorpay;
