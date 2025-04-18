import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const weightInput = document.getElementById("weight-input");
const dateInput = document.getElementById("weight-date");
const logBtn = document.getElementById("log-weight");
const aiResponseEl = document.getElementById("weight-ai-response");
const downloadBtn = document.getElementById("download-weight");
const ctx = document.getElementById("weightChart").getContext("2d");

let weightChart;
let currentUser;
let cachedLogs = [];

if (dateInput) {
  dateInput.valueAsDate = new Date();
}

async function logWeight() {
  const weight = parseFloat(weightInput.value);
  const date = dateInput.value;

  if (!weight || !date) return alert("Please enter both weight and date.");
  if (!currentUser) return;

  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);

  let weightLogs = [];
  if (docSnap.exists()) {
    weightLogs = docSnap.data().weightLogs || [];
  }

  const existingIndex = weightLogs.findIndex(w => w.date === date);
  if (existingIndex !== -1) {
    weightLogs[existingIndex].weight = weight;
  } else {
    weightLogs.push({ date, weight });
  }

  await updateDoc(docRef, { weightLogs });
  await renderWeightChart(weightLogs);
  await getAIInsight(weightLogs);

  alert("✅ Weight logged successfully!");
}

async function renderWeightChart(logs) {
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sortedLogs.map(l => l.date);
  const data = sortedLogs.map(l => l.weight);

  cachedLogs = sortedLogs;

  if (weightChart) weightChart.destroy();

  weightChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Weight (lbs)",
        data,
        borderColor: "#10b981",
        backgroundColor: "#d1fae5",
        fill: true,
        tension: 0.3,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

async function getAIInsight(logs) {
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  const profile = profileSnap.data();
  const trend = logs.map(l => `${l.date}: ${l.weight} lbs`).join("\n");

  const prompt = `Here is the user's weight log:\n${trend}\n\nProfile:\nAge: ${profile.age}, Sex: ${profile.sex}, Height: ${profile.height} in\n\nGive a brief insight on this user's weight progress. Offer suggestions to stay on track.`;

  aiResponseEl.textContent = "🧠 Thinking...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA AI Advisor"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          {
            role: "system",
            content: "You are a friendly AI weight advisor."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "⚠️ No AI response.";
    aiResponseEl.textContent = reply;
  } catch (err) {
    console.error("AI Error", err);
    aiResponseEl.textContent = "⚠️ Failed to get AI insight.";
  }
}

function downloadCSV() {
  if (!cachedLogs.length) return alert("No logs to export.");

  let csv = "Date,Weight (lbs)\n";
  cachedLogs.forEach(log => {
    csv += `${log.date},${log.weight}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "weight_logs.csv";
  link.click();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const weightLogs = docSnap.data().weightLogs || [];
      await renderWeightChart(weightLogs);
      await getAIInsight(weightLogs);
    }
  } else {
    window.location.href = "index.html";
  }
});

logBtn.addEventListener("click", logWeight);
downloadBtn.addEventListener("click", downloadCSV);
