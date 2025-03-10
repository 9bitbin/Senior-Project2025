// Import Firebase
console.log("✅ budget.js is loaded!");

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Select Elements from home.html
const budgetAmountInput = document.getElementById("budget-amount");
const budgetPeriodSelect = document.getElementById("budget-period");
const setBudgetBtn = document.getElementById("set-budget");

const mealCostInput = document.getElementById("meal-cost");
const logMealCostBtn = document.getElementById("log-meal-cost");

const budgetValueEl = document.getElementById("budget-value");
const totalSpentEl = document.getElementById("total-spent");
const remainingBudgetEl = document.getElementById("remaining-budget");
const budgetAlertEl = document.getElementById("budget-alert");
const budgetHistoryList = document.getElementById("budget-history-list");

// Select the Budget Chart Element
const budgetChartCanvas = document.getElementById("budgetChart");

// 🔹 Budget Chart Instance
let budgetChartInstance = null;

// 🔹 Disable Buttons While Processing
function toggleButtons(state) {
    setBudgetBtn.disabled = !state;
    logMealCostBtn.disabled = !state;
}

// 🔹 Set Budget Function
async function setBudget() {
    console.log("✅ Set Budget button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const budgetAmount = parseFloat(budgetAmountInput.value);
    const budgetPeriod = budgetPeriodSelect.value;

    if (isNaN(budgetAmount) || budgetAmount <= 0) {
        alert("❌ Please enter a valid budget amount.");
        return;
    }

    toggleButtons(false);

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            mealBudget: {
                amount: budgetAmount,
                period: budgetPeriod,
                totalSpent: 0,
                expenses: []
            }
        });

        console.log("✅ Budget set successfully!");
        fetchBudgetData();
    } catch (error) {
        console.error("❌ ERROR setting budget:", error);
    } finally {
        toggleButtons(true);
    }
}

// 🔹 Log Meal Cost Function
async function logMealCost() {
    console.log("✅ Log Meal Cost button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const mealCost = parseFloat(mealCostInput.value);
    if (isNaN(mealCost) || mealCost <= 0) {
        alert("❌ Please enter a valid meal cost.");
        return;
    }

    toggleButtons(false);

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let budgetData = userDoc.data().mealBudget || { amount: 0, totalSpent: 0, expenses: [] };

        // Save individual expense with timestamp
        const expense = {
            id: Date.now().toString(),
            cost: mealCost,
            timestamp: new Date().toISOString()
        };

        budgetData.expenses.push(expense);
        budgetData.totalSpent += mealCost;

        try {
            await updateDoc(userDocRef, { mealBudget: budgetData });
            console.log("✅ Meal cost logged successfully!");

            fetchBudgetData();
        } catch (error) {
            console.error("❌ ERROR logging meal cost:", error);
        } finally {
            toggleButtons(true);
        }
    }
}

// Select Elements for Spending History
const budgetStartDateInput = document.getElementById("budget-start-date");
const budgetEndDateInput = document.getElementById("budget-end-date");
const filterBudgetBtn = document.getElementById("filter-budget");
const resetBudgetBtn = document.getElementById("reset-budget");


// 🔹 Fetch & Display Spending History Based on Date Range
async function fetchBudgetHistory(startDate = null, endDate = null) {
    console.log("🔄 Fetching filtered budget history...");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let budgetData = userDoc.data().mealBudget || { expenses: [] };
        let expenses = budgetData.expenses || [];

        // 🔹 Filter expenses by selected date range
        if (startDate && endDate) {
            expenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.timestamp).toISOString().split("T")[0];
                return expenseDate >= startDate && expenseDate <= endDate;
            });
        }

        // 🔹 Display filtered expenses
        budgetHistoryList.innerHTML = expenses.length > 0
            ? expenses.map(expense => `
                <li>
                    <strong>$${expense.cost.toFixed(2)}</strong>
                    <br><em>Logged on: ${new Date(expense.timestamp).toLocaleString()}</em>
                </li>
            `).join("")
            : "<li>No expenses found for this date range.</li>";
    }
}

// 🔹 Filter Budget History by Date Range
filterBudgetBtn.addEventListener("click", () => {
    const startDate = budgetStartDateInput.value;
    const endDate = budgetEndDateInput.value;

    if (!startDate || !endDate) {
        alert("❌ Please select both a start and end date.");
        return;
    }

    fetchBudgetHistory(startDate, endDate);
});

// 🔹 Reset Budget History Filter
resetBudgetBtn.addEventListener("click", () => {
    budgetStartDateInput.value = "";
    budgetEndDateInput.value = "";
    fetchBudgetHistory();
});

// 🔹 Ensure User is Logged In & Fetch Initial Budget History
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ User logged in, fetching full budget history...");
        fetchBudgetHistory();
    } else {
        console.error("❌ User not logged in, redirecting...");
        window.location.href = "index.html";
    }
});


// 🔹 Fetch and Display Budget Data
async function fetchBudgetData() {
    console.log("🔄 Fetching budget data...");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let budgetData = userDoc.data().mealBudget || { amount: 0, totalSpent: 0, expenses: [] };
        let remainingBudget = budgetData.amount - budgetData.totalSpent;

        // Update UI
        budgetValueEl.innerText = `$${budgetData.amount.toFixed(2)}`;
        totalSpentEl.innerText = `$${budgetData.totalSpent.toFixed(2)}`;
        remainingBudgetEl.innerText = `$${remainingBudget.toFixed(2)}`;

        budgetAlertEl.innerText = remainingBudget < 0 ? "⚠️ Warning: You have exceeded your budget!" : "";
        budgetAlertEl.style.color = remainingBudget < 0 ? "red" : "black";

        // Generate Budget Chart
        generateBudgetChart(budgetData.expenses);
    }
}

// 🔹 Generate Budget Chart
function generateBudgetChart(expenses) {
    const dailyExpenses = {};
    
    expenses.forEach(expense => {
        const date = new Date(expense.timestamp).toISOString().split("T")[0];
        dailyExpenses[date] = (dailyExpenses[date] || 0) + expense.cost;
    });

    const sortedDates = Object.keys(dailyExpenses).sort();
    const labels = sortedDates;
    const data = labels.map(date => dailyExpenses[date]);

    // Destroy old chart instance before creating a new one
    if (budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    // Create new budget chart
    const ctx = budgetChartCanvas.getContext("2d");
    budgetChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Meal Expenses Over Time",
                data,
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// 🔹 Ensure User is Logged In & Fetch Budget Data
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ User logged in, fetching budget data...");
        fetchBudgetData();
    } else {
        console.error("❌ User not logged in, redirecting...");
        window.location.href = "index.html";
    }
});

// 🔹 Attach Event Listeners
setBudgetBtn.addEventListener("click", setBudget);
logMealCostBtn.addEventListener("click", logMealCost);
