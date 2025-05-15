// Merged VIDIA Script: Goals + Weight Tracker
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

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
const workoutTable = document.getElementById("workout-goal-table");
const aiGoalResponse = document.getElementById("goal-ai-response");
const editStartToggle = document.getElementById("edit-start-toggle");
const warning = document.getElementById("goal-warning");


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

  await updateDoc(docRef, {
    weightLogs,
    weight  // this adds the new/latest weight to the profile
  });
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
        "Authorization": "Bearer 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"
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

function setFutureDateOnly(inputId) {
  const input = document.getElementById(inputId);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedToday = `${yyyy}-${mm}-${dd}`;

  input.value = formattedToday;
  input.min = formattedToday; // Disable past dates
}


// ---- Goal Management ----

document.getElementById('goal-type').addEventListener('change', async function () {
  const weightSection = document.getElementById('weight-section');
  const goalDeadline = document.getElementById('goal-deadline');
  const goalTarget = document.getElementById('goal-target');
  const calorieGoalSection = document.getElementById('calorie-goal-section');
  const weeklyTimeframe = document.getElementById('weekly-timeframe');

  if (this.value === 'calories') {
    // Get calorie target from profile
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const profileData = userSnap.data();

    if (profileData?.calorieGoal) {
      goalTarget.value = profileData.calorieGoal;
    }

    // Show calorie section, hide weight section
    weightSection.style.display = 'none';
    calorieGoalSection.style.display = 'block';
    weeklyTimeframe.style.display = 'none';

    goalDeadline.type = 'text';
    goalDeadline.value = 'Daily';
    goalDeadline.readOnly = true;
    goalDeadline.style.display = 'block';
  } else if (this.value === 'workoutsPerWeek') {
    // For workout goals
    weightSection.style.display = 'none';
    calorieGoalSection.style.display = 'none';
    weeklyTimeframe.style.display = 'block';
    goalDeadline.style.display = 'none';
  } else {
    // For weight goals
    weightSection.style.display = 'block';
    calorieGoalSection.style.display = 'none';
    weeklyTimeframe.style.display = 'none';

    goalDeadline.type = 'date';
    goalDeadline.value = '';
    goalDeadline.readOnly = false;
    goalDeadline.style.display = 'block';
    goalTarget.value = '';
  }
});

// Add this right after your DOM Elements section
document.addEventListener('DOMContentLoaded', () => {
  // Ensure proper initial state for weight goal type
  const goalDeadline = document.getElementById('goal-deadline');
  if (goalDeadline) {
    goalDeadline.type = 'date';
    goalDeadline.value = '';
    goalDeadline.readOnly = false;
  }
});

// Save goal button handler
if (saveGoalBtn) {
  saveGoalBtn.addEventListener("click", async () => {
    const type = goalType.value;
    const target = goalTarget.value.trim();
    const deadline = goalDeadline.value;
    const value = parseInt(goalTarget.value);

    //if (!type || !target || !deadline) return alert("Please fill all fields.");

    if (goalType.value === "weight") {
      if (!type || !target || !deadline) {
        alert("Please fill in all fields.");
        return;
      }
    }

    if (goalType.value === "workoutsPerWeek") {
      if (!type || !target) {
        alert("Please fill in all fields.");
        return;
      }
    }

    const userRef = doc(db, "users", currentUser.uid);

    if (isNaN(target) || target < 1) {
      warning.style.display = "block";
      return;
    } else {
      warning.style.display = "none";
    }

    try {
      if (type === 'calories') {
        // Only update calorie goal in profile
        await updateDoc(userRef, {
          calorieGoal: Number(target)
        });
        // Keep the deadline as "Daily" for calories
        goalDeadline.value = 'Daily';
      } else {
        // For non-calorie goals, add to goals array
        const snap = await getDoc(userRef);
        const data = snap.data() || {};
        const goals = data.goals || [];



        //this code is for preventing duplicate goals on the same deadline
        if (type === 'weight') {
          const existingGoal = goals.find(g => g.type === 'weight' && g.deadline === deadline);
          if (existingGoal) {
            alert("⚠️ A weight goal already exists for this deadline.");
            return;
          }
        }

        if (type === 'workoutsPerWeek') {
          const weekRange = getCurrentWeekRange();
          const existingWorkoutGoal = goals.find(g =>
            g.type === 'workoutsPerWeek' &&
            getCurrentWeekRange() === weekRange
          );

          if (existingWorkoutGoal) {
            // Count how many workouts were completed this week
            const workouts = (data.workoutLogs || []).filter(w => isThisWeek(w.timestamp));
            const completed = workouts.length;
            const achieved = completed >= existingWorkoutGoal.target;

            if (!achieved) {
              const confirmOverride = confirm("⚠️ You already have an unachieved goal this week.\nAre you sure you want to override it?");
              if (!confirmOverride) return; // Cancel saving if user says no
            }

            // Optional: remove the old unachieved goal
            const index = goals.indexOf(existingWorkoutGoal);
            if (index > -1) goals.splice(index, 1);
          }
        }

        goals.push({
          type,
          target: Number(target),
          start: goalStart?.value ? Number(goalStart.value) : null,
          deadline
        });

        await updateDoc(userRef, { goals });
        // Clear deadline only for non-calorie goals
        goalDeadline.value = "";
      }

      await renderGoals();
      await fetchAIInsight();

      // Only clear target, keep deadline for calories
      goalTarget.value = "";
    } catch (error) {
      console.error("Error saving goal:", error);
      alert("❌ Failed to save goal");
    }
  });
}

// Weekly Table Range
function getCurrentWeekRange() {
  const today = new Date();
  const sunday = new Date(today); // clone
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  sunday.setDate(sunday.getDate() - dayOfWeek);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const formatDate = (date) =>
    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;

  return `${formatDate(sunday)} - ${formatDate(saturday)}`;
}

async function renderGoals() {
  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() || {};

  // Get today's meals and calculate calories
  const today = new Date().toISOString().split('T')[0];
  const mealLogs = data.mealLogs || [];

  // Improved date comparison for today's meals
  const todayMeals = mealLogs.filter(meal => {
    const mealDate = new Date(meal.timestamp);
    const mealDateStr = mealDate.toLocaleDateString();
    const todayStr = new Date().toLocaleDateString();
    const isToday = mealDateStr === todayStr;
    return isToday;
  });

  // Calculate today calories for today 
  let todayCalories = 0;
  todayMeals.forEach(meal => {
    todayCalories += Number(meal.calories || 0);
  });

  const calorieGoal = Number(data.calorieGoal) || 2000;

  // Update calorie goal section
  const calorieGoalSection = document.getElementById('calorie-goal-section');
  const currentDate = document.getElementById('current-date');
  const calorieGoalTable = document.getElementById('calorie-goal-table');

  if (calorieGoalSection && currentDate && calorieGoalTable) {
    calorieGoalSection.style.display = 'block';
    currentDate.textContent = new Date().toLocaleDateString();
    calorieGoalTable.innerHTML = `
      <tr>
        <td>${calorieGoal} kcal</td>
        <td>
          ${todayCalories.toFixed(1)}/${calorieGoal} kcal
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${Math.min((todayCalories / calorieGoal) * 100, 100)}%"></div>
          </div>
        </td>
        <td>${todayCalories >= calorieGoal ? '✅ Achieved' : '🟢 In Progress'}</td>
      </tr>
    `;
  }

  // Handle regular goals
  //const goals = (data.goals || []).filter(g => g.type !== 'calories');
  const goals = data.goals || [];
  const regularGoals = goals.filter(g => g.type !== 'calories' && g.type !== 'workoutsPerWeek');
  const workoutGoals = goals.filter(g => g.type === 'workoutsPerWeek');

  const workouts = data.workoutLogs || [];
  const weightLogs = data.weightLogs || [];
  const fastingLogs = data.fastingHistory || [];

  if (goalTable) {
    goalTable.innerHTML = goals.length ? "" : `<tr><td colspan="6">No goals set yet.</td></tr>`;

    regularGoals.forEach((goal, index) => {
      let progress = 0, status = "🟢 In Progress", progressText = "Tracking...";
      const now = new Date();

      if (goal.type === "weight") {
        const latest = weightLogs[weightLogs.length - 1]?.weight || 0;
        const start = goal.start != null && !isNaN(goal.start) ? goal.start : (weightLogs[0]?.weight || 0);

        const isLosing = start > goal.target;
        let directionIndicator = isLosing ? "⬇️ Losing" : "⬆️ Gaining";

        if (isLosing) {
          const totalToLose = start - goal.target;
          const lostSoFar = Math.max(0, start - latest); // Never negative

          progress = Math.min((lostSoFar / totalToLose) * 100, 100);
          progressText = `${Math.min(lostSoFar, totalToLose).toFixed(1)} lbs lost <span style="font-size: 12px; color: gray;">${directionIndicator}</span>`;
        } else {
          const totalToGain = goal.target - start;
          const gainedSoFar = Math.max(0, latest - start);

          progress = Math.min((gainedSoFar / totalToGain) * 100, 100);
          progressText = `${Math.min(gainedSoFar, totalToGain).toFixed(1)} lbs gained <span style="font-size: 12px; color: gray;">${directionIndicator}</span>`;
        }

        if (progress >= 100) status = "✅ Achieved";
        else if (new Date(goal.deadline) < new Date()) status = "❌ Missed";
        else status = "🟢 In Progress";

        goalTable.innerHTML += `
    <tr>
        <td>${goal.start || '—'}</td>
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
        return;
      }





      if (goal.type === "calories") {
        progress = (todayCalories / goal.target) * 100;
        progressText = `${todayCalories.toFixed(1)}/${goal.target} kcal`;

        if (todayCalories >= goal.target && todayCalories <= goal.target * 1.1) {
          status = "✅ Achieved";
        } else if (todayCalories > goal.target * 1.1) {
          status = "⚠️ Exceeded";
        }
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
      <td>${goal.start || '—'}</td>
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

  // Renders Workout Table
  if (workoutTable) {
    workoutTable.innerHTML = workoutGoals.length ? "" : `<tr><td colspan="5">No workout goals set yet.</td></tr>`;

    const weekRange = getCurrentWeekRange();

    workoutGoals.forEach((goal, index) => {
      const target = goal.target || "—";
      const count = workouts.filter(w => isThisWeek(w.timestamp)).length;
      const progress = Math.min((count / target) * 100, 100);
      const progressText = `${count}/${target} workouts`;
      const status = progress >= 100 ? "✅ Achieved" : "🟢 In Progress";

      workoutTable.innerHTML += `
        <tr>
          <td>${weekRange}</td>
          <td>${target}</td>
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

// WEEKLY WORKOUT


// Keep the event listener but remove the duplicate variable declarations
goalType.addEventListener("change", () => {
  if (goalType.value === "workoutsPerWeek") {
    workoutTimeframe.style.display = "block";
    goalDeadline.style.display = "none";
    weightSection.style.display = "none";

  } else {
    workoutTimeframe.style.display = "none";
    goalDeadline.style.display = "block";
    weightSection.style.display = "block";
  }
  warning.style.display = "none";
});
// WEEKLY WORKOUT

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
        "Authorization": "Bearer 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"
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

// Replace the updateCalorieGoalDisplay function with this simplified version
async function updateCalorieGoalDisplay() {
  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() || {};

  const today = new Date().toISOString().split('T')[0];
  const mealLogs = data.mealLogs || [];

  // Calculate today's calories
  const todayCalories = mealLogs
    .filter(meal => new Date(meal.timestamp).toISOString().split('T')[0] === today)
    .reduce((sum, meal) => sum + Number(meal.calories || 0), 0);

  const calorieGoal = data.calorieGoal || 2000;

  // Update display
  const calorieGoalTable = document.getElementById("calorie-goal-table");
  if (calorieGoalTable) {
    document.getElementById("current-date").textContent = new Date().toLocaleDateString();
    calorieGoalTable.innerHTML = `
      <tr>
        <td>${calorieGoal}</td>
        <td>${todayCalories}/${calorieGoal}</td>
        <td>${todayCalories <= calorieGoal ? "✅ On Track" : "⚠️ Over"}</td>
      </tr>
    `;
  }
}

// Add this to your existing event listeners
document.addEventListener("DOMContentLoaded", () => {
  updateCalorieGoalDisplay();
});

// Update the calorie display whenever calories are logged
export function refreshCalorieDisplay() {
  updateCalorieGoalDisplay();
}

// Remove this duplicate auth state listener at the bottom of the file
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    renderGoals();
  } else {
    window.location.href = "index.html";
  }
});
