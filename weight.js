// ✅ Import Firestore functions
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

// ✅ Elements
const logWeightBtn = document.getElementById("log-weight-btn");
const weightInput = document.getElementById("weight-input");
const tableBody = document.getElementById("weight-table-body");
const weightChartCanvas = document.getElementById("weightChart");

// ✅ Function to add a weight entry
async function addWeightEntry(weight) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in to save your weight data.");
        return;
    }

    try {
        const weightEntry = {
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            weight: parseFloat(weight) // Convert input to number
        };

        await addDoc(collection(db, "users", user.uid, "weightLogs"), weightEntry);
        console.log("Weight entry added:", weightEntry);
        loadWeightLogs();
    } catch (error) {
        console.error("Error adding weight entry:", error);
    }
}

// ✅ Function to retrieve all weight logs
async function getWeightEntries() {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const querySnapshot = await getDocs(collection(db, "users", user.uid, "weightLogs"));
        let weightLogs = [];
        querySnapshot.forEach((doc) => {
            weightLogs.push({ id: doc.id, ...doc.data() });
        });

        console.log("Retrieved weight logs:", weightLogs);
        return weightLogs;
    } catch (error) {
        console.error("Error retrieving weight entries:", error);
        return [];
    }
}

// ✅ Function to delete a weight entry
async function removeWeightEntry(logId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteDoc(doc(db, "users", user.uid, "weightLogs", logId));
        console.log("Weight entry deleted:", logId);
        loadWeightLogs();
    } catch (error) {
        console.error("Error deleting weight entry:", error);
    }
}

// ✅ Attach removeWeightEntry function to the global window object
window.removeWeightEntry = removeWeightEntry;

async function loadWeightLogs() {
    console.log("⏳ Fetching weight logs from Firestore...");
    const weightLogs = await getWeightEntries(); // ✅ Ensure Firestore data is fetched before continuing

    tableBody.innerHTML = ""; // Clear table before inserting new rows

    if (weightLogs.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='3'>No weight logs found</td></tr>";
        console.warn("⚠ No weight logs found. Showing placeholder chart.");
        updateWeightChart([]); // ✅ Ensure the chart updates even if no data exists
        return;
    }

    // ✅ Fill table with weight logs
    weightLogs.forEach((log) => {
        let row = tableBody.insertRow();
        row.innerHTML = `
            <td>${log.date}</td>
            <td>${log.weight} lbs</td>
            <td><button onclick="removeWeightEntry('${log.id}')">❌ Delete</button></td>
        `;
    });

    console.log("✅ Weight logs successfully fetched: ", weightLogs);
    updateWeightChart(weightLogs); // ✅ Now update the chart with the data
}

// ✅ Wait until Firestore data is fully loaded before updating the chart
document.addEventListener("DOMContentLoaded", async function () {
    await loadWeightLogs();
});






function updateWeightChart(weightLogs) {
    console.log("🔄 Updating weight chart...");

    const ctx = document.getElementById('weightChart').getContext('2d');

    // ✅ Destroy old chart before creating a new one
    if (window.weightChartInstance) {
        window.weightChartInstance.destroy();
    }

    // ✅ If no weight logs exist, show a placeholder chart with a realistic Y-axis
    if (!weightLogs.length) {
        window.weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ["No Data"],
                datasets: [{
                    label: 'Weight (lbs)',
                    data: [0],
                    borderColor: 'gray',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { suggestedMin: 50, suggestedMax: 300 } // ✅ Keeps Y-axis visible
                }
            }
        });
        console.warn("⚠ Chart initialized with no data.");
        return;
    }

    // ✅ If weight logs exist, update the chart
    const dates = weightLogs.map(log => log.date);
    const weights = weightLogs.map(log => parseFloat(log.weight));

    window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Weight (lbs)',
                data: weights,
                borderColor: 'blue',
                borderWidth: 2,
                fill: false,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });

    console.log("✅ Chart updated successfully with data: ", weights);
}





// ✅ Attach event listener to button
document.addEventListener("DOMContentLoaded", function () {
    logWeightBtn.addEventListener("click", async function () {
        const weight = weightInput.value;
        if (!weight) {
            alert("Please enter a valid weight.");
            return;
        }
        await addWeightEntry(weight);
        weightInput.value = ""; // Clear input field
    });

    loadWeightLogs(); // Load weights when the page is ready
});

