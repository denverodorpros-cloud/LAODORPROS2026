const PHONE = "424-553-9449";
const EMAIL = "info@laodorpros.com";
let chatSoundPlayed = false;
let audioUnlocked = false;

const revealTargets = [
  ".section-head",
  ".service-card",
  ".step",
  ".split > *",
  ".review",
  ".content-card",
  ".side-box",
  ".form-wrap",
  "details"
];

function setupReveals() {
  const nodes = document.querySelectorAll(revealTargets.join(","));
  nodes.forEach((node, index) => {
    node.classList.add("reveal", `reveal-delay-${index % 4}`);
  });

  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });

  nodes.forEach((node) => observer.observe(node));
}

setupReveals();

function playChatChime() {
  if (chatSoundPlayed) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  try {
    const context = new AudioContext();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    gain.connect(context.destination);

    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + 0.22);
    });

    setTimeout(() => context.close(), 650);
    chatSoundPlayed = true;
  } catch (error) {
    // Browsers can block audio until the visitor interacts with the page.
  }
}

function unlockChatAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (chatBox && chatBox.classList.contains("open")) {
    playChatChime();
  }
}

["pointerdown", "keydown", "scroll"].forEach((eventName) => {
  window.addEventListener(eventName, unlockChatAudio, { once: true, passive: true });
});

function encodeForm(form) {
  const data = new FormData(form);
  const lines = [];
  for (const [key, value] of data.entries()) {
    if (value) lines.push(`${key}: ${value}`);
  }
  return encodeURIComponent(lines.join("\n"));
}

document.querySelectorAll(".estimate-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const subject = encodeURIComponent("Free odor removal estimate request");
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${encodeForm(form)}`;
  });
});

const chatButton = document.querySelector(".chat-button");
const chatBox = document.querySelector(".chat-box");
const chatBody = document.querySelector(".chat-body");
const chatForm = document.querySelector(".chat-input");
const chatInput = document.querySelector(".chat-input input");
const chatEstimateToggle = document.querySelector(".chat-estimate-toggle");
const chatEstimateForm = document.querySelector(".chat-estimate-form");
const chatHistory = [];

const PRICE_PER_SQ_FT = 0.5;

const answers = [
  { keys: ["what is ozone", "ozone odor", "o3", "how does ozone"], text: "Ozone odor removal uses O3 gas to react with odor molecules in an unoccupied space. The goal is to neutralize odor instead of covering it with fragrance." },
  { keys: ["break down odor", "neutralize", "molecules", "oxidize", "oxidation"], text: "Ozone works by oxidation. O3 reacts with many odor-causing molecules in the air and on exposed surfaces, which can help neutralize the smell instead of simply masking it." },
  { keys: ["does ozone work", "effective", "really work", "remove smell", "eliminate odor"], text: "Ozone can be very effective for many smoke, pet, cannabis, vehicle, and musty odors when the source is removed or controlled first. If the odor source remains, treatment may need cleaning, sealing, repairs, or repeat service." },
  { keys: ["safe", "safety", "people", "pets", "plant", "family", "baby"], text: "During ozone treatment, people, pets, and plants must be out of the treated area. After treatment, the space is ventilated before normal use resumes." },
  { keys: ["after treatment", "re enter", "reenter", "go back inside", "ventilate", "air out"], text: "After ozone treatment, the space needs to be ventilated before people, pets, or plants return. Re-entry timing depends on treatment size, ventilation, and odor severity." },
  { keys: ["food", "medicine", "electronics", "plants", "fish tank", "aquarium"], text: "Before ozone treatment, remove people, pets, plants, aquariums, and sensitive items when advised. Food, medication, and delicate materials should be protected or removed from the treated area." },
  { keys: ["pet", "urine", "dog", "cat", "dander"], text: "Pet odor treatment targets urine, dander, and odors trapped in carpets, upholstery, baseboards, and air pathways. Heavy urine contamination may also need cleaning, sealing, or material replacement." },
  { keys: ["smoke", "cigarette", "tobacco", "cigar", "fire", "cooking smoke"], text: "Smoke odors can settle into walls, ceilings, vents, fabrics, cabinets, and flooring. Ozone treatment can help reduce smoke odor after source cleaning is complete." },
  { keys: ["marijuana", "cannabis", "weed"], text: "Cannabis odor often lingers in fabrics, vents, and porous surfaces. LA ODOR PROS treats homes, apartments, vehicles, rentals, and listings for marijuana odor." },
  { keys: ["mold", "musty", "mildew", "damp"], text: "Musty odor treatment can help after moisture issues are corrected. If active mold or water intrusion is present, that source should be repaired before odor treatment." },
  { keys: ["vehicle", "car", "truck", "auto", "rideshare", "fleet"], text: "Vehicle odor treatment reaches vents, upholstery, carpets, headliners, and trunk areas. It is commonly used for smoke, pet, mildew, spill, food, and resale odors." },
  { keys: ["real estate", "rental", "listing", "tenant", "landlord", "property manager", "open house"], text: "Odor removal is a good fit before listing photos, showings, tenant turnover, guest arrivals, and move-in dates. Priority scheduling may be available for time-sensitive properties." },
  { keys: ["how long", "duration", "take", "hours"], text: "Many ozone odor treatments take several hours, while larger or more severe odor problems can require longer treatment and ventilation time." },
  { keys: ["one treatment", "second treatment", "repeat", "multiple treatments"], text: "Many odor issues improve with one treatment, but severe smoke, urine, cannabis, or musty odors may need added cleaning, sealing, or another treatment depending on source and severity." },
  { keys: ["leave", "stay home", "during treatment", "occupied"], text: "The treated area must remain unoccupied during ozone treatment and until it has been properly ventilated." },
  { keys: ["same day", "schedule", "appointment", "available", "availability", "book"], text: `Same-day and next-day options may be available in Los Angeles and nearby cities. Call ${PHONE} for the fastest scheduling.` },
  { keys: ["service area", "cities", "outside los angeles", "near me", "150 miles"], text: "LA ODOR PROS serves Los Angeles and major cities within about 150 miles, including many Southern California communities." },
  { keys: ["permanent", "return", "come back", "guarantee"], text: "Ozone can deliver strong results when the odor source is removed or controlled. If the source remains, such as active moisture or repeated pet accidents, odor may return. LA ODOR PROS offers a result guarantee without overstating what ozone can do." },
  { keys: ["hvac", "duct", "vent", "filter"], text: "Ozone can move through air pathways, but HVAC odors may also require filter changes, duct cleaning, or source correction depending on the cause." },
  { keys: ["fragrance", "perfume", "scent", "spray"], text: "The goal is odor neutralization first, not masking smells with fragrance. A light finishing scent may be used only when appropriate and requested." },
  { keys: ["clean before", "prepare", "before ozone", "before treatment"], text: "Basic source cleaning helps. Remove trash, soiled items, ash, pet waste, wet materials, and heavily contaminated belongings when possible." },
  { keys: ["carpet", "upholstery", "curtains", "fabric", "couch", "sofa", "mattress"], text: "Ozone can help with odors in exposed fabrics such as upholstery, curtains, carpet, and furniture, but heavily contaminated materials may also need cleaning, replacement, or sealing." },
  { keys: ["walls", "drywall", "paint", "ceiling", "cabinets"], text: "Odors can absorb into walls, ceilings, cabinets, and painted surfaces. Ozone may help, but severe smoke or contamination can sometimes require washing, sealing, or repainting." },
  { keys: ["furnished", "furniture", "couch", "sofa"], text: "Furnished homes can often be treated. Some delicate items, plants, and sensitive materials may need to be removed or protected before ozone treatment." },
  { keys: ["property managers", "landlords", "tenant turnover"], text: "Yes, LA ODOR PROS works with property managers and landlords for rental turnover, apartment odor removal, move-out odor problems, and tenant-ready treatments." },
  { keys: ["price", "cost", "pricing", "estimate", "quote", "sq ft", "sqft", "square feet", "square foot"], text: `Tell me the square footage, like "1000 sq ft", and I can give you a quick estimate. Final pricing can vary based on odor severity, access, and preparation needs.` },
  { keys: ["small room", "bedroom", "bathroom", "studio"], text: "Small rooms can often be treated, but the best estimate depends on square footage, odor type, and severity. Send the room size or type the square footage for a quick estimate." },
  { keys: ["apartment", "condo", "house", "home"], text: "LA ODOR PROS treats apartments, condos, and homes for pet, smoke, cannabis, musty, and rental turnover odors. Type the square footage for a quick estimate." },
  { keys: ["airbnb", "short term rental", "guest", "host"], text: "Yes, ozone odor removal can help short-term rentals between guests, especially for smoke, cannabis, pet, food, and musty smells. Timing matters because the space must be unoccupied and ventilated." },
  { keys: ["hotel", "office", "business", "commercial"], text: "Commercial odor removal may be available depending on the space, odor source, and access. Call LA ODOR PROS to review the site details and timing." },
  { keys: ["dead animal", "skunk", "trash", "garbage", "sewage"], text: "Strong source odors such as dead animal, trash, skunk, or sewage smells usually require source removal and cleaning first. Ozone can help with lingering odor after the source is handled." },
  { keys: ["allergy", "asthma", "health", "medical"], text: "Ozone odor treatment is not medical care and should not be used while people are inside. If someone has asthma, allergies, or respiratory concerns, follow medical advice and make sure the space is fully ventilated before re-entry." },
  { keys: ["contact", "phone", "email", "call"], text: `You can call LA ODOR PROS at ${PHONE} or email ${EMAIL}.` }
];

function extractSquareFeet(text) {
  const lower = text.toLowerCase();
  const direct = lower.match(/(\d[\d,]*)\s*(sq\.?\s*ft|sqft|sf|square\s*(feet|foot)|squer\s*ft|sqf)\b/);
  if (direct) return Number(direct[1].replace(/,/g, ""));

  if (/(home|house|apartment|condo|property|space|room|area|estimate|cost|price|quote)/.test(lower)) {
    const number = lower.match(/\b(\d[\d,]*)\b/);
    if (number) return Number(number[1].replace(/,/g, ""));
  }

  return null;
}

function formatEstimate(squareFeet) {
  const total = squareFeet * PRICE_PER_SQ_FT;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: total % 1 === 0 ? 0 : 2
  }).format(total);
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findBestAnswer(text) {
  const lower = normalizeText(text);
  let best = null;
  let bestScore = 0;

  answers.forEach((item) => {
    let score = 0;
    item.keys.forEach((key) => {
      const normalizedKey = normalizeText(key);
      if (lower.includes(normalizedKey)) {
        score += normalizedKey.split(" ").length + 1;
      } else {
        normalizedKey.split(" ").forEach((word) => {
          if (word.length > 3 && lower.includes(word)) score += 0.35;
        });
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });

  return bestScore >= 1 ? best : null;
}

function answerServiceQuestion(text) {
  const lower = normalizeText(text);
  const serviceQuestions = [
    { terms: ["pet", "dog", "cat", "urine"], service: "pet odor", detail: "Yes. LA ODOR PROS removes pet odor from homes, apartments, rentals, carpets, upholstery, and affected rooms." },
    { terms: ["smoke", "cigarette", "tobacco", "cigar"], service: "smoke odor", detail: "Yes. LA ODOR PROS removes smoke odor from homes, apartments, vehicles, rentals, and listings." },
    { terms: ["marijuana", "cannabis", "weed"], service: "marijuana odor", detail: "Yes. LA ODOR PROS removes marijuana and cannabis odor from homes, apartments, vehicles, rentals, and listings." },
    { terms: ["mold", "musty", "mildew", "damp"], service: "mold and musty odor", detail: "Yes. LA ODOR PROS treats moldy and musty odors after the moisture or active mold source has been addressed." },
    { terms: ["car", "vehicle", "truck", "auto", "van"], service: "vehicle odor", detail: "Yes. LA ODOR PROS removes vehicle odors including smoke, pet, mildew, food, spill, and resale odors." },
    { terms: ["rental", "real estate", "listing", "tenant", "airbnb"], service: "rental and real estate odor", detail: "Yes. LA ODOR PROS handles rental, real estate, Airbnb, tenant turnover, and listing odor removal." }
  ];

  const asksDoYou = /\b(do|can|could|will)\s+(you|u|la odor pros)\b/.test(lower) || lower.includes("do you remove") || lower.includes("can you remove");
  if (!asksDoYou) return null;

  const found = serviceQuestions.find((item) => item.terms.some((term) => lower.includes(term)));
  return found ? `${found.detail} Call ${PHONE} or type the square footage for a quick estimate.` : null;
}

function addMessage(text, type = "bot") {
  if (!chatBody) return;
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = text;
  chatBody.appendChild(msg);
  chatHistory.push(`${type === "bot" ? "LA ODOR PROS" : "Visitor"}: ${text}`);
  if (chatHistory.length > 12) chatHistory.shift();
  chatBody.scrollTop = chatBody.scrollHeight;
}

function openChatEstimateForm() {
  if (!chatEstimateForm) return;
  chatEstimateForm.classList.add("open");
  const squareFootageInput = chatEstimateForm.querySelector('[name="Square footage"]');
  const lastVisitorMessage = [...chatHistory].reverse().find((line) => line.startsWith("Visitor:"));
  if (squareFootageInput && lastVisitorMessage && !squareFootageInput.value) {
    const squareFeet = extractSquareFeet(lastVisitorMessage);
    if (squareFeet) squareFootageInput.value = squareFeet;
  }
}

function replyToChat(text) {
  const lower = text.toLowerCase();
  const serviceAnswer = answerServiceQuestion(text);
  if (serviceAnswer) return serviceAnswer;
  const asksVehiclePrice = /(car|vehicle|truck|auto|van|rideshare).*(price|cost|estimate|quote|how much)|(?:price|cost|estimate|quote|how much).*(car|vehicle|truck|auto|van|rideshare)/.test(lower);
  if (asksVehiclePrice) {
    return `Vehicle odor removal is usually estimated at $300-$350 depending on the odor type and severity. Call ${PHONE} to confirm scheduling and final pricing.`;
  }
  const squareFeet = extractSquareFeet(text);
  if (squareFeet && squareFeet > 0) {
    return `A ${squareFeet.toLocaleString()} sq ft space is estimated at ${formatEstimate(squareFeet)}. Final pricing can vary based on odor severity, access, and preparation needs. Call ${PHONE} to confirm availability.`;
  }
  const found = findBestAnswer(text);
  return found ? found.text : `I can answer FAQ questions about ozone treatment, safety, pet odor, smoke odor, marijuana odor, musty odor, vehicles, rentals, scheduling, and pricing. For an estimate, type the square footage, like "1000 sq ft".`;
}

if (chatButton && chatBox) {
  chatButton.innerHTML = 'O3<span class="chat-badge" aria-hidden="true"></span>';
  chatButton.addEventListener("click", () => {
    chatBox.classList.toggle("open");
    playChatChime();
  });
  if (document.body.dataset.page === "home") {
    setTimeout(() => {
      chatBox.classList.add("open");
      playChatChime();
    }, 900);
  }
}

if (chatEstimateToggle && chatEstimateForm) {
  chatEstimateToggle.addEventListener("click", () => {
    chatEstimateForm.classList.toggle("open");
  });

  chatEstimateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(chatEstimateForm);
    const lines = ["Free estimate request from website chat:"];
    for (const [key, value] of data.entries()) {
      if (value) lines.push(`${key}: ${value}`);
    }
    if (chatHistory.length) {
      lines.push("", "Recent chat:");
      lines.push(...chatHistory.slice(-8));
    }
    const subject = encodeURIComponent("Free odor removal estimate request from chat");
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    addMessage("Thanks. Your email app should open with the estimate request ready to send. You can also call 424-553-9449 for faster scheduling.", "bot");
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, "user");
    chatInput.value = "";
    const reply = replyToChat(text);
    addMessage(reply, "bot");
    if (/(estimate|quote|price|cost|sq\s*ft|sqft|square|how much)/i.test(text)) {
      addMessage("When you are ready, tap \"Send Free Estimate Request\" and I will include your details for LA ODOR PROS.", "bot");
      openChatEstimateForm();
    }
    const lower = text.toLowerCase();
    const wantsContact = ["contact me", "email me", "send message", "request callback", "call me"].some((phrase) => lower.includes(phrase));
    if (wantsContact) {
      const subject = encodeURIComponent("Chat notification from LA ODOR PROS website");
      const body = encodeURIComponent(`A visitor asked: ${text}`);
      window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    }
  });
}
