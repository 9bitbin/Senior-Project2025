import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// ================= USER CONTEXT ===================
let currentUser = null;
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";
  currentUser = user;

  if (document.getElementById("goal-type")) {
    await renderGoals();
    await fetchGoalInsight();
  }

  if (document.getElementById("weightChart")) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    const weightLogs = docSnap.exists() ? (docSnap.data().weightLogs || []) : [];
    await renderWeightChart(weightLogs);
    await fetchWeightInsight(weightLogs);
  }
});

// =================== GOALS SECTION =======================
const goalType = document.getElementById("goal-type");
const goalTarget = document.getElementById("goal-target");
const goalStarting = document.getElementById("goal-starting");
const goalDeadline = document.getElementById("goal-deadline");
const saveGoalBtn = document.getElementById("save-goal");
const goalTable = document.getElementById("goal-table");
const goalAIResponse = document.getElementById("goal-ai-response");

if (saveGoalBtn) {
  saveGoalBtn.addEventListener("click", async () => {
    const type = goalType?.value;
    const target = goalTarget?.value?.trim();
    const starting = goalStarting?.value?.trim();
    const deadline = goalDeadline?.value;

    if (!type || !target || !deadline) {
      alert("Please fill in all fields.");
      return;
    }

    if (type === "weight" && !starting) {
      alert("Please enter a starting weight.");
      return;
    }

    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    const goals = snap.exists() ? (snap.data().goals || []) : [];

    const newGoal = {
      type,
      target: Number(target),
      deadline
    };
    if (type === "weight") {
      newGoal.starting = Number(starting);
    }

    goals.push(newGoal);
    await updateDoc(ref, { goals });

    await renderGoals();
    await fetchGoalInsight();

    goalTarget.value = "";
    goalDeadline.value = "";
    goalStarting.value = "";
  });
}

async function renderGoals() {
  const docSnap = await getDoc(doc(db, "users", currentUser.uid));
  const data = docSnap.data();
  const { goals = [], workoutLogs = [], mealLogs = [], weightLogs = [], fastingHistory = [] } = data;

  goalTable.innerHTML = goals.length ? "" : `<tr><td colspan="7">No goals set yet.</td></tr>`;

  goals.forEach((goal, index) => {
    let progressPercent = 0;
    let progressText = "Tracking...";
    let status = "🟢 In Progress";
    const now = new Date();

    if (goal.type === "weight") {
      const latest = weightLogs.at(-1)?.weight || 0;
      const start = goal.starting || weightLogs[0]?.weight || latest;
      const total = start - goal.target;
      const lost = start - latest;
      progressPercent = total > 0 ? Math.min((lost / total) * 100, 100) : 0;
      progressText = `${lost.toFixed(1)} lbs lost`;
      if (progressPercent >= 100) status = "✅ Achieved";
    }

    if (goal.type === "calories") {
      const recent = mealLogs.slice(-7);
      const avg = recent.reduce((a, b) => a + (b.calories || 0), 0) / (recent.length || 1);
      progressPercent = Math.min((goal.target / avg) * 100, 100);
      progressText = `Avg ${avg.toFixed(0)} kcal`;
      if (avg <= goal.target) status = "✅ Achieved";
    }

    if (goal.type === "workoutsPerWeek") {
      const thisWeek = workoutLogs.filter(w => isThisWeek(w.timestamp));
      progressPercent = Math.min((thisWeek.length / goal.target) * 100, 100);
      progressText = `${thisWeek.length}/${goal.target} workouts`;
      if (progressPercent >= 100) status = "✅ Achieved";
    }

    if (goal.type === "fastingDays") {
      const weekFasts = fastingHistory.filter(f => isThisWeek(f.timestamp || f.startTime));
      progressPercent = Math.min((weekFasts.length / goal.target) * 100, 100);
      progressText = `${weekFasts.length}/${goal.target} fasts`;
      if (progressPercent >= 100) status = "✅ Achieved";
    }

    if (new Date(goal.deadline) < now && progressPercent < 100) status = "❌ Missed";


    //=========== I still need to edit the starting value so that it populates
    goalTable.innerHTML += `
      <tr>
        <td>${goal.type}</td>
        <td>${goal.type === "weight" ? (goal.starting ?? "—") : "—"}</td>
        <td>${goal.target}</td>
        <td>${goal.deadline}</td>
        <td>
          ${progressText}
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${progressPercent}%"></div>
          </div>
        </td>
        <td>${status}</td>
        <td>
          <button onclick="deleteGoal(${index})" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;">🗑️</button>
        </td>
      </tr>`;
  });
}

function isThisWeek(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return date >= start && date <= end;
}

window.deleteGoal = async index => {
  if (!confirm("Are you sure you want to delete this goal?")) return;
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const goals = snap.data().goals || [];
  goals.splice(index, 1);
  await updateDoc(ref, { goals });
  await renderGoals();
  await fetchGoalInsight();
};

async function fetchGoalInsight() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const { goals = [], workoutLogs = [], mealLogs = [], weightLogs = [] } = userSnap.data();

  const prompt = `
📌 User Goals:
${goals.map(g => `- ${g.type} → ${g.target} by ${g.deadline}`).join("\n")}

📉 Weight Logs:
${weightLogs.slice(-3).map(w => `${w.date}: ${w.weight} lbs`).join("\n")}

💪 Workouts:
${workoutLogs.slice(-3).map(w => `${w.type}: ${w.duration} min, ${w.caloriesBurned} kcal`).join("\n")}

🍽 Meals:
${mealLogs.slice(-3).map(m => `${m.name}: ${m.calories} kcal`).join("\n")}

💬 Summary request: Encourage, suggest 2 improvements, and praise 1 strength.
`;

  goalAIResponse.textContent = "🧠 Thinking...";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA Goal Coach"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a health goal coach." },
          { role: "user", content: prompt }
        ]
      })
    });
    const result = await res.json();
    goalAIResponse.textContent = result.choices?.[0]?.message?.content || "⚠️ No insight received.";
  } catch (err) {
    console.error(err);
    goalAIResponse.textContent = "⚠️ Failed to fetch insight.";
  }
}

// =================== WEIGHT SECTION =======================
// =================== WEIGHT SECTION =======================
const weightInput = document.getElementById("weight-input");
const weightDate = document.getElementById("weight-date");
const logBtn = document.getElementById("log-weight");
const downloadBtn = document.getElementById("download-weight");
const weightAIResponse = document.getElementById("weight-ai-response");
let weightChart;
let cachedLogs = [];

if (weightDate) weightDate.valueAsDate = new Date();
if (logBtn) logBtn.addEventListener("click", logWeight);
if (downloadBtn) downloadBtn.addEventListener("click", downloadCSV);

async function logWeight() {
  const weight = parseFloat(weightInput.value);
  const date = weightDate.value;
  if (!weight || !date) return alert("Please enter weight and date.");

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const logs = snap.exists() ? (snap.data().weightLogs || []) : [];

  const index = logs.findIndex(w => w.date === date);
  if (index !== -1) logs[index].weight = weight;
  else logs.push({ date, weight });

  await updateDoc(ref, { weightLogs: logs });
  await renderWeightChart(logs);
  await fetchWeightInsight(logs);
  alert("✅ Weight logged!");
}

async function renderWeightChart(logs) {
  const canvas = document.getElementById("weightChart");
  if (!canvas) return console.warn("Chart canvas missing");
  const ctx = canvas.getContext("2d");

  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(l => l.date);
  const data = sorted.map(l => l.weight);
  cachedLogs = sorted;

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
      scales: { y: { beginAtZero: false } }
    }
  });

  renderWeightLogTable(logs); // ✅ Show logs in table as well
}

function renderWeightLogTable(logs) {
  const table = document.getElementById("weight-log-table")?.querySelector("tbody");
  if (!table) return;

  if (!logs.length) {
    table.innerHTML = `<tr><td colspan="2">No entries yet.</td></tr>`;
    return;
  }

  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  table.innerHTML = sorted.map(log => `
    <tr>
      <td>${log.date}</td>
      <td>${log.weight.toFixed(1)} lbs</td>
    </tr>
  `).join('');
}

async function fetchWeightInsight(logs) {
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  const profile = profileSnap.data();
  const trend = logs.map(l => `${l.date}: ${l.weight} lbs`).join("\n");
  const prompt = `Weight log:\n${trend}\n\nAge: ${profile.age}, Sex: ${profile.sex}, Height: ${profile.height} in\n\nBrief insight on progress and staying on track.`;

  weightAIResponse.textContent = "🧠 Thinking...";
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
          { role: "system", content: "You are a friendly AI weight advisor." },
          { role: "user", content: prompt }
        ]
      })
    });
    const result = await res.json();
    weightAIResponse.textContent = result.choices?.[0]?.message?.content || "⚠️ No AI response.";
  } catch (err) {
    console.error(err);
    weightAIResponse.textContent = "⚠️ Failed to get AI insight.";
  }
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