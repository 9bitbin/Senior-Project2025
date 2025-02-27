import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Elements
const foodInput = document.getElementById("food-input");
const fetchBtn = document.getElementById("fetch-nutrition");
const caloriesEl = document.getElementById("calories");
const proteinEl = document.getElementById("protein");
const carbsEl = document.getElementById("carbs");
const fatEl = document.getElementById("fat");
const mealListEl = document.getElementById("meal-list");
const totalCaloriesEl = document.getElementById("total-calories");

// 🔹 API Key (Replace with your actual key)
const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";

// 🔹 Fetch Nutrition Data from API
async function fetchNutritionData(foodQuery) {
    const apiUrl = `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(foodQuery)}`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "X-Api-Key": API_KEY
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch nutrition data.");
        }

        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("Error fetching nutrition data:", error);
        return [];
    }
}

// 🔹 Handle Button Click
fetchBtn.addEventListener("click", async () => {
    const foodQuery = foodInput.value.trim();
    if (!foodQuery) {
        alert("Please enter a food item.");
        return;
    }

    const nutritionData = await fetchNutritionData(foodQuery);

    if (nutritionData.length === 0) {
        alert("No nutrition data found. Try a different food item.");
        return;
    }

    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    nutritionData.forEach(item => {
        totalCalories += item.calories;
        totalProtein += item.protein_g;
        totalCarbs += item.carbohydrates_total_g;
        totalFat += item.fat_total_g;
    });

    caloriesEl.innerText = totalCalories.toFixed(2);
    proteinEl.innerText = totalProtein.toFixed(2);
    carbsEl.innerText = totalCarbs.toFixed(2);
    fatEl.innerText = totalFat.toFixed(2);

    saveMealToFirestore(foodQuery, totalCalories, totalProtein, totalCarbs, totalFat);
});

// 🔹 Save Meal to Firestore
async function saveMealToFirestore(foodQuery, calories, protein, carbs, fat) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            mealLogs: arrayUnion({ food: foodQuery, calories, protein, carbs, fat, timestamp: new Date().toISOString().split("T")[0] })
        });
        fetchLoggedMeals();
    } catch (error) {
        console.error("Error saving meal:", error);
    }
}

// 🔹 Fetch Logged Meals
async function fetchLoggedMeals() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        const meals = data.mealLogs || [];
        mealListEl.innerHTML = meals.map(meal => `<li>${meal.food} - ${meal.calories} kcal</li>`).join("") || "<li>No meals logged today.</li>";
        totalCaloriesEl.innerText = meals.reduce((sum, meal) => sum + meal.calories, 0).toFixed(2);
    }
}

onAuthStateChanged(auth, fetchLoggedMeals);
