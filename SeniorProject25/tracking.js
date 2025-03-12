

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// --- Nutrition Tracking ---
// ... (Your nutrition tracking code - fetchNutritionData, saveMealToFirestore, fetchLoggedMeals, etc.) ...

// --- Budget Tracking ---
// ... (Your budget tracking code - setBudget, logMealCost, fetchBudgetHistory, fetchBudgetData, generateBudgetChart, etc.) ...

// --- Dashboard Functionality ---
// Select Canvas Elements
const caloriesChartEl = document.getElementById("caloriesChart").getContext("2d");
const macroChartEl = document.getElementById("macroChart").getContext("2d");
const workoutChartEl = document.getElementById("workoutChart").getContext("2d");

// Chart Instances
let caloriesChart, macroChart, workoutChart;

// Initialize Charts
function initializeCharts() {
    caloriesChart = new Chart(caloriesChartEl, {
        type: "bar",
        data: { labels: ["Calories Consumed", "Calories Burned"], datasets: [{ label: "Calories (kcal)", data: [0, 0], backgroundColor: ["#ff9800", "#4caf50"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    macroChart = new Chart(macroChartEl, {
        type: "pie",
        data: { labels: ["Carbs", "Protein", "Fats"], datasets: [{ data: [0, 0, 0], backgroundColor: ["#2196f3", "#f44336", "#ffeb3b"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    workoutChart = new Chart(workoutChartEl, {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Calories Burned per Workout", data: [], backgroundColor: "#673ab7" }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "Workout Date" } }, y: { title: { display: true, text: "Calories Burned" } } } }
    });
}

// Update Charts
function updateCharts(userData) {
    const mealLogs = userData.mealLogs || [];
    const totalCalories = mealLogs.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalCarbs = mealLogs.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalProtein = mealLogs.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalFat = mealLogs.reduce((sum, meal) => sum + (meal.fat || 0), 0);

    const workoutLogs = userData.workoutLogs || [];
    const workoutDates = workoutLogs.map(workout => new Date(workout.timestamp).toLocaleDateString());
    const workoutCaloriesData = workoutLogs.map(workout => workout.caloriesBurned || 0);

    caloriesChart.data.datasets[0].data = [totalCalories, workoutCaloriesData.reduce((a, b) => a + b, 0)];
    caloriesChart.update();

    macroChart.data.datasets[0].data = [totalCarbs, totalProtein, totalFat];
    macroChart.update();

    workoutChart.data.labels = workoutDates;
    workoutChart.data.datasets[0].data = workoutCaloriesData;
    workoutChart.update();
}

// Real-Time Listener
auth.onAuthStateChanged(user => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            updateCharts(userData);
        }
    });
});

// Initialize Charts
initializeCharts();

// --- Sidebar Navigation ---
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            sections.forEach(section => section.classList.remove("active"));

            const targetId = item.textContent.trim().toLowerCase();
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("active");
            }
        });
    });
});

// --- Initial Fetch ---
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedMeals();
        fetchBudgetData();
    } else {
        window.location.href = "index.html";
    }
});