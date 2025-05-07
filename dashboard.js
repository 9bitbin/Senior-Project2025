import { db, auth } from "./firebase-config.js";
import { doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Select Canvas Elements
const caloriesChartEl = document.getElementById("caloriesChart").getContext("2d");
const macroChartEl = document.getElementById("macroChart").getContext("2d");
const workoutChartEl = document.getElementById("workoutChart").getContext("2d");
const budgetChartEl = document.getElementById("budgetChart").getContext("2d");

// 🔹 Chart Instances
let caloriesChart, macroChart, workoutChart, budgetChart;

// 🔹 Smart Summary Elements
const summaryCalories = document.getElementById("summary-calories");
const summaryWorkout = document.getElementById("summary-workout");
const summaryFasting = document.getElementById("summary-fasting");
const summaryWeight = document.getElementById("summary-weight");
const aiSummaryText = document.getElementById("ai-summary-text");

// 🔹 Initialize Charts
function initializeCharts() {
  caloriesChart = new Chart(caloriesChartEl, {
    type: "bar",
    data: {
      labels: ["Calories Consumed", "Calories Burned"],
      datasets: [{
        label: "Calories (kcal)",
        data: [0, 0],
        backgroundColor: ["#ff9800", "#4caf50"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  macroChart = new Chart(macroChartEl, {
    type: "pie",
    data: {
      labels: ["Carbs", "Protein", "Fats"],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ["#2196f3", "#f44336", "#ffeb3b"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  workoutChart = new Chart(workoutChartEl, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Calories Burned per Workout",
        data: [],
        backgroundColor: "#673ab7"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Workout Date" } },
        y: { title: { display: true, text: "Calories Burned" } }
      }
    }
  });

  budgetChart = new Chart(budgetChartEl, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Spent", data: [], borderColor: "#f44336", fill: false },
        { label: "Budget", data: [], borderColor: "#4caf50", fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Amount ($)" } }
      }
    }
  });
}

// 🔹 Smart Summary Computation
async function computeSmartSummary(userData) {
  const today = new Date().toISOString().split("T")[0];

  const mealsToday = (userData.mealLogs || []).filter(m => m.timestamp?.startsWith(today));
  const caloriesToday = mealsToday.reduce((sum, m) => sum + (m.calories || 0), 0);

  const workoutsToday = (userData.workoutLogs || []).filter(w => w.timestamp?.startsWith(today));
  const burnedToday = workoutsToday.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  const activeFasting = userData.activeFasting;
  const fastingText = activeFasting
    ? `Started at ${new Date(activeFasting.startTime).toLocaleTimeString()}`
    : "No active fast";

  const lastWeight = (userData.weightLogs || []).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  summaryCalories.innerText = `Calories Eaten Today: ${caloriesToday.toFixed(0)} kcal`;
  summaryWorkout.innerText = `Calories Burned Today: ${burnedToday} kcal`;
  summaryFasting.innerText = `Fasting: ${fastingText}`;
  summaryWeight.innerText = `Latest Weight: ${lastWeight ? lastWeight.weight + " lbs" : "Not Logged"}`;

  const prompt = `
User Summary:
- Calories: ${caloriesToday} kcal
- Burned: ${burnedToday} kcal
- Fasting: ${fastingText}
- Weight: ${lastWeight?.weight || "N/A"} lbs

Provide a brief AI health insight based on the above.
  `.trim();

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA Smart Summary"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a motivational health assistant." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await res.json();
    aiSummaryText.innerText = data.choices?.[0]?.message?.content || "⚠️ No AI response.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    aiSummaryText.innerText = "⚠️ Failed to generate AI insight.";
  }
}

// 🔹 Render Unified Daily Timeline
function renderDailyTimeline(userData) {
  const timelineEl = document.getElementById("timeline-list");
  if (!timelineEl) return;
  timelineEl.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];
  let events = [];

  (userData.mealLogs || []).forEach(meal => {
    if (meal.timestamp?.startsWith(today)) {
      events.push({
        time: meal.timestamp.slice(11, 16),
        icon: "🥣",
        text: `Meal: ${meal.name || "Unnamed"} (${meal.calories} kcal)`
      });
    }
  });

  (userData.workoutLogs || []).forEach(workout => {
    if (workout.timestamp?.startsWith(today)) {
      events.push({
        time: workout.timestamp.slice(11, 16),
        icon: "🏃",
        text: `Workout: ${workout.name || "Exercise"} (${workout.caloriesBurned} kcal burned)`
      });
    }
  });

  (userData.weightLogs || []).forEach(entry => {
    if (entry.date?.startsWith(today)) {
      events.push({
        time: entry.date.slice(11, 16),
        icon: "⚖️",
        text: `Weight Logged: ${entry.weight} lbs`
      });
    }
  });

  if (userData.activeFasting?.startTime?.startsWith(today)) {
    events.push({
      time: new Date(userData.activeFasting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      icon: "⏳",
      text: "Fasting Started"
    });
  }

  events.sort((a, b) => a.time.localeCompare(b.time));

  if (events.length === 0) {
    timelineEl.innerHTML = `<li style="text-align:center; color:gray;">No logs yet for today.</li>`;
    return;
  }

  events.forEach(e => {
    const item = document.createElement("li");
    item.style.marginBottom = "12px";
    item.innerHTML = `<span style="font-size:18px;">${e.icon}</span> <strong>${e.time}</strong> — ${e.text}`;
    timelineEl.appendChild(item);
  });
}

// 🔹 Combined Chart + Summary Updater
function updateCharts(userData) {
  const mealLogs = userData.mealLogs || [];
  const totalCalories = mealLogs.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const totalCarbs = mealLogs.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalProtein = mealLogs.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalFat = mealLogs.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  const workoutLogs = userData.workoutLogs || [];
  const workoutDates = workoutLogs.map(workout => new Date(workout.timestamp).toLocaleDateString());
  const workoutCaloriesData = workoutLogs.map(workout => workout.caloriesBurned || 0);

  const mealBudget = userData.mealBudget || { expenses: [], totalSpent: 0, amount: 0 };
  const budgetExpenses = mealBudget.expenses || [];
  const budgetDates = budgetExpenses.map(entry => new Date(entry.timestamp).toLocaleDateString());
  const budgetSpent = budgetExpenses.map(entry => entry.cost || 0);
  const budgetAllocated = mealBudget.amount;

  caloriesChart.data.datasets[0].data = [totalCalories, workoutCaloriesData.reduce((a, b) => a + b, 0)];
  caloriesChart.update();

  macroChart.data.datasets[0].data = [totalCarbs, totalProtein, totalFat];
  macroChart.update();

  workoutChart.data.labels = workoutDates;
  workoutChart.data.datasets[0].data = workoutCaloriesData;
  workoutChart.update();

  budgetChart.data.labels = budgetDates;
  budgetChart.data.datasets[0].data = budgetSpent;
  budgetChart.data.datasets[1].data = new Array(budgetDates.length).fill(budgetAllocated);
  budgetChart.update();

  computeSmartSummary(userData);
  renderDailyTimeline(userData); // 🆕 Timeline feature
}

// 🔹 Real-Time Listener
auth.onAuthStateChanged(user => {
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  onSnapshot(userDocRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const userData = docSnapshot.data();
      updateCharts(userData);
    }
  });
});

// 🔹 Initialize on Load
initializeCharts();

// Sidebar Navigation
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".content-section");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
      sections.forEach(section => section.classList.remove("active"));
      const targetId = item.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });
});




