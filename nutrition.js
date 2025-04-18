// ✅ Import Firebase 
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ API Configuration (Calorieninjas API)
const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";
const API_URL = "https://api.calorieninjas.com/v1/nutrition?query=";

// ✅ Select Elements
const foodInput = document.getElementById("food-input");
const fetchNutritionBtn = document.getElementById("fetch-nutrition");
const mealList = document.getElementById("meal-list");
const totalCaloriesEl = document.getElementById("total-calories");
const averageCaloriesEl = document.getElementById("average-calories");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const filterMealsBtn = document.getElementById("filter-meals");
const resetMealsBtn = document.getElementById("reset-meals");
const dailyBreakdownEl = document.getElementById("daily-calorie-breakdown");

const aiBtn = document.getElementById("ai-feedback-btn");
const aiOutput = document.getElementById("ai-feedback-output");
const chartCtx = document.getElementById("calorieChart")?.getContext("2d");

let calorieChart = null;

// ✅ Ensure elements exist before adding event listeners
if (fetchNutritionBtn) {
  fetchNutritionBtn.addEventListener("click", async () => {
    if (!foodInput) return;
    const query = foodInput.value.trim();
    if (!query) return alert("❌ Please enter a food item.");

    const data = await fetchNutritionData(query);
    if (!data || data.items.length === 0) return alert("⚠️ No nutrition data found.");

    const foodItem = data.items[0];
    const now = new Date().toISOString();

    const meal = {
      name: query,
      calories: foodItem.calories || 0,
      protein: foodItem.protein_g || 0,
      carbs: foodItem.carbohydrates_total_g || 0,
      fat: foodItem.fat_total_g || 0,
      timestamp: now
    };

    saveMealToFirestore(meal);
  });
}

// ✅ Fetch Nutrition Data from API
async function fetchNutritionData(query) {
  try {
    const response = await fetch(API_URL + encodeURIComponent(query), {
      method: "GET",
      headers: { "X-Api-Key": API_KEY }
    });

    if (!response.ok) throw new Error("❌ Failed to fetch nutrition data.");
    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching nutrition data:", error);
    return null;
  }
}

// ✅ Save Meal to Firestore
async function saveMealToFirestore(meal) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

  meal.timestamp = new Date().toISOString();
  meals.push(meal);

  try {
    await updateDoc(userDocRef, { mealLogs: meals });
    fetchLoggedMeals(); // Refresh UI
  } catch (error) {
    console.error("❌ Error saving meal:", error);
  }
}

// ✅ Render Chart
async function renderCalorieChart(dailyCalories, goal) {
  if (!chartCtx) return;

  const labels = Object.keys(dailyCalories);
  const values = Object.values(dailyCalories);
  const backgroundColors = values.map(val => val > goal ? "#f87171" : "#34d399");

  if (calorieChart) calorieChart.destroy();

  calorieChart = new Chart(chartCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Calories",
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 6
        },
        {
          type: "line",
          label: "Calorie Goal",
          data: Array(labels.length).fill(goal),
          borderColor: "#facc15",
          borderWidth: 2,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Calories" }
        }
      },
      plugins: {
        legend: { position: "top" }
      }
    }
  });
}

// ✅ Fetch & Display Logged Meals
async function fetchLoggedMeals(startDate = null, endDate = null) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) return;

  const calorieGoal = userDoc.data().calorieGoal || 2000;
  let meals = userDoc.data().mealLogs || [];
  let totalCalories = 0;
  let dailyCalories = {};

  // ✅ Filter by date range
  if (startDate && endDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    meals = meals.filter(meal => {
      const mealDate = new Date(meal.timestamp).getTime();
      return mealDate >= start && mealDate <= end;
    });
  }

  // ✅ Aggregate data
  meals.forEach(meal => {
    totalCalories += meal.calories;
    const date = new Date(meal.timestamp).toISOString().split("T")[0];
    if (!dailyCalories[date]) dailyCalories[date] = 0;
    dailyCalories[date] += meal.calories;
  });

  // ✅ UI: totals
  totalCaloriesEl.innerText = totalCalories;
  averageCaloriesEl.innerText = Math.round(totalCalories / (Object.keys(dailyCalories).length || 1));

  // ✅ UI: Grouped by day
  if (dailyBreakdownEl) {
    dailyBreakdownEl.innerHTML = "";

    const mealMap = {};
    meals.forEach(meal => {
      const date = new Date(meal.timestamp).toISOString().split("T")[0];
      if (!mealMap[date]) mealMap[date] = [];
      mealMap[date].push(meal);
    });

    Object.entries(mealMap).forEach(([date, mealsForDate]) => {
      const formattedDate = new Date(date).toLocaleDateString();
      const dailyKcal = Math.round(dailyCalories[date]);

      const dayBlock = document.createElement("div");
      dayBlock.className = "day-block";
      dayBlock.innerHTML = `<h4>📅 ${formattedDate} — ${dailyKcal} kcal</h4>`;

      mealsForDate.forEach(meal => {
        const mealEl = document.createElement("div");
        mealEl.className = "meal-entry";
        mealEl.innerHTML = `
          <strong>${meal.name}</strong>: ${meal.calories} kcal<br>
          Protein: ${meal.protein} g, Carbs: ${meal.carbs} g, Fat: ${meal.fat} g
          <em>Logged on: ${new Date(meal.timestamp).toLocaleString()}</em>
        `;
        dayBlock.appendChild(mealEl);
      });

      dailyBreakdownEl.appendChild(dayBlock);
    });
  }

  if (mealList) mealList.innerHTML = "";

  // ✅ Render chart
  await renderCalorieChart(dailyCalories, calorieGoal);
}

// ✅ Date Filters
filterMealsBtn?.addEventListener("click", () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  if (!startDate || !endDate) return alert("⚠️ Please select a valid date range.");
  fetchLoggedMeals(startDate, endDate);
});

resetMealsBtn?.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  fetchLoggedMeals();
});

// ✅ Fetch on Load
auth.onAuthStateChanged(user => {
  if (user) fetchLoggedMeals();
  else window.location.href = "index.html";
});

// ✅ CSV Export
document.getElementById("download-meals")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  const mealLogs = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

  if (!mealLogs.length) return alert("No meals to export.");

  const headers = ["Food", "Calories", "Protein", "Carbs", "Fat", "Timestamp"];
  const rows = mealLogs.map(meal => [
    `"${meal.name || ''}"`,
    meal.calories || 0,
    meal.protein || 0,
    meal.carbs || 0,
    meal.fat || 0,
    `"${new Date(meal.timestamp).toLocaleString()}"`
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "meal-history.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// ✅ AI Feedback Button with Daily Calorie Summary + Calorie Goal Analysis
if (aiBtn) {
  aiBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.exists() ? userDoc.data() : {};
    const meals = data.mealLogs || [];
    const calorieGoal = data.calorieGoal || 2000;

    if (!meals.length) {
      aiOutput.innerText = "You have no meal logs yet.";
      return;
    }

    const dayMap = {};
    meals.forEach(meal => {
      const date = new Date(meal.timestamp).toISOString().split("T")[0];
      if (!dayMap[date]) dayMap[date] = 0;
      dayMap[date] += meal.calories;
    });

    const trend = Object.entries(dayMap).map(([date, cal]) => {
      return `${new Date(date).toLocaleDateString()}: ${Math.round(cal)} kcal`;
    }).join("\n");

    const overDays = Object.values(dayMap).filter(cal => cal > calorieGoal).length;
    const prompt = `You are a health coach. Analyze the user's daily calorie intake:\n\n${trend}\n\nCalorie Goal: ${calorieGoal} kcal\nThey went over goal on ${overDays} day(s).\n\nProvide a short summary and suggest 2 personalized improvements.`

    aiOutput.innerText = "🧠 Thinking...";
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const result = await res.json();
      aiOutput.innerText = result.choices?.[0]?.message?.content || "No response.";
    } catch (err) {
      console.error(err);
      aiOutput.innerText = "⚠️ Failed to get feedback.";
    }
  });
}





