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

const ONESIGNAL_APP_ID = "52875f54-3c4d-457e-93e8-301f06d486c1";

// ⚠️ Dashboard → Settings → Keys & IDs → REST API Key
const ONESIGNAL_REST_API_KEY =
  "os_v2_app_kkdv6vb4jvcx5e7igapqnvegyh62y2gtcfhuinup2gx6m75s62s2wq2p5nbrlnd6lk2jfu67xlmlwwsceunrsa3fo3ncwzsexvrlzpy";

/*
=========================================
ROOT CHECK (Browser test)
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
  res.json({ status: "OK" });
});

/*
=========================================
SEND PUSH TO DOCTORS (SAFE VERSION)
=========================================
*/
async function sendDoctorNotification(patientName, category) {
  try {
    console.log("📡 Sending push to doctors...");

    const response = await axios({
      method: "post",
      url: "https://onesignal.com/api/v1/notifications",
      timeout: 5000, // ⭐ prevents hanging request
      headers: {
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        app_id: ONESIGNAL_APP_ID,

        // Only doctor devices
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
      },
    });

    console.log("✅ Notification sent:", response.data);
    return true;
  } catch (err) {
    console.log("❌ OneSignal Error:");
    console.log(err.response?.data || err.message);
    return false;
  }
}

/*
=========================================
BOOK APPOINTMENT API
=========================================
*/
app.post("/book-appointment", async (req, res) => {
  try {
    console.log("🔥 API HIT");
    console.log("Body:", req.body);

    const { patientName, category } = req.body;

    if (!patientName) {
      return res.status(400).json({
        success: false,
        message: "patientName required",
      });
    }

    /*
    =============================
    TODO: Save to database later
    =============================
    */
    console.log("📌 Appointment saved:", patientName, category);

    /*
    =============================
    SEND PUSH (non blocking)
    =============================
    */
    sendDoctorNotification(patientName, category);

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
const PORT = 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});