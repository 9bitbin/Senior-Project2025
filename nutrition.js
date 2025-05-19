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
const mealDateInput = document.getElementById("meal-date"); 

// Run the fix function when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait for authentication to complete
  auth.onAuthStateChanged(async user => {
    if (user) {
      // Try to fix any incorrectly dated meals
      await fixIncorrectMealDates();
    }
  });
});

// ✅ Set max date for meal date input to today
if (mealDateInput) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  mealDateInput.setAttribute('max', today.toISOString().split('T')[0]);
  mealDateInput.value = today.toISOString().split('T')[0];
  
  mealDateInput.addEventListener('change', () => {
    const mealTimeInput = document.getElementById('meal-time');
    if (!mealTimeInput) return;
    
    const selectedDate = new Date(mealDateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Compare only year, month, day for strict past date
    // The time input should only be visible for dates strictly before today.
    const selectedDateISO = selectedDate.toISOString().split('T')[0];
    const todayISO = today.toISOString().split('T')[0];
    const isStrictlyPast = selectedDateISO < todayISO;
    if (isStrictlyPast) {
      mealTimeInput.style.display = 'block';
      document.querySelector('label[for="meal-time"]').style.display = 'block';
      mealTimeInput.value = '12:00';
    } else {
      mealTimeInput.style.display = 'none';
      document.querySelector('label[for="meal-time"]').style.display = 'none';
      mealTimeInput.value = '';
    }
  });
  
  mealDateInput.dispatchEvent(new Event('change'));
}

const aiBtn = document.getElementById("ai-feedback-btn");
const aiOutput = document.getElementById("ai-feedback-output");
const chartCtx = document.getElementById("calorieChart")?.getContext("2d");

let calorieChart = null;

// ✅ Ensure elements exist before adding event listeners
// This section uses optional chaining to prevent errors when elements don't exist

// const mealDateInput = document.getElementById("meal-date");

// Modify the fetchNutritionBtn event listener


// const mealDateInput = document.getElementById("meal-date");

// Modify the fetchNutritionBtn event listener
if (fetchNutritionBtn) {
  fetchNutritionBtn.addEventListener("click", async () => {
    if (!foodInput) return;
    const query = foodInput.value.trim();
    if (!query) return alert("❌ Please enter a food item.");
  
    const data = await fetchNutritionData(query);
    if (!data || data.items.length === 0) return alert("⚠️ No nutrition data found.");
  
    // Get the selected date or default to today
    let mealDate;
    
    if (mealDateInput && mealDateInput.value) {
      const selectedDateStr = mealDateInput.value;
      const mealTimeInput = document.getElementById("meal-time");
      
      // Create date object from selected date - ensure it's treated as local time
      // by explicitly parsing year, month, day, hours, minutes
      const dateTimeParts = selectedDateStr.split('T');
      const dateParts = dateTimeParts[0].split('-').map(Number);
      const year = dateParts[0];
      const month = dateParts[1] - 1; // JavaScript months are 0-indexed
      const day = dateParts[2];
      
      mealDate = new Date(year, month, day);
      
      // If time input is visible and has a value, use it
      if (mealTimeInput && mealTimeInput.style.display !== 'none' && mealTimeInput.value) {
        const [hours, minutes] = mealTimeInput.value.split(':').map(Number);
        mealDate.setHours(hours, minutes, 0, 0);
      } else if (dateTimeParts.length > 1) {
        // If datetime-local has time component
        const timeParts = dateTimeParts[1].split(':').map(Number);
        mealDate.setHours(timeParts[0], timeParts[1], 0, 0);
      } else {
        // If no time input or hidden (today's date), use current time
        const now = new Date();
        mealDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
    } else {
      mealDate = new Date();
      mealDate.setSeconds(0, 0); // Reset seconds and milliseconds
    }
    
    const foodItem = data.items[0];
    // Create a consistent date string for display and grouping
    const year = mealDate.getFullYear();
    const month = String(mealDate.getMonth() + 1).padStart(2, '0');
    const day = String(mealDate.getDate()).padStart(2, '0');
    const dateStr = `${month}/${day}/${year}`;
    
    const meal = {
      name: query,
      calories: foodItem.calories || 0,
      protein: foodItem.protein_g || 0,
      carbs: foodItem.carbohydrates_total_g || 0,
      fat: foodItem.fat_total_g || 0,
      timestamp: mealDate.toISOString(),
      // Store the formatted date string for consistent display
      localDate: dateStr,
      // Store local date components to ensure correct grouping
      localYear: year,
      localMonth: month,
      localDay: day
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

// ✅ Fix incorrectly dated meals (5/18 -> 5/19)
async function fixIncorrectMealDates() {
  const user = auth.currentUser;
  if (!user) return false;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];
  let hasChanges = false;

  // Look for meals logged on 5/18 that should be on 5/19
  meals = meals.map(meal => {
    // Check if this is a meal from 5/18 that was logged today (5/19)
    const mealDate = new Date(meal.timestamp);
    const today = new Date();
    
    // Only process meals from 5/18/2025
    if (mealDate.getFullYear() === 2025 && 
        mealDate.getMonth() === 4 && // May is month 4 (0-indexed)
        mealDate.getDate() === 18) {
      
      // Check if this meal was logged recently (in the last 24 hours)
      const hoursSinceLogged = (today - mealDate) / (1000 * 60 * 60);
      
      // If logged in the last 24 hours, it's likely a 5/19 meal incorrectly showing as 5/18
      if (hoursSinceLogged < 24) {
        hasChanges = true;
        
        // Create a new date object for 5/19 with the same time
        const correctedDate = new Date(mealDate);
        correctedDate.setDate(19); // Set to the 19th
        
        // Create the correct local date components
        const year = correctedDate.getFullYear();
        const month = String(correctedDate.getMonth() + 1).padStart(2, '0');
        const day = String(correctedDate.getDate()).padStart(2, '0');
        const dateStr = `${month}/${day}/${year}`;
        
        return {
          ...meal,
          timestamp: correctedDate.toISOString(),
          localDate: dateStr,
          localYear: year,
          localMonth: month,
          localDay: day
        };
      }
    }
    return meal;
  });

  // Save the updated meals if changes were made
  if (hasChanges) {
    try {
      await updateDoc(userDocRef, { 
        mealLogs: meals,
        lastMealUpdate: new Date().toISOString()
      });
      console.log("✅ Fixed incorrect meal dates");
      return true;
    } catch (error) {
      console.error("Error fixing meal dates:", error);
      return false;
    }
  }
  return false;
}

// ✅ Save Meal to Firestore
async function saveMealToFirestore(meal) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

  // Create a new Date object from the meal's timestamp
  const mealDate = new Date(meal.timestamp);
  
  // Format the local date string consistently
  meal.localDate = mealDate.toLocaleDateString('en-US');
  
  meals.push(meal);

  try {
    // Update meal logs
    await updateDoc(userDocRef, { 
      mealLogs: meals,
      lastMealUpdate: new Date().toISOString()
    });

    // Calculate total calories for the meal's actual date
    const mealDateStr = mealDate.toISOString().split('T')[0];
    const dayMeals = meals.filter(m => 
      new Date(m.timestamp).toISOString().split('T')[0] === mealDateStr
    );
    const dayCalories = dayMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);

    // Update both displays with accurate total
    await updateDoc(userDocRef, {
      todayTotalCalories: dayCalories
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

// In the fetchLoggedMeals function
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
    
    // Create a date object from the timestamp
    const mealDate = new Date(meal.timestamp);
    
    // Get date components in local timezone
    // Important: Use getDate(), not getUTCDate() to ensure we're using local time
    const year = mealDate.getFullYear();
    const month = String(mealDate.getMonth() + 1).padStart(2, '0');
    const day = String(mealDate.getDate()).padStart(2, '0');
    const dateKey = `${month}/${day}/${year}`;
    
    if (!dailyCalories[dateKey]) dailyCalories[dateKey] = 0;
    dailyCalories[dateKey] += calories;
  });

  // Only show days present in filtered meals
  const sortedDates = Object.keys(dailyCalories);
  sortedDates.sort((a, b) => new Date(a) - new Date(b));

  // Update meal history display
  if (dailyBreakdownEl) {
    dailyBreakdownEl.innerHTML = "";
    
    sortedDates.slice().reverse().forEach(dateKey => {
      // Only use filtered meals for this day
      const dayMeals = meals.filter(m => {
        // For older meals that don't have the local components
        if (!m.localYear || !m.localMonth || !m.localDay) {
          const mealDate = new Date(m.timestamp);
          const year = mealDate.getFullYear();
          const month = String(mealDate.getMonth() + 1).padStart(2, '0');
          const day = String(mealDate.getDate()).padStart(2, '0');
          const mealDateKey = `${month}/${day}/${year}`;
          return mealDateKey === dateKey;
        }
        
        // For newer meals with stored local components
        const mealDateKey = `${m.localMonth}/${m.localDay}/${m.localYear}`;
        return mealDateKey === dateKey;
      });

      if (dayMeals.length === 0) return; // Skip days with no meals in filtered range

      const dayBlock = document.createElement("div");
      dayBlock.className = "day-block";

      const displayDate = dateKey;
      dayBlock.innerHTML = `<h4>📅 ${displayDate} — ${Math.round(dailyCalories[dateKey])} kcal</h4>`;

      // Sort meals chronologically within the day (earliest first)
      dayMeals.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      
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










