// server.js

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

/*
=========================================
MIDDLEWARE
=========================================
*/
app.use(cors());
app.use(express.json());

/*
=========================================
CONFIGURATION
=========================================
*/

// 🔐 Move these to ENV in production
const ONESIGNAL_APP_ID = "52875f54-3c4d-457e-93e8-301f06d486c1";
const ONESIGNAL_REST_API_KEY =
  "os_v2_app_kkdv6vb4jvcx5e7igapqnvegyh62y2gtcfhuinup2gx6m75s62s2wq2p5nbrlnd6lk2jfu67xlmlwwsceunrsa3fo3ncwzsexvrlzpy";

/*
=========================================
ROOT CHECK
=========================================
*/
app.get("/", (req, res) => {
  res.send("Mangalam Backend Running ✅");
});

/*
=========================================
HEALTH CHECK (Render / uptime monitor)
=========================================
*/
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    serverTime: new Date(),
  });
});

/*
=========================================
SEND PUSH TO DOCTORS
=========================================
*/
async function sendDoctorNotification(patientName, category) {
  try {
    console.log("📡 Sending push to doctors...");

    const payload = {
      app_id: ONESIGNAL_APP_ID,

      // ⭐ Only doctor devices
      filters: [
        {
          field: "tag",
          key: "role",
          relation: "=",
          value: "doctor",
        },
      ],

      headings: {
        en: "New Appointment Booked",
      },

      contents: {
        en: `New appointment from ${patientName} (${category})`,
      },

      data: {
        screen: "doctorDashboard",
      },
    };

    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        timeout: 8000,
        headers: {
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ OneSignal success:", response.data.id);
    return true;
  } catch (err) {
    console.log("❌ OneSignal error:");
    console.log(err.response?.data || err.message);
    return false;
  }
}

/*
=========================================
TEST PUSH API (for debugging)
=========================================
*/
app.get("/test-push", async (req, res) => {
  const sent = await sendDoctorNotification("Test Patient", "ECG");

  res.json({
    success: sent,
    message: sent ? "Push sent" : "Push failed",
  });
});

/*
=========================================
BOOK APPOINTMENT API
=========================================
*/
app.post("/book-appointment", async (req, res) => {
  try {
    console.log("🔥 API HIT");
    console.log("📦 Body:", req.body);

    const { patientName, category } = req.body;

    if (!patientName) {
      return res.status(400).json({
        success: false,
        message: "patientName required",
      });
    }

    /*
    =============================
    SAVE DATABASE (future)
    =============================
    */
    console.log("📌 Appointment saved:", patientName, category);

    /*
    =============================
    SEND PUSH (NON BLOCKING)
    =============================
    */
    sendDoctorNotification(patientName, category)
      .then((ok) => console.log("📨 Push result:", ok))
      .catch((e) => console.log("Push async error:", e));

    return res.json({
      success: true,
      message: "Appointment booked",
    });
  } catch (error) {
    console.log("❌ Server error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/*
=========================================
START SERVER
=========================================
*/
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
