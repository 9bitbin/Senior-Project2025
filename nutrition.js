// Import Firebase
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 API Configuration (Calorieninjas API)
const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";
const API_URL = "https://api.calorieninjas.com/v1/nutrition?query=";

// 🔹 Select Elements from home.html
const foodInput = document.getElementById("food-input");
const fetchNutritionBtn = document.getElementById("fetch-nutrition");
const nutritionResults = document.getElementById("nutrition-results");
const mealList = document.getElementById("meal-list");
const totalCaloriesEl = document.getElementById("total-calories");
const averageCaloriesEl = document.getElementById("average-calories");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const filterMealsBtn = document.getElementById("filter-meals");
const resetMealsBtn = document.getElementById("reset-meals");

// 🔹 Fetch Nutrition Data from API
async function fetchNutritionData(query) {
    try {
        const response = await fetch(API_URL + encodeURIComponent(query), {
            method: "GET",
            headers: { "X-Api-Key": API_KEY }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch nutrition data.");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching nutrition data:", error);
        return null;
    }
}

// 🔹 Handle Food Input & Fetch Nutrition Info
fetchNutritionBtn.addEventListener("click", async () => {
    const query = foodInput.value.trim();
    if (!query) {
        alert("Please enter a food item.");
        return;
    }

    const data = await fetchNutritionData(query);
    if (!data || data.items.length === 0) {
        alert("No nutrition data found.");
        return;
    }

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

// 🔹 Save Meal to Firestore
async function saveMealToFirestore(meal) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

    meals.push(meal);

    try {
        await updateDoc(userDocRef, { mealLogs: meals });
        fetchLoggedMeals();
    } catch (error) {
        console.error("Error saving meal:", error);
    }
}

// 🔹 Fetch & Display Logged Meals
async function fetchLoggedMeals(startDate = null, endDate = null) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let meals = userDoc.data().mealLogs || [];
        let totalCalories = 0;
        let dailyCalories = {};

        // 🔹 Filter meals by date range (if selected)
        if (startDate && endDate) {
            meals = meals.filter(meal => {
                const mealDate = new Date(meal.timestamp).toISOString().split("T")[0];
                return mealDate >= startDate && mealDate <= endDate;
            });
        }

        // 🔹 Process meals
        meals.forEach(meal => {
            totalCalories += meal.calories;

            const mealDate = new Date(meal.timestamp).toISOString().split("T")[0];
            if (!dailyCalories[mealDate]) {
                dailyCalories[mealDate] = 0;
            }
            dailyCalories[mealDate] += meal.calories;
        });

        // 🔹 Update the UI
        averageCaloriesEl.innerText = Math.round(totalCalories / (Object.keys(dailyCalories).length || 1));
        totalCaloriesEl.innerText = totalCalories;

        mealList.innerHTML = meals.length > 0
            ? meals.map(meal => `
                <li>
                    <strong>${meal.name}</strong>: ${meal.calories} kcal
                    <br>Protein: ${meal.protein} g, Carbs: ${meal.carbs} g, Fat: ${meal.fat} g
                    <br><em>Logged on: ${meal.timestamp}</em>
                </li>`).join("")
            : "<li>No meals logged for this date range.</li>";

        generateCalorieChart(dailyCalories);
    }
}

// 🔹 Generate Calorie Trend Chart
function generateCalorieChart(dailyCalories) {
    const chartCanvas = document.getElementById("calorieChart");
    if (!chartCanvas) {
        console.error("❌ ERROR: Calorie Chart canvas not found!");
        return;
    }

    const ctx = chartCanvas.getContext("2d");

    if (window.calorieChartInstance) {
        window.calorieChartInstance.destroy();
    }

    const sortedDates = Object.keys(dailyCalories).sort();
    const calorieValues = sortedDates.map(date => dailyCalories[date]);

    if (sortedDates.length === 0 || calorieValues.every(val => val === 0)) {
        console.warn("⚠️ No calorie data available for the chart.");
        chartCanvas.style.display = "none"; 
        return;
    } else {
        chartCanvas.style.display = "block"; 
    }

    window.calorieChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sortedDates,
            datasets: [{
                label: "Daily Calorie Intake",
                data: calorieValues,
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: Math.max(...calorieValues) + 50 
                }
            },
            plugins: {
                legend: {
                    display: false 
                }
            }
        }
    });
}

// 🔹 Fetch Meals on Load
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
    } else {
        window.location.href = "index.html";
    }
});

