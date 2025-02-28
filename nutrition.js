// Import Firebase
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 API Configuration (Calorieninjas API)
const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";
const API_URL = "https://api.calorieninjas.com/v1/nutrition?query=";

// 🔹 Select Elements from home.html
const foodInput = document.getElementById("food-input");
const fetchNutritionBtn = document.getElementById("fetch-nutrition");
const nutritionResults = document.getElementById("nutrition-results");
const mealList = document.getElementById("meal-list");
const totalCaloriesEl = document.getElementById("total-calories");

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
    const meal = {
        name: query,
        calories: foodItem.calories,
        protein: foodItem.protein_g,
        carbs: foodItem.carbohydrates_total_g,
        fat: foodItem.fat_total_g,
        timestamp: new Date().toISOString().split("T")[0] // Store today's date
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
        console.log("Meal logged successfully.");
        fetchLoggedMeals(); // Refresh meal history
    } catch (error) {
        console.error("Error saving meal:", error);
    }
}

// 🔹 Fetch & Display Logged Meals
async function fetchLoggedMeals() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const meals = userDoc.data().mealLogs || [];
        let totalCalories = 0;

        mealList.innerHTML = meals.length > 0
            ? meals.map((meal, index) => {
                totalCalories += meal.calories;
                return `
                    <li>
                        <strong>${meal.name}</strong>: ${meal.calories} kcal
                        <button class="delete-meal" data-index="${index}">Delete</button>
                    </li>
                `;
            }).join("")
            : "<li>No meals logged yet.</li>";

        totalCaloriesEl.innerText = totalCalories;

        // Attach event listeners for delete buttons
        document.querySelectorAll(".delete-meal").forEach(button => {
            button.addEventListener("click", async (event) => {
                const mealIndex = event.target.dataset.index;
                await deleteMealFromFirestore(mealIndex);
            });
        });
    }
}

// 🔹 Delete Meal from Firestore
async function deleteMealFromFirestore(index) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let meals = userDoc.exists() ? userDoc.data().mealLogs || [] : [];

    meals.splice(index, 1); // Remove selected meal

    try {
        await updateDoc(userDocRef, { mealLogs: meals });
        console.log("Meal deleted successfully.");
        fetchLoggedMeals(); // Refresh meal history
    } catch (error) {
        console.error("Error deleting meal:", error);
    }
}

// 🔹 Ensure User is Logged In & Fetch Meals
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
    } else {
        window.location.href = "index.html"; // Redirect to login if not logged in
    }
});
