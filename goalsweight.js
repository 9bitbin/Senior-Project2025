// Merged VIDIA Script: Goals + Weight Tracker
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// ---- Shared State ----
let currentUser = null;
let cachedLogs = [];

// ---- DOM Elements ----
const weightInput = document.getElementById("weight-input");
const dateInput = document.getElementById("weight-date");
const logBtn = document.getElementById("log-weight");
const downloadBtn = document.getElementById("download-weight");
const aiResponseEl = document.getElementById("weight-ai-response");
const ctx = document.getElementById("weightChart")?.getContext("2d");

const goalType = document.getElementById("goal-type");
const goalTarget = document.getElementById("goal-target");
const goalStart = document.getElementById("goal-start");
const goalDeadline = document.getElementById("goal-deadline");
const saveGoalBtn = document.getElementById("save-goal");
const goalTable = document.getElementById("goal-table");
const aiGoalResponse = document.getElementById("goal-ai-response");
const editStartToggle = document.getElementById("edit-start-toggle");

let weightChart;

// ---- Firebase Auth Listener ----
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() || {};
  const weightLogs = data.weightLogs || [];

  // ✅ Pre-fill goal-start from profile weight
  if (data.weight && goalStart) {
    goalStart.value = data.weight;
    goalStart.readOnly = true;
  }

  // ✅ Allow user to toggle editing
  if (editStartToggle) {
    editStartToggle.addEventListener("change", () => {
      goalStart.readOnly = !editStartToggle.checked;
    });
  }

  await renderWeightChart(weightLogs);
  await getAIInsight(weightLogs);
  await renderGoals();
  await fetchAIInsight();
});

// ---- Weight Logging ----
if (dateInput) dateInput.valueAsDate = new Date();

async function logWeight() {
  const weight = parseFloat(weightInput.value);
  const date = dateInput.value;
  if (!weight || !date || !currentUser) return alert("⚠️ Please enter both weight and date.");

  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  let weightLogs = docSnap.exists() ? docSnap.data().weightLogs || [] : [];

  const existing = weightLogs.findIndex(w => w.date === date);
  existing !== -1 ? weightLogs[existing].weight = weight : weightLogs.push({ date, weight });

  await updateDoc(docRef, { weightLogs });
  await renderWeightChart(weightLogs);
  await getAIInsight(weightLogs);
  alert("✅ Weight logged!");
}

async function renderWeightChart(logs) {
  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  cachedLogs = sorted;
  const labels = sorted.map(l => l.date);
  const data = sorted.map(l => l.weight);

  if (weightChart) weightChart.destroy();
  if (!ctx) return;

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
    options: { responsive: true, scales: { y: { beginAtZero: false } } }
  });
}

function downloadCSV() {
  if (!cachedLogs.length) return alert("No logs to export.");
  let csv = "Date,Weight (lbs)\n" + cachedLogs.map(log => `${log.date},${log.weight}`).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "weight_logs.csv";
  link.click();
}

// ---- AI Weight Insight ----
async function getAIInsight(logs) {
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  const profile = profileSnap.data();
  const trend = logs.map(l => `${l.date}: ${l.weight} lbs`).join("\n");
  const prompt = `Weight trend:\n${trend}\n\nProfile:\nAge: ${profile.age}, Sex: ${profile.sex}, Height: ${profile.height} in\n\nInsight please.`;

  aiResponseEl.textContent = "🧠 Thinking...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a friendly AI weight advisor." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await res.json();
    aiResponseEl.textContent = data.choices?.[0]?.message?.content || "⚠️ No AI response.";
  } catch (err) {
    console.error("AI Error", err);
    aiResponseEl.textContent = "⚠️ Failed to get AI insight.";
  }
}

// ---- Goal Management ----
if (saveGoalBtn) {
  saveGoalBtn.addEventListener("click", async () => {
    const type = goalType.value;
    const target = goalTarget.value.trim();
    const deadline = goalDeadline.value;
    if (!type || !target || !deadline) return alert("Please fill all fields.");

    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const data = snap.data() || {};
    const goals = data.goals || [];

    goals.push({
      type,
      target: Number(target),
      start: goalStart?.value ? Number(goalStart.value) : null,
      deadline
    });

    await updateDoc(userRef, { goals });
    await renderGoals();
    await fetchAIInsight();

    goalTarget.value = "";
    goalDeadline.value = "";
  });
}

async function renderGoals() {
  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const goals = data.goals || [];
  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];
  const fastingLogs = data.fastingHistory || [];

  goalTable.innerHTML = goals.length ? "" : `<tr><td colspan="6">No goals set yet.</td></tr>`;

  goals.forEach((goal, index) => {
    let progress = 0, status = "🟢 In Progress", progressText = "Tracking...";
    const now = new Date();

    if (goal.type === "weight") {
      const latest = weightLogs[weightLogs.length - 1]?.weight || 0;
      const start = goal.start != null && !isNaN(goal.start) ? goal.start : (weightLogs[0]?.weight || 0);
      const total = start - goal.target;
      const lost = start - latest;
      progress = total > 0 ? Math.min((lost / total) * 100, 100) : 0;
      progressText = `${lost.toFixed(1)} lbs lost`;
      if (progress >= 100) status = "✅ Achieved";
    }

    if (goal.type === "calories") {
      const avg = meals.slice(-7).reduce((sum, m) => sum + (m.calories || 0), 0) / 7;
      progress = Math.min((goal.target / avg) * 100, 100);
      progressText = `Avg ${avg.toFixed(0)} kcal`;
      if (avg <= goal.target) status = "✅ Achieved";
    }

    if (goal.type === "workoutsPerWeek") {
      const count = workouts.filter(w => isThisWeek(w.timestamp)).length;
      progress = Math.min((count / goal.target) * 100, 100);
      progressText = `${count}/${goal.target} workouts`;
      if (progress >= 100) status = "✅ Achieved";
    }

    if (goal.type === "fastingDays") {
      const count = fastingLogs.filter(f => isThisWeek(f.timestamp || f.startTime)).length;
      progress = Math.min((count / goal.target) * 100, 100);
      progressText = `${count}/${goal.target} fasts`;
      if (progress >= 100) status = "✅ Achieved";
    }

    if (new Date(goal.deadline) < now && progress < 100) status = "❌ Missed";

    goalTable.innerHTML += `
      <tr>
        <td>${goal.type}</td>
        <td>${goal.target}</td>
        <td>${goal.deadline}</td>
        <td>
          ${progressText}
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${progress}%"></div>
          </div>
        </td>
        <td>${status}</td>
        <td>
          <button onclick="deleteGoal(${index})" style="background:#ef4444;color:white;">🗑️</button>
        </td>
      </tr>`;
  });
}

window.deleteGoal = async (index) => {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const goals = snap.data().goals || [];
  goals.splice(index, 1);
  await updateDoc(userRef, { goals });
  await renderGoals();
  await fetchAIInsight();
};

function isThisWeek(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return date >= start && date <= end;
}

// ---- AI Goal Insight ----
async function fetchAIInsight() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const data = snap.data() || {};
  const goals = data.goals || [];
  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];

  const prompt = `Goals:\n${goals.map(g => `${g.type} → ${g.target} by ${g.deadline}`).join("\n")}
Weight logs:\n${weightLogs.slice(-3).map(w => `${w.date}: ${w.weight} lbs`).join("\n")}
Meals:\n${meals.slice(-3).map(m => `${m.name}: ${m.calories} kcal`).join("\n")}
Workouts:\n${workouts.slice(-3).map(w => `${w.type} - ${w.caloriesBurned} kcal`).join("\n")}`;

  aiGoalResponse.textContent = "🧠 Thinking...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a supportive AI health coach." },
          { role: "user", content: prompt }
        ]
      })
    });
    const result = await res.json();
    aiGoalResponse.textContent = result.choices?.[0]?.message?.content || "⚠️ No response.";
  } catch (err) {
    console.error("AI Error:", err);
    aiGoalResponse.textContent = "⚠️ Failed to get AI goal insight.";
  }
}

// ---- Event Listeners ----
logBtn?.addEventListener("click", logWeight);
downloadBtn?.addEventListener("click", downloadCSV);
