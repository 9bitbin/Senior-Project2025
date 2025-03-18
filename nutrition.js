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


