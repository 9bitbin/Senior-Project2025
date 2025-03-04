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
    const now = new Date().toLocaleString("en-US", { 
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: true
    });

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

// 🔹 Fetch & Display Logged Meals (Now Includes Average Calories Calculation & Chart)
async function fetchLoggedMeals(startDate = null, endDate = null) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let meals = userDoc.data().mealLogs || [];
        let totalCalories = 0;
        let dailyCalories = {}; // Stores total calories per day

        // 🔹 Filter meals by date range (if selected)
        if (startDate && endDate) {
            meals = meals.filter(meal => {
                const mealDate = new Date(meal.timestamp).toISOString().split("T")[0]; // Extract YYYY-MM-DD
                return mealDate >= startDate && mealDate <= endDate;
            });
        }

        // 🔹 Process meals & group by date
        meals.forEach(meal => {
            const mealDate = new Date(meal.timestamp).toISOString().split("T")[0]; // Ensure date format

            totalCalories += meal.calories; // Track total calories
            if (!dailyCalories[mealDate]) {
                dailyCalories[mealDate] = 0;
            }
            dailyCalories[mealDate] += meal.calories;
        });

        // 🔹 Calculate average daily calories
        const numDays = Object.keys(dailyCalories).length || 1; // Avoid division by zero
        const averageCalories = Math.round(totalCalories / numDays);

        // 🔹 Update the UI with the new data
        averageCaloriesEl.innerText = averageCalories;
        totalCaloriesEl.innerText = totalCalories;

        // 🔹 Display meal history
        mealList.innerHTML = meals.length > 0
            ? meals.map(meal => `
                <li>
                    <strong>${meal.name}</strong>: ${meal.calories} kcal
                    <br>Protein: ${meal.protein} g, Carbs: ${meal.carbs} g, Fat: ${meal.fat} g
                    <br><em>Logged on: ${meal.timestamp}</em>
                </li>`).join("")
            : "<li>No meals logged for this date range.</li>";

        // 🔹 Generate the Calorie Chart
        generateCalorieChart(meals);
    }
}

// 🔹 Generate Calorie Trend Chart
function generateCalorieChart(meals) {
    const { last7Days } = calculateCalorieTrends(meals);

    // 🔹 Extract Data for Chart
    const labels = last7Days.map(entry => entry.date);
    const data = last7Days.map(entry => entry.calories);

    // 🔹 Get Chart Canvas
    const ctx = document.getElementById("calorieChart").getContext("2d");

    // 🔹 Destroy existing chart before creating a new one
    if (window.calorieChartInstance) {
        window.calorieChartInstance.destroy();
    }

    // 🔹 Create New Chart
    window.calorieChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Daily Calories (Last 7 Days)",
                data,
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 🔹 Calculate Daily Calories for Chart
function calculateCalorieTrends(meals) {
    let dailyCalories = {};

    meals.forEach(meal => {
        const mealDate = new Date(meal.timestamp).toISOString().split("T")[0];

        if (!dailyCalories[mealDate]) {
            dailyCalories[mealDate] = 0;
        }
        dailyCalories[mealDate] += meal.calories;
    });

    let sortedDates = Object.keys(dailyCalories).sort();
    let calorieData = sortedDates.map(date => ({
        date,
        calories: dailyCalories[date]
    }));

    let last7Days = calorieData.slice(-7);

    return { last7Days };
}

// 🔹 Filter Meals by Date Range
filterMealsBtn.addEventListener("click", () => {
    fetchLoggedMeals(startDateInput.value, endDateInput.value);
});

// 🔹 Reset Meal Filter
resetMealsBtn.addEventListener("click", () => {
    startDateInput.value = "";
    endDateInput.value = "";
    fetchLoggedMeals();
});

// 🔹 Ensure User is Logged In & Fetch Meals
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
    } else {
        window.location.href = "index.html";
    }
});
