import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

const goalType = document.getElementById("goal-type");
const goalTarget = document.getElementById("goal-target");
const goalDeadline = document.getElementById("goal-deadline");
const saveGoalBtn = document.getElementById("save-goal");
const goalTable = document.getElementById("goal-table");
const workoutTable = document.getElementById("workout-goal-table");
const aiResponse = document.getElementById("goal-ai-response");

let currentUser = null;

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";
  currentUser = user;
  await renderGoals();
  await fetchAIInsight();
});

const warning = document.getElementById("goal-warning");

saveGoalBtn.addEventListener("click", async () => {
  const type = goalType.value;
  const target = goalTarget.value.trim();
  const deadline = goalDeadline.value;

  const value = parseInt(goalTarget.value);

  if (isNaN(value) || value < 1) {
    warning.style.display = "block";
    return;
  } else {
    warning.style.display = "none";
  }

  if (goalType.value === "weight"){
    if (!type || !target || !deadline) {
    alert("Please fill in all fields.");
    return;
  }
  }
  
  if (goalType.value === "workoutsPerWeek"){
    if (!type || !target) {
    alert("Please fill in all fields.");
    return;
  }
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
  const data = docSnap.data();
  const goals = data.goals || [];

  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];
  const fastingLogs = data.fastingHistory || [];

  goalTable.innerHTML = "";
  workoutTable.innerHTML = "";

  if (!goals.length) {
    goalTable.innerHTML = `<tr><td colspan="6">No goals set yet.</td></tr>`;
    workoutTable.innerHTML = `<tr><td colspan="5">No workout goals set yet.</td></tr>`;
    return;
  }

  const now = new Date();

  goals.forEach((goal, index) => {
    let progressText = "Tracking...";
    let progressPercent = 0;
    let status = "🟢 In Progress";

    if (goal.type === "weight") {
      const latest = weightLogs[weightLogs.length - 1]?.weight || 0;
      const start = weightLogs[0]?.weight || latest;
      const totalToLose = start - goal.target;
      const lost = start - latest;
      progressPercent = totalToLose > 0 ? Math.min((lost / totalToLose) * 100, 100) : 0;
      progressText = `${lost.toFixed(1)} lbs lost`;
      if (progressPercent >= 100) status = "✅ Achieved";
    }

    else if (goal.type === "calories") {
      const recentMeals = meals.slice(-7);
      const avgCalories = recentMeals.length
        ? recentMeals.reduce((a, b) => a + (b.calories || 0), 0) / recentMeals.length
        : 0;
      progressPercent = Math.min((goal.target / avgCalories) * 100, 100);
      progressText = `Avg ${avgCalories.toFixed(0)} kcal`;
      if (avgCalories <= goal.target) status = "✅ Achieved";
    }

    else if (goal.type === "fastingDays") {
      const thisWeek = fastingLogs.filter(f => isThisWeek(f.timestamp || f.startTime));
      progressPercent = Math.min((thisWeek.length / goal.target) * 100, 100);
      progressText = `${thisWeek.length}/${goal.target} fasts`;
      if (progressPercent >= 100) status = "✅ Achieved";
    }

    if (new Date(goal.deadline) < now && progressPercent < 100) {
      status = "❌ Missed";
    }

    if (goal.type === "workoutsPerWeek") {
      const thisWeek = workouts.filter(w => isThisWeek(w.timestamp));
      progressPercent = Math.min((thisWeek.length / goal.target) * 100, 100);
      progressText = `${thisWeek.length}/${goal.target} workouts`;
      if (progressPercent >= 100) status = "✅ Achieved";

      const weekRange = getCurrentWeekRange();

      const workoutRow = `
        <tr>
          <td>${weekRange}</td>
          <td>${goal.target}</td>
          <td>
            ${progressText}
            <div style="margin-top:5px;background:#eee;border-radius:6px;overflow:hidden;">
              <div style="height:10px;width:${progressPercent}%;background:#10b981;"></div>
            </div>
          </td>
          <td>${status}</td>
          <td>
            <button onclick="deleteGoal(${index})" style="background:#ef4444;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">🗑️</button>
          </td>
        </tr>`;
      
      workoutTable.innerHTML += workoutRow;
    }

    // 📋 For all other goals: render in main goal table
    else {
      const rowHTML = `
        <tr>
          <td>${goal.type}</td>
          <td>${goal.target}</td>
          <td>${goal.deadline || '-'}</td>
          <td>
            ${progressText}
            <div style="margin-top:5px;background:#eee;border-radius:6px;overflow:hidden;">
              <div style="height:10px;width:${progressPercent}%;background:#10b981;"></div>
            </div>
          </td>
          <td>${status}</td>
          <td>
            <button onclick="deleteGoal(${index})" style="background:#ef4444;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">🗑️</button>
          </td>
        </tr>`;
      
      goalTable.innerHTML += rowHTML;
    }
  });
}


// Utility to check if timestamp is from this week
function isThisWeek(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return date >= start && date <= end;
}

// 🗑️ Delete Goal by index
window.deleteGoal = async (goalIndex) => {
  const confirmDelete = confirm("Are you sure you want to delete this goal?");
  if (!confirmDelete) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const goals = snap.data().goals || [];

  goals.splice(goalIndex, 1);
  await updateDoc(userRef, { goals });

  await renderGoals();
  await fetchAIInsight();
};

// 🧠 Fetch AI Insight based on logs & goals
async function fetchAIInsight() {
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data();

  const goals = data.goals || [];
  const workouts = data.workoutLogs || [];
  const meals = data.mealLogs || [];
  const weightLogs = data.weightLogs || [];

  const prompt = `
📌 User Goals:
${goals.map(g => `- ${g.type} → ${g.target} by ${g.deadline}`).join("\n") || "None"}

📉 Weight Progress:
${weightLogs.slice(-3).map(w =>
  `${w.date || new Date(w.timestamp || Date.now()).toLocaleDateString()}: ${w.weight || 0} lbs`
).join("\n") || "No logs"}

💪 Last Workouts:
${workouts.slice(-3).map(w =>
  `${w.type || "Workout"} (${w.duration || 0} min → ${w.caloriesBurned || 0} kcal)`
).join("\n") || "No workouts"}

🍽 Meals:
${meals.slice(-5).map(m =>
  `${m.name || "Meal"}: ${m.calories || 0} kcal`
).join("\n") || "No meals"}

💬 Give a motivating summary. Suggest 2 improvements and praise at least 1 strength.
  `.trim();

  aiResponse.textContent = "🧠 Thinking...";

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
          {
            role: "system",
            content: "You are a friendly and knowledgeable health goal AI coach. Encourage the user with clarity and support."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const result = await res.json();
    if (result.choices?.[0]?.message?.content) {
      aiResponse.textContent = result.choices[0].message.content;
    } else {
      console.warn("OpenRouter returned unexpected:", result);
      aiResponse.textContent = "⚠️ No insight received.";
    }
  } catch (error) {
    console.error("AI Error:", error);
    aiResponse.textContent = "⚠️ Failed to fetch insight.";
  }
}

const workoutRange = document.getElementById("goal-workout-range");

workoutRange.style.display = "none";

goalType.addEventListener("change", () => {
  if (goalType.value === "workoutsPerWeek") {
    workoutRange.style.display = "block";
    goalDeadline.style.display = "none";
  } else{
    workoutRange.style.display = "none";
    goalDeadline.style.display = "block";
  }
});
