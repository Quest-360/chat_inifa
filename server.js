/* Deloitte Careers Demo Assistant — Dialogflow ES Webhook
   Endpoint: POST /df-webhook
   Notes:
   - Routes by intent.displayName (ES). Also supports CX tag if present.
   - Returns simple text messages (fulfillmentText). Safe for demo.
*/

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TZ = process.env.TZ || "Asia/Kolkata";
process.env.TZ = TZ;

// Helpers
const pad = (n) => (n < 10 ? "0" + n : "" + n);

function toISTISO(d) {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  const sec = pad(d.getSeconds());
  return `${year}-${month}-${day}T${hour}:${min}:${sec}+05:30`;
}

function nextSlots() {
  const now = new Date();
  const d1 = new Date(now.getTime()); d1.setHours(11,0,0,0);
  const d2 = new Date(now.getTime()); d2.setHours(15,0,0,0);
  const d3 = new Date(now.getTime() + 24*60*60*1000); d3.setHours(10,30,0,0);
  return [toISTISO(d1), toISTISO(d2), toISTISO(d3)];
}

function mockRoles(practice, location) {
  const p = practice || "Consulting";
  const loc = location || "Bengaluru";
  return [
    { title: `${p} Analyst (Campus)`, location: loc, reqId: "R-CA-1001", applyUrl: "https://careers.example.com/apply/R-CA-1001" },
    { title: `${p} Business Analyst`, location: loc, reqId: "R-BA-2033", applyUrl: "https://careers.example.com/apply/R-BA-2033" },
    { title: `${p} Associate`, location: loc, reqId: "R-AS-3177", applyUrl: "https://careers.example.com/apply/R-AS-3177" }
  ];
}

function parseYear(gradYearParam) {
  if (!gradYearParam) return null;
  const s = String(gradYearParam);
  const m = s.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function eligibility(degree, gradYearParam, expYearsParam) {
  const goodDegrees = new Set(["BTech","BE","CA","MBA","MTech","MCA"]);
  const year = parseYear(gradYearParam);
  const exp = typeof expYearsParam === "number" ? expYearsParam : parseFloat(expYearsParam || "0");
  const currentYear = new Date().getFullYear();

  let score = 0;
  if (degree && goodDegrees.has(String(degree))) score += 1;
  if (year && year >= currentYear - 2) score += 1;
  if (!isNaN(exp) && exp >= 1) score += 1;

  if (score >= 2) return "Likely eligible";
  if (score === 1) return "Borderline";
  return "Not eligible (demo heuristic)";
}

const statuses = ["Received", "Under Review", "Interview Scheduled", "Offer in Progress"];

function textResponse(res, text) {
  res.json({
    fulfillmentText: text,
    source: "deloitte-careers-demo-webhook"
  });
}

app.get("/", (_req, res) => res.send("Deloitte Careers Demo Assistant — Webhook OK"));

app.post("/df-webhook", (req, res) => {
  try {
    const body = req.body || {};
    const cxTag = body.fulfillmentInfo?.tag; // CX
    const qr = body.queryResult || {};
    const params = qr.parameters || {};
    const intentName = qr.intent?.displayName || cxTag || "UNKNOWN";

    if (intentName === "Find Roles") {
      const roles = mockRoles(params.practice, params.location);
      const lines = [
        `Here are ${params.practice || "Consulting"} roles in ${params.location || "Bengaluru"} (demo):`,
        ...roles.map(r => `• ${r.title} — ${r.reqId}\n  ${r.applyUrl}`),
        "\nDemo assistant. Not an official Deloitte system."
      ];
      return textResponse(res, lines.join("\n"));
    }

    if (intentName === "Eligibility Check") {
      const verdict = eligibility(params.degree, params.grad_year, params.experience_years);
      const next = verdict === "Likely eligible" ?
        "Would you like me to list matching roles in your city?" :
        "You can still explore openings or consider upskilling resources.";
      return textResponse(res, `Result: ${verdict}.\n${next}\n(Demo assistant.)`);
    }

    if (intentName === "Schedule Interview (Book)") {
      const slots = nextSlots();
      const lines = [
        `Available slots (demo):`,
        ...slots.map(s => `• ${s}`),
        `Reply with your preferred date & time.`
      ];
      return textResponse(res, lines.join("\n"));
    }

    if (intentName === "Schedule Interview (Pick Slot)") {
      const ts = params.timeslot || "the selected time";
      return textResponse(res, `Booked ${ts} (demo). A confirmation email will be sent.\nDemo assistant.`);
    }

    if (intentName === "Reschedule Interview") {
      const ts = params.timeslot || "your new time";
      return textResponse(res, `Rescheduled to ${ts} (demo). We'll send a new confirmation.\nDemo assistant.`);
    }

    if (intentName === "Cancel Interview") {
      return textResponse(res, `Your mock interview has been cancelled (demo). You'll receive a confirmation email.\nDemo assistant.`);
    }

    if (intentName === "Application Status") {
      const id = params.application_id || "DL-0000-IN";
      const status = statuses[Math.floor(Math.random()*statuses.length)];
      return textResponse(res, `Status for ${id}: ${status} (demo).\nDemo assistant.`);
    }

    if (intentName === "Contact HR / Handoff") {
      const ticket = "HR-" + Math.floor(1000 + Math.random()*9000);
      return textResponse(res, `I've created a demo ticket: ${ticket}. A team member will reach out.\nDemo assistant.`);
    }

    return textResponse(res, "I’m not sure how to help with that. Try: Find roles • Eligibility • Interview slots • Status • FAQs • Human handoff");
  } catch (e) {
    console.error("Webhook error", e);
    return textResponse(res, "An error occurred in the demo webhook.");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`DF ES webhook listening on :${PORT}`));
