// ✅ Import Firebase 
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ API Configuration (Calorieninjas API)
const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";
const API_URL = "https://api.calorieninjas.com/v1/nutrition?query=";

// ✅ Select Elements Safely
const foodInput = document.getElementById("food-input");
const fetchNutritionBtn = document.getElementById("fetch-nutrition");
const mealList = document.getElementById("meal-list");
const totalCaloriesEl = document.getElementById("total-calories");
const averageCaloriesEl = document.getElementById("average-calories");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const filterMealsBtn = document.getElementById("filter-meals");
const resetMealsBtn = document.getElementById("reset-meals");

// ✅ Ensure elements exist before adding event listeners
if (fetchNutritionBtn) {
    fetchNutritionBtn.addEventListener("click", async () => {
        if (!foodInput) return;

        const query = foodInput.value.trim();
        if (!query) {
            alert("❌ Please enter a food item.");
            return;
        }

        const data = await fetchNutritionData(query);
        if (!data || data.items.length === 0) {
            alert("⚠️ No nutrition data found.");
            return;
        }

        const foodItem = data.items[0];
        const now = new Date().toISOString(); // ✅ Convert to ISO string

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

        if (!response.ok) {
            throw new Error("❌ Failed to fetch nutrition data.");
        }

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

    meal.timestamp = new Date().toISOString(); // ✅ Use ISO string format

    meals.push(meal);

    try {
        await updateDoc(userDocRef, { mealLogs: meals });
        fetchLoggedMeals(); // ✅ Refresh meal history
    } catch (error) {
        console.error("❌ Error saving meal:", error);
    }
}

// ✅ Fetch & Display Logged Meals
async function fetchLoggedMeals(startDate = null, endDate = null) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let meals = userDoc.data().mealLogs || [];
        let totalCalories = 0;
        let dailyCalories = {};

        console.log("🔥 Original Meals from Firestore:", meals);

        // ✅ Convert and Filter Meals by Date
        if (startDate && endDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);

            console.log("🟢 Start Date:", new Date(start).toISOString());
            console.log("🟢 End Date:", new Date(end).toISOString());

            meals = meals.filter(meal => {
                if (!meal.timestamp) return false;
                const mealDate = new Date(meal.timestamp).getTime();
                console.log(`🔍 Checking Meal: ${meal.name}, Timestamp: ${meal.timestamp}, Converted: ${mealDate}`);

                return mealDate >= start && mealDate <= end;
            });
        }

        console.log("✅ Filtered Meals:", meals);

        // ✅ Process Meals for Display
        meals.forEach(meal => {
            totalCalories += meal.calories;

            const mealDate = new Date(meal.timestamp).toISOString().split("T")[0];
            if (!dailyCalories[mealDate]) {
                dailyCalories[mealDate] = 0;
            }
            dailyCalories[mealDate] += meal.calories;
        });

        // ✅ Update UI Safely
        if (averageCaloriesEl) {
            averageCaloriesEl.innerText = Math.round(totalCalories / (Object.keys(dailyCalories).length || 1));
        }
        if (totalCaloriesEl) {
            totalCaloriesEl.innerText = totalCalories;
        }

        if (mealList) {
            mealList.innerHTML = meals.length > 0
                ? meals.map(meal => `
                    <li>
                        <strong>${meal.name}</strong>: ${meal.calories} kcal
                        <br>Protein: ${meal.protein} g, Carbs: ${meal.carbs} g, Fat: ${meal.fat} g
                        <br><em>Logged on: ${new Date(meal.timestamp).toLocaleString()}</em>
                    </li>`).join("")
                : "<li>No meals logged for this date range.</li>";
        }
    }
}

// ✅ Ensure Buttons Exist Before Adding Event Listeners
if (filterMealsBtn) {
    filterMealsBtn.addEventListener("click", () => {
        if (!startDateInput || !endDateInput) return;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        console.log("🟢 Filtering Meals with:", startDate, endDate);

        if (!startDate || !endDate) {
            alert("⚠️ Please select a valid date range.");
            return;
        }

        fetchLoggedMeals(startDate, endDate);
    });
}

if (resetMealsBtn) {
    resetMealsBtn.addEventListener("click", () => {
        console.log("🔄 Resetting Meal Filters...");
        if (startDateInput) startDateInput.value = "";
        if (endDateInput) endDateInput.value = "";
        fetchLoggedMeals(); // ✅ Reloads all meals
    });
}

// ✅ Fetch Meals on Load
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById("download-meals")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const mealLogs = userDoc.exists() ? userDoc.data().mealLogs || [] : [];
  
    if (!mealLogs.length) {
      alert("No meals to export.");
      return;
    }
  
    const headers = ["Food", "Calories", "Protein", "Carbs", "Fat", "Timestamp"];
    const rows = mealLogs.map(meal => [
      `"${meal.name || ''}"`,
      meal.calories || 0,
      meal.protein || 0,
      meal.carbs || 0,
      meal.fat || 0,
      `"${new Date(meal.timestamp).toLocaleString()}"`
    ]);
  
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\\n");
  
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


// ✅ AI Feedback for Meal History
const aiBtn = document.getElementById("ai-feedback-btn");
const aiOutput = document.getElementById("ai-feedback-output");

if (aiBtn) {
  aiBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.exists() ? userDoc.data() : {};
    const meals = data.mealLogs || [];

    if (meals.length === 0) {
      aiOutput.innerText = "You have no meal logs yet.";
      return;
    }

    const sample = meals.slice(-7).map(meal => {
      return `${meal.name} | ${meal.calories} kcal | Protein: ${meal.protein}g, Carbs: ${meal.carbs}g, Fat: ${meal.fat}g`;
    }).join("\\n");

    const prompt = `You're a health and nutrition expert. Based on the following meal log, give a short summary of how healthy the person's eating habits are. Suggest 2 improvements.\\n\\nMeal Log:\\n${sample}`;

    aiOutput.innerText = "🧠 Thinking...";
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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", // Replace with your OpenRouter key
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


