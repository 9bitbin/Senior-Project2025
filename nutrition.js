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


// const mealDateInput = document.getElementById("meal-date");

// Modify the fetchNutritionBtn event listener
if (fetchNutritionBtn) {
  fetchNutritionBtn.addEventListener("click", async () => {
    if (!foodInput) return;
    const query = foodInput.value.trim();
    if (!query) return alert("❌ Please enter a food item.");

    const data = await fetchNutritionData(query);
    if (!data || data.items.length === 0) return alert("⚠️ No nutrition data found.");

    const foodItem = data.items[0];
    const meal = {
      name: query,
      calories: foodItem.calories || 0,
      protein: foodItem.protein_g || 0,
      carbs: foodItem.carbohydrates_total_g || 0,
      fat: foodItem.fat_total_g || 0,
      timestamp: new Date().toISOString(),
      localDate: new Date().toLocaleDateString('en-US') // <-- Add this line
    };

    saveMealToFirestore(meal);
    foodInput.value = ""; // Clear input after successful save
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

  meals.push(meal);

  try {
    // Update meal logs
    await updateDoc(userDocRef, { 
      mealLogs: meals,
      lastMealUpdate: new Date().toISOString()
    });

    // Calculate total calories for today
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = meals.filter(m => 
      new Date(m.timestamp).toISOString().split('T')[0] === today
    );
    const todayCalories = todayMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);

    // Update both displays with accurate total
    await updateDoc(userDocRef, {
      todayTotalCalories: todayCalories
    });

    fetchLoggedMeals();
    
    // Try to update goals page if available
    if (typeof window.renderGoals === 'function') {
      window.renderGoals();
    }
  } catch (error) {
    console.error("❌ Error saving meal:", error);
  }
}

// At the bottom of the file, replace the existing export with:
window.updateNutritionDisplay = fetchLoggedMeals;
window.getCurrentDayCalories = async () => {
  const user = auth.currentUser;
  if (!user) return 0;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const meals = userDoc.data()?.mealLogs || [];
  const today = new Date().toISOString().split('T')[0];
  
  return meals
    .filter(meal => new Date(meal.timestamp).toISOString().split('T')[0] === today)
    .reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
};

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

  // Filter by date range if provided
  if (startDate && endDate) {
    // Convert filter dates to numbers in YYYYMMDD format
    const startNum = Number(startDate.replace(/-/g, ''));
    const endNum = Number(endDate.replace(/-/g, ''));

    meals = meals.filter(meal => {
      // Get the meal's local date in YYYY-MM-DD
      const mealDateObj = new Date(meal.timestamp);
      const year = mealDateObj.getFullYear();
      const month = String(mealDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(mealDateObj.getDate()).padStart(2, '0');
      const mealLocalISO = `${year}-${month}-${day}`;
      const mealNum = Number(mealLocalISO.replace(/-/g, ''));
      return mealNum >= startNum && mealNum <= endNum;
    });
  }

  // Process meals
  meals.forEach(meal => {
    const calories = Number(meal.calories) || 0;
    totalCalories += calories;
    // Use local date string for grouping to avoid UTC/ISO issues
    const dateKey = new Date(meal.timestamp).toLocaleDateString('en-US');
    if (!dailyCalories[dateKey]) dailyCalories[dateKey] = 0;
    dailyCalories[dateKey] += calories;
  });

  // Only show days present in filtered meals
  let sortedDates = Object.keys(dailyCalories);
  sortedDates.sort((a, b) => new Date(a) - new Date(b));

  // Update meal history display
  if (dailyBreakdownEl) {
    dailyBreakdownEl.innerHTML = "";
    sortedDates.slice().reverse().forEach(dateKey => {
      // Only use filtered meals for this day
      const dayMeals = meals.filter(m =>
        new Date(m.timestamp).toLocaleDateString('en-US') === dateKey
      );

      if (dayMeals.length === 0) return; // Skip days with no meals in filtered range

      const dayBlock = document.createElement("div");
      dayBlock.className = "day-block";
      const displayDate = dateKey;
      dayBlock.innerHTML = `<h4>📅 ${displayDate} — ${Math.round(dailyCalories[dateKey])} kcal</h4>`;

      dayMeals.forEach(meal => {
        const mealEl = document.createElement("div");
        mealEl.className = "meal-entry";
        mealEl.innerHTML = `
          <strong>${meal.name}</strong>: ${Math.round(meal.calories)} kcal<br>
          Protein: ${meal.protein.toFixed(1)} g, Carbs: ${meal.carbs.toFixed(1)} g, Fat: ${meal.fat.toFixed(1)} g
          <em>Logged on: ${new Date(meal.timestamp).toLocaleString()}</em>
        `;
        dayBlock.appendChild(mealEl);
      });

      dailyBreakdownEl.appendChild(dayBlock);
    });
  }

  // Render chart
  if (chartCtx) {
    await renderCalorieChart(
      sortedDates, // Already local date strings
      sortedDates.map(dateKey => Math.round(dailyCalories[dateKey])),
      calorieGoal
    );
  }
  // Update UI elements
  if (totalCaloriesEl) totalCaloriesEl.textContent = Math.round(totalCalories) + " kcal";
  if (averageCaloriesEl) {
    if (sortedDates.length === 0) {
      averageCaloriesEl.textContent = "0 kcal";
    } else {
      const avgCalories = totalCalories / sortedDates.length;
      averageCaloriesEl.textContent = Math.round(avgCalories) + " kcal";
    }
  }
}

// ✅ Render Chart
async function renderCalorieChart(labels, values, goal) {
  if (!chartCtx) return;

  if (calorieChart) calorieChart.destroy();

  calorieChart = new Chart(chartCtx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Calories",
          data: values,
          backgroundColor: values.map(val => val > goal ? "#f87171" : "#34d399"),
          borderRadius: 6,
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        {
          type: "line",
          label: "Calorie Goal",
          data: Array(labels.length).fill(goal),
          borderColor: "#facc15",
          borderWidth: 3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(goal * 1.2, ...values, 2500),
          grid: {
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          }
        }
      },
      layout: {
        padding: 0
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            boxWidth: 12,
            padding: 15
          }
        }
      }
    }
  });
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











