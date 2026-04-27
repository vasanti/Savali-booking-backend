import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";
import Razorpay from "razorpay";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: "https://savalibhor.netlify.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ==============================
// 🔑 RAZORPAY
// ==============================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==============================
// ROOT
// ==============================
app.get("/", (req, res) => {
  res.send("Server running");
});

// ==============================
// CREATE ORDER
// ==============================
app.post("/api/create-order", async (req, res) => {

  const { amount } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    });

    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order failed" });
  }
});

// ==============================
// VERIFY PAYMENT
// ==============================
app.post("/api/verify-payment", async (req, res) => {

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingData
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  // ✅ SEND TO GOOGLE CALENDAR
  await fetch(process.env.GOOGLE_URL, {
    method: "POST",
    body: JSON.stringify({
      ...bookingData,
      payment_id: razorpay_payment_id
    })
  });

  res.json({ success: true });
});

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});