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
const mealDateInput = document.getElementById("meal-date");
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

    const foodItem = data.items[0]; // Get first item from response
    const today = new Date().toISOString().split("T")[0]; // Store date in YYYY-MM-DD format

    const meal = {
        name: query,
        calories: foodItem.calories || 0,
        protein: foodItem.protein_g !== undefined ? foodItem.protein_g : 0,
        carbs: foodItem.carbohydrates_total_g !== undefined ? foodItem.carbohydrates_total_g : 0,
        fat: foodItem.fat_total_g !== undefined ? foodItem.fat_total_g : 0,
        timestamp: today // Store today's date
    };

    // Display Nutrition Data
    nutritionResults.innerHTML = `
        <h3>Nutrition Breakdown</h3>
        <p><strong>Calories:</strong> ${meal.calories} kcal</p>
        <p><strong>Protein:</strong> ${meal.protein} g</p>
        <p><strong>Carbs:</strong> ${meal.carbs} g</p>
        <p><strong>Fat:</strong> ${meal.fat} g</p>
    `;

    // Save Meal to Firestore
    saveMealToFirestore(meal);
});

// 🔹 Save Meal to Firestore
async function saveMealToFirestore(meal) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

    meals.push(meal); // Add new meal

    try {
        await updateDoc(userDocRef, { mealLogs: meals });
        fetchLoggedMeals(); // Refresh meal history
    } catch (error) {
        console.error("Error saving meal:", error);
    }
}

// 🔹 Fetch & Display Logged Meals (Fixed Undefined Issue)
async function fetchLoggedMeals(selectedDate = null) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let meals = userDoc.data().mealLogs || [];
        let totalCalories = 0;

        // 🔹 Ensure all meals have valid fields
        meals = meals.map(meal => ({
            name: meal.name || "Unknown Food",
            calories: meal.calories || 0,
            protein: meal.protein !== undefined ? meal.protein : 0,
            carbs: meal.carbs !== undefined ? meal.carbs : 0,
            fat: meal.fat !== undefined ? meal.fat : 0,
            timestamp: meal.timestamp || "0000-00-00" // Default if missing
        }));

        // 🔹 Filter meals based on the selected date
        const filteredMeals = selectedDate && selectedDate !== "0000-00-00"
            ? meals.filter(meal => meal.timestamp === selectedDate)
            : meals;

        // 🔹 Display meals or show a message if none exist
        mealList.innerHTML = filteredMeals.length > 0
            ? filteredMeals.map(meal => {
                totalCalories += meal.calories;
                return `
                    <li>
                        <strong>${meal.name}</strong>: ${meal.calories} kcal
                        <br>Protein: ${meal.protein} g, Carbs: ${meal.carbs} g, Fat: ${meal.fat} g
                    </li>`;
            }).join("")
            : "<li>No meals logged for this date.</li>";

        totalCaloriesEl.innerText = totalCalories;
    }
}

// 🔹 Filter Meals by Date
filterMealsBtn.addEventListener("click", () => {
    const selectedDate = mealDateInput.value;
    if (!selectedDate) {
        alert("Please select a date.");
        return;
    }
    fetchLoggedMeals(selectedDate);
});

// 🔹 Reset Meal Filter
resetMealsBtn.addEventListener("click", () => {
    mealDateInput.value = ""; // Clear date input
    fetchLoggedMeals(); // Show all meals
});

// 🔹 Ensure User is Logged In & Fetch Meals
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
    } else {
        window.location.href = "index.html"; 
    }
});
