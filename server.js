/* USI Careers Concierge — Dialogflow ES webhook */
const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const app = express();
app.use(express.json());

const LINKS = {
  usi_overview: [
    "https://www2.deloitte.com/in/en/careers.html",
    "https://www2.deloitte.com/in/en/pages/about-deloitte/articles/deloitte-us-india-offices.html"
  ],
  practices: {
    "Consulting": ["https://www2.deloitte.com/in/en/pages/strategy-operations/solutions/consulting.html"],
    "Risk Advisory": ["https://www2.deloitte.com/in/en/pages/risk/solutions/risksolutions.html"],
    "Audit & Assurance": ["https://www2.deloitte.com/in/en/pages/audit/topics/audit-and-assurance.html"],
    "Tax": ["https://www2.deloitte.com/in/en/pages/tax/topics/tax-services.html"],
    "Technology": ["https://www2.deloitte.com/in/en/pages/technology.html"],
    "Financial Advisory": ["https://www2.deloitte.com/in/en/pages/financial-advisory.html"]
  },
  culture: [
    "https://www2.deloitte.com/in/en/pages/careers/articles/life-at-deloitte.html",
    "https://www2.deloitte.com/global/en/pages/about-deloitte/articles/deloitte-inclusion.html"
  ],
  innovation: [
    "https://www2.deloitte.com/in/en/pages/technology/topics/analytics-and-cognitive.html",
    "https://www2.deloitte.com/global/en/pages/consulting/solutions/deloitte-ai-institute.html"
  ],
  hiring: [
    "https://jobsindia.deloitte.com/",
    "https://www2.deloitte.com/in/en/pages/careers/topics/campus-recruitment.html"
  ],
  locations: ["Bengaluru","Hyderabad","Gurugram","Mumbai","Pune","Chennai","Kolkata","Coimbatore"]
};

function bullet(list) { return list.map(x => `• ${x}`).join("\n"); }

async function searchRoles(keyword, practice, location) {
  let query = [];
  if (keyword) query.push(keyword);
  if (practice) query.push(practice);
  const q = encodeURIComponent(query.join(" "));
  const loc = location ? encodeURIComponent(location) : "";
  const url = `https://jobsindia.deloitte.com/search/?q=${q}${loc ? `&locationsearch=${loc}` : ""}`;

  try {
    const html = await (await fetch(url, {timeout: 8000})).text();
    const $ = cheerio.load(html);
    const results = [];
    $("a.jobTitle-link, a.jobTitle").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");
      if (title && href) results.push({title, href: new URL(href, url).href});
    });
    if (results.length === 0) {
      $("a[href]").each((_, el) => {
        const t = $(el).text().trim();
        const h = $(el).attr("href");
        if (h && /(\/job\/|\/jobs\/)/i.test(h) && t) {
          results.push({title: t, href: new URL(h, url).href});
        }
      });
    }
    return { url, results: results.slice(0,5) };
  } catch (e) {
    return { url, results: [] };
  }
}

function practiceSummary(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("consult")) return "Consulting at USI spans Strategy & Analytics, Human Capital, and Core Business Operations. Typical roles: Business Analyst, Consultant, Solution Analyst (tech), Specialist. Work includes digital transformation, operating models, cloud modernization and analytics-driven decisions.";
  if (n.includes("risk")) return "Risk Advisory covers Cyber, Regulatory & Legal, and Strategic Risk. Roles include Risk Analyst, Cyber Analyst, Risk Consultant. Work includes cyber defense, governance/risk/compliance, third-party risk and analytics for risk insights.";
  if (n.includes("audit")) return "Audit & Assurance focuses on independent audits, assurance reviews and controls testing. Roles: Audit Analyst, A&A Assistant. Strong grounding in accounting/standards, data-enabled audits.";
  if (n.includes("tax")) return "Tax delivers global compliance and reporting, indirect/direct tax, and transfer pricing. Roles: Tax Analyst/Consultant supporting global clients and technology-enabled tax operations.";
  if (n.includes("techn")) return "Technology brings Software Engineering, Cloud Engineering, Data/AI, and Platform/DevOps together. Roles: Software Engineer, Data Engineer, Cloud Analyst, SRE/DevOps. Work: build scalable systems, cloud migrations, ML solutions.";
  if (n.includes("financial")) return "Financial Advisory includes Valuation & Modeling, Forensic, Restructuring, and M&A Transaction Services. Roles: Analyst/Consultant working on deals, investigations and valuations.";
  return "Deloitte USI practices include Consulting, Risk Advisory, Audit & Assurance, Tax, Technology and Financial Advisory.";
}

function discoverySuggestions(interest, degree, exp, city) {
  const rec = [];
  const add = (t) => rec.push(`• ${t}`);
  const i = String(interest||"").toLowerCase();
  if (/data|ai|ml|analytics/.test(i)) { add("Data Engineer / Analyst (SQL, Python, cloud data warehouses)"); add("Applied AI / ML Engineer (ML fundamentals, MLOps, Python)"); }
  if (/cloud|devops|sre|platform/.test(i)) { add("Cloud Engineer (AWS/Azure/GCP, IaC)"); add("SRE/DevOps Engineer (Kubernetes, CI/CD, monitoring)"); }
  if (/cyber/.test(i)) { add("Cyber Analyst (SOC, threat detection, incident response)"); add("Identity & Access Management / AppSec Consultant"); }
  if (/erp|sap|workday|oracle/.test(i)) { add("SAP Associate Consultant (ABAP/Functional/HANA)"); add("Workday/Oracle Cloud Consultant"); }
  if (/software|full|backend|frontend|mobile|ui|ux|testing|qa/.test(i)) { add("Software Engineer (Java/Node/.NET, React/Angular, testing)"); }
  if (/audit|account/.test(i)) { add("Audit Analyst / Assurance Associate"); }
  if (/risk|compliance|grc/.test(i)) { add("Risk Analyst / GRC Consultant"); }
  if (/tax/.test(i)) { add("Tax Analyst (direct/indirect/TP)"); }
  if (/strategy|human/.test(i)) { add("Business Analyst / Human Capital Analyst"); }
  const links = [`Search roles: https://jobsindia.deloitte.com/search/?q=${encodeURIComponent(interest||"")}${city ? "&locationsearch="+encodeURIComponent(city):""}`];
  return { rec, links };
}

function makeList(items) { return items.map((x, i) => `${i+1}. ${x}`).join("\n"); }

app.post("/df-webhook", async (req, res) => {
  try {
    const qr = req.body.queryResult || {};
    const params = qr.parameters || {};
    const intent = qr.intent?.displayName || "UNKNOWN";

    if (intent === "USI Overview") {
      const text = [
        "Deloitte USI (U.S.-India) brings together professionals in India who collaborate with Deloitte’s global practices on consulting, technology, audit, risk, tax and advisory services.",
        "Explore:",
        bullet(LINKS.usi_overview)
      ].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Practice Info") {
      const p = params.practice;
      const summary = practiceSummary(p);
      const links = LINKS.practices[p] || [];
      const text = [summary, links.length ? "\nOfficial links:\n"+bullet(links) : ""].join("\n");
      return res.json({ fulfillmentText: text.trim() });
    }

    if (intent === "Locations & Offices") {
      const text = ["USI delivery centers and offices are primarily in:", bullet(LINKS.locations), "\nLearn more:", bullet(LINKS.usi_overview)].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Culture & Benefits") {
      const text = ["Life at Deloitte focuses on growth, inclusion and wellbeing. Expect mentorship, continuous learning, internal mobility, and communities (Women in Tech, Pride, etc.).", "Explore culture & inclusion pages:", bullet(LINKS.culture)].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Learning & Innovation") {
      const text = ["USI invests in certifications (AWS/Azure/GCP, SAP, cybersecurity, analytics), Guild learning paths, internal bootcamps, and innovation programs (AI, Cloud, Industry 4.0).", "See more:", bullet(LINKS.innovation)].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Hiring Programs") {
      const text = ["Entry paths include campus hiring (analyst/solution analyst), internships, and off-campus lateral roles.", "Start here:", bullet(LINKS.hiring)].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Search Roles") {
      const { keyword, practice, location } = params;
      const q = keyword || practice || "graduate analyst";
      const result = await searchRoles(q, practice, location);
      let out = `Here are resources for '${q}' ${location? "in "+location : ""}:\n${result.url}`;
      if (result.results && result.results.length) {
        out += "\n\nTop matches:\n" + result.results.map(r => `• ${r.title}\n  ${r.href}`).join("\n");
      } else {
        out += "\n\nOpen the link to view all current listings.";
      }
      out += "\n\nTip: Refine with 'search roles cloud in Hyderabad' or 'data roles Bengaluru'.";
      return res.json({ fulfillmentText: out });
    }

    if (intent === "Discovery Interview - Collect") {
      const { interest, degree, experience_level, location } = params;
      const { rec, links } = discoverySuggestions(interest, degree, experience_level, location);
      const text = [`Great — based on your interest in ${interest}, degree ${degree} and experience ${experience_level}${location? " for "+location:""}, here are starter pathways:`, rec.length ? makeList(rec) : "• Analyst/Consultant roles in the chosen practice", "\nUseful links:", bullet(links.concat(LINKS.hiring.slice(0,1)))].join("\n");
      return res.json({ fulfillmentText: text });
    }

    if (intent === "Contact & Events") {
      const text = ["For official updates, webinars and campus engagements, follow the careers site and LinkedIn pages.", "Start at:", bullet(["https://www2.deloitte.com/in/en/careers.html","https://jobsindia.deloitte.com/"])].join("\n");
      return res.json({ fulfillmentText: text });
    }

    return res.json({ fulfillmentText: "I can explain USI, practices, culture and learning, search open roles, or run a discovery interview. Try 'what is USI' or 'search cloud roles in Bengaluru'." });
  } catch (e) {
    console.error("Webhook error", e);
    return res.json({ fulfillmentText: "Sorry, something went wrong fetching that info." });
  }
});

app.get("/", (_req, res) => res.send("USI Careers Concierge — Webhook OK"));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("USI Concierge webhook on :" + PORT));
