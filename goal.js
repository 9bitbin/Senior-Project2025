import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  doc, getDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

const goalType = document.getElementById("goal-type");
const goalTarget = document.getElementById("goal-target");
const goalDeadline = document.getElementById("goal-deadline");
const saveGoalBtn = document.getElementById("save-goal");
const goalTable = document.getElementById("goal-table");
const aiResponse = document.getElementById("goal-ai-response");

let currentUser = null;

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";
  currentUser = user;
  await renderGoals();
  await fetchAIInsight();
});

saveGoalBtn.addEventListener("click", async () => {
  const type = goalType.value;
  const target = goalTarget.value.trim();
  const deadline = goalDeadline.value;

  if (!type || !target || !deadline) {
    alert("Please fill in all fields.");
    return;
  }

  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.exists() ? docSnap.data() : {};
  const goals = data.goals || [];

  goals.push({ type, target: Number(target), deadline });
  await updateDoc(docRef, { goals });

  await renderGoals();
  await fetchAIInsight();
  goalTarget.value = "";
  goalDeadline.value = "";
});

async function renderGoals() {
  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const goals = data.goals || [];

  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];
  const fastingLogs = data.fastingHistory || [];

  goalTable.innerHTML = "";

  if (!goals.length) {
    goalTable.innerHTML = `<tr><td colspan="5">No goals set yet.</td></tr>`;
    return;
  }

  goals.forEach((goal, index) => {
    let progressText = "Tracking...";
    let progressPercent = 0;

    if (goal.type === "weight") {
      const latest = weightLogs[weightLogs.length - 1]?.weight || 0;
      const start = weightLogs[0]?.weight || latest;
      const goalWeight = goal.target;
      const totalToLose = start - goalWeight;
      const lost = start - latest;
      progressPercent = totalToLose > 0 ? Math.min((lost / totalToLose) * 100, 100) : 0;
      progressText = `${lost.toFixed(1)} lbs lost`;
    }

    if (goal.type === "calories") {
      const recentMeals = meals.slice(-7);
      const avgCalories = recentMeals.length
        ? recentMeals.reduce((a, b) => a + (b.calories || 0), 0) / recentMeals.length
        : 0;
      const over = avgCalories > goal.target;
      progressPercent = Math.min((goal.target / avgCalories) * 100, 100);
      progressText = `Avg ${avgCalories.toFixed(0)} kcal`;
    }

    if (goal.type === "workoutsPerWeek") {
      const thisWeek = workouts.filter(w => isThisWeek(w.timestamp));
      progressPercent = Math.min((thisWeek.length / goal.target) * 100, 100);
      progressText = `${thisWeek.length}/${goal.target} workouts`;
    }

    if (goal.type === "fastingDays") {
      const thisWeek = fastingLogs.filter(f => isThisWeek(f.timestamp));
      progressPercent = Math.min((thisWeek.length / goal.target) * 100, 100);
      progressText = `${thisWeek.length}/${goal.target} fasts`;
    }

    goalTable.innerHTML += `
      <tr>
        <td>${goal.type}</td>
        <td>${goal.target}</td>
        <td>${goal.deadline}</td>
        <td>
          ${progressText}
          <div style="margin-top:5px;background:#eee;border-radius:6px;overflow:hidden;">
            <div style="height:10px;width:${progressPercent}%;background:#10b981;"></div>
          </div>
        </td>
        <td><button onclick="deleteGoal(${index})" style="background:#ef4444;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">🗑️</button></td>
      </tr>`;
  });
}

// Utility to check if timestamp is from this week
function isThisWeek(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
  const lastDay = new Date(now.setDate(firstDay.getDate() + 6));
  return date >= firstDay && date <= lastDay;
}

// 🗑️ Delete Goal by index
window.deleteGoal = async (goalIndex) => {
  const confirmDelete = confirm("Are you sure you want to delete this goal?");
  if (!confirmDelete) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const goals = snap.data().goals || [];

  goals.splice(goalIndex, 1); // remove goal
  await updateDoc(userRef, { goals });

  await renderGoals();
  await fetchAIInsight();
};

async function fetchAIInsight() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data();

  const goals = data.goals || [];
  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];

  const prompt = `
User Goals:
${goals.map(g => `- ${g.type} → ${g.target} by ${g.deadline}`).join("\n") || "None"}

Recent Weight Logs:
${weightLogs.map(w => `${w.date}: ${w.weight} lbs`).join("\n") || "No logs"}

Recent Workouts:
${workouts.slice(-5).map(w => `${w.type} for ${w.duration} mins → ${w.caloriesBurned} kcal`).join("\n") || "No workouts"}

Recent Meals:
${meals.slice(-5).map(m => `${m.name}: ${m.calories} kcal`).join("\n") || "No meals"}

Give a motivating insight about their progress. Mention areas to improve and where they're doing great.
`;

  aiResponse.textContent = "🧠 Thinking...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA Goal AI"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a health goal tracking AI coach. Be friendly and encouraging." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await res.json();
    aiResponse.textContent = data.choices?.[0]?.message?.content || "⚠️ No insight received.";
  } catch (error) {
    console.error("AI Error:", error);
    aiResponse.textContent = "⚠️ Failed to fetch insight.";
  }
}


