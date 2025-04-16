// ✅ Import Firebase
console.log("✅ budget.js is loaded!");

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ Select Elements
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

const budgetStartDateInput = document.getElementById("budget-start-date");
const budgetEndDateInput = document.getElementById("budget-end-date");
const filterBudgetBtn = document.getElementById("filter-budget");
const resetBudgetBtn = document.getElementById("reset-budget");

// ✅ Line Chart
const budgetChartCanvas = document.getElementById("budgetChart");
let budgetChartInstance = null;

// ✅ Pie Chart
const budgetPieChartCanvas = document.getElementById("budgetPieChart");
let pieChartInstance = null;

// ✅ Enable/Disable Buttons
function toggleButtons(state) {
  if (setBudgetBtn) setBudgetBtn.disabled = !state;
  if (logMealCostBtn) logMealCostBtn.disabled = !state;
}

// ✅ Set Budget
async function setBudget() {
  const user = auth.currentUser;
  if (!user) return;

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
        expenses: [],
      },
    });
    fetchBudgetData();
  } catch (error) {
    console.error("❌ Error setting budget:", error);
  } finally {
    toggleButtons(true);
  }
}

// ✅ Log Meal Cost
async function logMealCost() {
  const user = auth.currentUser;
  if (!user) return;

  const mealCost = parseFloat(mealCostInput.value);
  if (isNaN(mealCost) || mealCost <= 0) {
    alert("❌ Please enter a valid meal cost.");
    return;
  }

  toggleButtons(false);
  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    let budgetData = userDoc.data().mealBudget || {
      amount: 0,
      totalSpent: 0,
      expenses: [],
    };

    const expense = {
      id: Date.now().toString(),
      cost: mealCost,
      timestamp: new Date().toISOString(),
    };

    budgetData.expenses.push(expense);
    budgetData.totalSpent += mealCost;

    try {
      await updateDoc(userDocRef, { mealBudget: budgetData });
      fetchBudgetData();
    } catch (error) {
      console.error("❌ Error logging cost:", error);
    } finally {
      toggleButtons(true);
    }
  }
}

// ✅ Fetch Budget Data
async function fetchBudgetData(startDate = null, endDate = null) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    let budgetData = userDoc.data().mealBudget || {
      amount: 0,
      totalSpent: 0,
      expenses: [],
    };

    const remainingBudget = budgetData.amount - budgetData.totalSpent;

    let filteredExpenses = [...budgetData.expenses];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredExpenses = filteredExpenses.filter((e) => {
        const date = new Date(e.timestamp);
        return date >= start && date <= end;
      });
    }

    // UI updates
    if (budgetValueEl) budgetValueEl.innerText = `$${budgetData.amount.toFixed(2)}`;
    if (totalSpentEl) totalSpentEl.innerText = `$${budgetData.totalSpent.toFixed(2)}`;
    if (remainingBudgetEl) remainingBudgetEl.innerText = `$${remainingBudget.toFixed(2)}`;
    if (budgetAlertEl) {
      budgetAlertEl.innerText = remainingBudget < 0 ? "⚠️ Warning: You have exceeded your budget!" : "";
      budgetAlertEl.style.color = remainingBudget < 0 ? "red" : "black";
    }

    generateBudgetChart(filteredExpenses);
    generatePieChart(budgetData.totalSpent, Math.max(0, remainingBudget));
    renderBudgetHistoryList(filteredExpenses);
  }
}

// ✅ Line Chart: Meal Cost Over Time
function generateBudgetChart(expenses) {
  if (!budgetChartCanvas) return;

  const dailyExpenses = {};
  expenses.forEach((e) => {
    const date = new Date(e.timestamp).toISOString().split("T")[0];
    dailyExpenses[date] = (dailyExpenses[date] || 0) + e.cost;
  });

  const labels = Object.keys(dailyExpenses).sort();
  const data = labels.map((d) => dailyExpenses[d]);

  if (budgetChartInstance) budgetChartInstance.destroy();

  const ctx = budgetChartCanvas.getContext("2d");
  budgetChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Meal Expenses Over Time",
          data,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// ✅ Pie Chart: Spent vs Remaining
function generatePieChart(spent, remaining) {
  if (!budgetPieChartCanvas) return;

  const ctx = budgetPieChartCanvas.getContext("2d");

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Spent", "Remaining"],
      datasets: [
        {
          data: [spent, remaining],
          backgroundColor: ["#f87171", "#34d399"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

// ✅ Render Expense History
function renderBudgetHistoryList(expenses) {
  if (!budgetHistoryList) return;

  if (expenses.length === 0) {
    budgetHistoryList.innerHTML = "<li>No expenses found for this range.</li>";
    return;
  }

  budgetHistoryList.innerHTML = expenses
    .map((e) => {
      const date = new Date(e.timestamp).toLocaleString();
      return `<li>$${e.cost.toFixed(2)} <em>on ${date}</em></li>`;
    })
    .join("");
}

// ✅ Event Listeners
if (setBudgetBtn) setBudgetBtn.addEventListener("click", setBudget);
if (logMealCostBtn) logMealCostBtn.addEventListener("click", logMealCost);
if (filterBudgetBtn) filterBudgetBtn.addEventListener("click", () => {
  fetchBudgetData(budgetStartDateInput.value, budgetEndDateInput.value);
});
if (resetBudgetBtn) resetBudgetBtn.addEventListener("click", () => {
  budgetStartDateInput.value = "";
  budgetEndDateInput.value = "";
  fetchBudgetData();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    fetchBudgetData();
  } else {
    window.location.href = "index.html";
  }
});
