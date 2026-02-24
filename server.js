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
CONFIG (ONLY ENV VARIABLES)
=========================================
*/
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/*
=========================================
STARTUP VALIDATION
=========================================
*/
if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
  console.error("❌ Missing OneSignal ENV variables");
  console.error("Please set:");
  console.error("ONESIGNAL_APP_ID");
  console.error("ONESIGNAL_REST_API_KEY");
}

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
HEALTH CHECK
=========================================
*/
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date(),
  });
});

/*
=========================================
🔥 SEND PUSH TO DOCTORS
=========================================
*/
async function sendDoctorNotification(
  patientName,
  category,
  date = "",
  time = ""
) {
  try {
    console.log("📡 Sending push to doctors...");

    // ✅ CATEGORY FORMAT FIX
    function formatCategory(cat) {
      if (!cat) return "General";

      const map = {
        bookDoctor: "Doctor",
        xray: "X-Ray",
        ecg: "ECG",
        call: "Call",
      };

      return map[cat] || cat;
    }

    const formattedCategory = formatCategory(category);

    const payload = {
      app_id: ONESIGNAL_APP_ID,

      filters: [
        {
          field: "tag",
          key: "role",
          relation: "=",
          value: "doctor",
        },
      ],

      // ✅ Proper Title
      headings: {
        en: `New ${formattedCategory} appointment booked`,
      },

      contents: {
        en:
          `Patient: ${patientName}` +
          (date ? `\nDate: ${date}` : "") +
          (time ? `\nTime: ${time}` : ""),
      },

      data: {
        screen: "doctorDashboard",
        patientName,
        category: formattedCategory,
        date,
        time,
      },

      android_sound: "notification",
      small_icon: "ic_stat_onesignal_default",
    };

    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        timeout: 10000,
        headers: {
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Push sent:", response.data.id);
    return true;

  } catch (err) {
    console.log("❌ OneSignal Error:");
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Data:", err.response.data);
    } else {
      console.log(err.message);
    }
    return false;
  }
}

/*
=========================================
🧪 TEST PUSH API
=========================================
*/
app.get("/test-push", async (req, res) => {
  console.log("🧪 TEST PUSH API HIT");

  const success = await sendDoctorNotification(
    "Test Patient",
    "ECG",
    "24 Feb 2026",
    "10:30 AM"
  );

  res.json({
    success,
    message: success ? "Test push sent" : "Push failed",
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

    const { patientName, category, date, time } = req.body;

    if (!patientName) {
      return res.status(400).json({
        success: false,
        message: "patientName required",
      });
    }

    console.log("📌 Appointment saved:", patientName, category);

    // non-blocking push
    sendDoctorNotification(patientName, category, date, time)
      .then((ok) => console.log("📨 Push result:", ok))
      .catch((e) => console.log("Push error:", e));

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
