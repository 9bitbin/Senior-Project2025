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
// In initializeCharts function, update the calories chart labels
function initializeCharts() {
  caloriesChart = new Chart(caloriesChartEl, {
    type: "bar",
    data: {
      labels: ["Total Calories Consumed (kcal)", "Total Calories Burned (kcal)"],
      datasets: [{
        label: "",  // Remove the redundant label
        data: [0, 0],
        backgroundColor: ["#ff9800", "#4caf50"],
        // Add individual labels for each bar
        labels: ["🔸 Total Calories Consumed (kcal)", "🔸 Total Calories Burned (kcal)"]
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: function(chart) {
              return [{
                text: '🔸 Total Calories Consumed (kcal)',
                fillStyle: '#ff9800',
                strokeStyle: '#ff9800',
                lineWidth: 0,
                hidden: false,
                index: 0
              }, {
                text: '🔸 Total Calories Burned (kcal)',
                fillStyle: '#4caf50',
                strokeStyle: '#4caf50',
                lineWidth: 0,
                hidden: false,
                index: 1
              }];
            }
          }
        }
      }
    }
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
// Update computeSmartSummary function
async function computeSmartSummary(userData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Filter meals for today using proper date comparison
    const mealsToday = (userData.mealLogs || []).filter(m => {
        const mealDate = new Date(m.timestamp || m.date);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate.toISOString().split('T')[0] === todayStr;
    });
    
    // Filter workouts for today using proper date comparison
    const workoutsToday = (userData.workoutLogs || []).filter(w => {
        const workoutDate = new Date(w.date || w.timestamp);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.toISOString().split('T')[0] === todayStr;
    });

    const caloriesToday = mealsToday.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
    const burnedToday = workoutsToday.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);

  const activeFasting = userData.activeFasting;
  const fastingText = activeFasting
    ? `Started at ${new Date(activeFasting.startTime).toLocaleTimeString()}`
    : "No active fast";

  // Get weight directly from user data or from weight logs if available
  const currentWeight = userData.weight || ((userData.weightLogs || []).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight);

  summaryCalories.innerText = `Calories Eaten Today: ${caloriesToday.toFixed(0)} kcal`;
  summaryWorkout.innerText = `Calories Burned Today: ${burnedToday} kcal`;
  summaryFasting.innerText = `Fasting: ${fastingText}`;
  summaryWeight.innerText = `Latest Weight: ${currentWeight ? currentWeight + " lbs" : "Not Logged"}`;

  // Update the calories chart data and refresh
  if (caloriesChart) {
    caloriesChart.data.datasets[0].data = [caloriesToday, burnedToday];
    caloriesChart.update();
  }

  const prompt = `
User Summary:
- Calories: ${caloriesToday} kcal
- Burned: ${burnedToday} kcal
- Fasting: ${fastingText}
- Weight: ${currentWeight || "N/A"} lbs

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
// In renderDailyTimeline function, update the time formatting
// Update renderDailyTimeline function
function renderDailyTimeline(userData) {
  const timelineEl = document.getElementById("timeline-list");
  if (!timelineEl) return;
  timelineEl.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  let events = [];

  // Filter meals for today
  (userData.mealLogs || []).forEach(meal => {
    const mealDate = new Date(meal.timestamp || meal.date);
    mealDate.setHours(0, 0, 0, 0);
    if (mealDate.toISOString().split('T')[0] === todayStr) {
      const mealTime = new Date(meal.timestamp || meal.date);
      events.push({
        time: mealTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        }),
        icon: "🥣",
        text: `Meal: ${meal.name || "Unnamed"} (${meal.calories} kcal)`
      });
    }
  });

  // Filter workouts for today
  (userData.workoutLogs || []).forEach(workout => {
    const workoutDate = new Date(workout.date || workout.timestamp);
    workoutDate.setHours(0, 0, 0, 0);
    if (workoutDate.toISOString().split('T')[0] === todayStr) {
      const workoutTime = new Date(workout.date || workout.timestamp);
      events.push({
        time: workoutTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        }),
        icon: "🏃",
        text: `Workout: ${workout.type || "Exercise"} (${workout.caloriesBurned} kcal burned)`
      });
    }
  });

  // Update updateCharts function
  function updateCharts(userData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Filter today's workouts
    const todayWorkouts = (userData.workoutLogs || []).filter(workout => {
      const workoutDate = new Date(workout.date || workout.timestamp);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.toISOString().split('T')[0] === todayStr;
    });

    // Calculate today's burned calories
    const burnedToday = todayWorkouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);

    // Get all unique workout dates for the workout chart
    const uniqueWorkouts = new Map();
    (userData.workoutLogs || []).forEach(workout => {
      const date = new Date(workout.date || workout.timestamp);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!uniqueWorkouts.has(dateStr)) {
        uniqueWorkouts.set(dateStr, workout.caloriesBurned || 0);
      }
    });

    // Sort workout dates
    const sortedDates = Array.from(uniqueWorkouts.keys()).sort();
    
    // Update workout chart
    workoutChart.data.labels = sortedDates.map(date => 
      new Date(date).toLocaleDateString()
    );
    workoutChart.data.datasets[0].data = sortedDates.map(date => 
      uniqueWorkouts.get(date)
    );
    workoutChart.update();

    // Rest of your chart updates...
  }

  // Sort and render events
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
// Add this function to fetch and update BMI
async function updateBMI() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    const height = data.height;
    const weight = data.weight || (data.weightLogs && data.weightLogs.length > 0 ? data.weightLogs[data.weightLogs.length - 1].weight : null);
    
    if (height && weight) {
      const bmi = (weight * 703) / (height * height);
      document.querySelector('#bmi-value').textContent = bmi.toFixed(1);
      document.querySelector('#bmi-category').textContent = getBMICategory(bmi);
      
      // Update BMI pointer position
      const bmiPointer = document.querySelector('#bmi-pointer');
      if (bmiPointer) {
        const position = ((bmi - 15) / (40 - 15)) * 100;
        bmiPointer.style.left = `${Math.min(Math.max(position, 0), 100)}%`;
      }
    }
  }
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Under';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Over';
  return 'Obese';
}

// Add this to your existing updateCharts function
// Update the updateCharts function to properly filter workouts by date
function updateCharts(userData) {
    const today = new Date().toISOString().split('T')[0];
    const mealLogs = userData.mealLogs || [];
    const workoutLogs = userData.workoutLogs || [];

    // Filter today's meals and workouts
    const todayMeals = mealLogs.filter(meal => {
        const mealDate = new Date(meal.timestamp || meal.date).toISOString().split('T')[0];
        return mealDate === today;
    });

    const todayWorkouts = workoutLogs.filter(workout => {
        const workoutDate = new Date(workout.date || workout.timestamp).toISOString().split('T')[0];
        return workoutDate === today;
    });

    // Calculate totals for today only
    const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalCarbs = todayMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalProtein = todayMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalFat = todayMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

    // Get workout data - sort by date
    const sortedWorkouts = [...workoutLogs].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA - dateB;
    });

    const workoutDates = sortedWorkouts.map(workout => 
        new Date(workout.timestamp).toLocaleDateString()
    );
    const workoutCaloriesData = sortedWorkouts.map(workout => workout.caloriesBurned || 0);

    // Update charts with today's data
    const totalCaloriesConsumed = todayMeals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
    const totalCaloriesBurned = todayWorkouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);
    
    caloriesChart.data.datasets[0].data = [totalCaloriesConsumed, totalCaloriesBurned];
    caloriesChart.update();
    
    // Update summary elements if they exist
    if (summaryCalories) summaryCalories.innerText = `Calories Eaten Today: ${totalCaloriesConsumed.toFixed(0)} kcal`;
    if (summaryWorkout) summaryWorkout.innerText = `Calories Burned Today: ${totalCaloriesBurned.toFixed(0)} kcal`;

    // Macro Chart Update
    macroChart.data.datasets[0].data = [totalCarbs, totalProtein, totalFat];
    macroChart.update();

    // Workout Chart Update
    workoutChart.data.labels = workoutDates;
    workoutChart.data.datasets[0].data = workoutCaloriesData;
    workoutChart.update();

    // Budget chart data processing
    const mealBudget = userData.mealBudget || { expenses: [], totalSpent: 0, amount: 0 };
    const budgetExpenses = mealBudget.expenses || [];
    
    const sortedExpenses = [...budgetExpenses].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const dailyTotals = {};
    let runningTotal = 0;
    
    sortedExpenses.forEach(exp => {
        const expDate = new Date(exp.timestamp);
        const dateKey = expDate.toLocaleDateString();
        const cost = parseFloat(exp.cost);
        
        runningTotal += cost;
        dailyTotals[dateKey] = runningTotal;
    });
    
    const budgetDates = Object.keys(dailyTotals).sort((a, b) => 
        new Date(a) - new Date(b)
    );
    const budgetSpent = budgetDates.map(date => dailyTotals[date]);
    
    // Update budget chart
    budgetChart.data.labels = budgetDates;
    budgetChart.data.datasets[0].data = budgetSpent;
    budgetChart.data.datasets[1].data = new Array(budgetDates.length).fill(mealBudget.amount);
    budgetChart.update();

    // Update summary and timeline
    computeSmartSummary(userData);
    renderDailyTimeline(userData);
    updateBMI(); // Call updateBMI here
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




