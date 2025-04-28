// ✅ Import Firebase
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ Select Elements Safely
const fastingWindowSelect = document.getElementById("fasting-window");
const startFastingBtn = document.getElementById("start-fasting");
const endFastingBtn = document.getElementById("end-fasting");
const fastingStatusEl = document.getElementById("fasting-status");
const fastingTimerEl = document.getElementById("fasting-timer");
const fastingHistoryList = document.getElementById("fasting-history");
const totalFastsEl = document.getElementById('total-fasts');
const avgDurationEl = document.getElementById('avg-duration');
const completionRateEl = document.getElementById('completion-rate');
const ctx = document.getElementById('fastingChart')?.getContext('2d');
const fastingTypeIndicator = document.querySelector(".fasting-type-indicator");
const debugControlsDiv = document.createElement('div');
let fastingChart;

let fastingInterval = null; // Store timer interval

// ✅ Start Fasting Function

let totalPlannedDuration = 0;


async function clearActiveFasting() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            activeFasting: null
        });
        console.log("✅ Active fasting session cleared.");
    } catch (error) {
        console.error("❌ ERROR clearing active fasting:", error);
    }
}


const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');
const filterBtn = document.querySelector('.filter-btn');
const resetFilterBtn = document.querySelector('.reset-filter-btn');





async function startFasting() {
    console.log("✅ Starting fast...");

    const user = auth.currentUser;
    if (!user) {
        alert("❌ Please log in to start fasting.");
        return;
    }

    if (!fastingWindowSelect || !fastingStatusEl || !startFastingBtn || !endFastingBtn) {
        console.error("❌ Required elements not found!");
        return;
    }

    const fastingHours = parseInt(fastingWindowSelect.value);
    if (isNaN(fastingHours)) {
        console.error("❌ Invalid fasting hours!");
        return;
    }

    totalPlannedDuration = fastingHours;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + fastingHours * 60 * 60 * 1000).toISOString();

    // Update UI first
    fastingStatusEl.innerText = `Fasting started! Ends at ${new Date(endTime).toLocaleTimeString()}`;
    startFastingBtn.disabled = true;
    endFastingBtn.disabled = false;

    // ✅ Save the active fasting session in Firebase
    startCountdownTimer(new Date(endTime));

    // Save to Firebase
    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            activeFasting: { startTime, endTime }
        });
        console.log("✅ Active fasting session saved.");
    } catch (error) {
        console.error("❌ ERROR saving active fasting session:", error);
    }
}

// ✅ Start Countdown Timer
function startCountdownTimer(endTime) {
    clearInterval(fastingInterval);

    if (!fastingTimerEl) return;

    fastingInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = new Date(endTime) - now;

        if (timeLeft <= 0) {
            clearInterval(fastingInterval);
            fastingTimerEl.innerText = "Fasting completed!";
            startFastingBtn.disabled = false;
            endFastingBtn.disabled = true;
            clearActiveFasting();
            return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        fastingTimerEl.innerText = `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// ✅ End Fasting Function (Handles Early Ending)


// In the endFasting function, update the eatingWindow value:
async function endFasting() {
    console.log("✅ Ending fast...");

    const user = auth.currentUser;
    if (!user) {
        alert("❌ Please log in to end fasting.");
        return;
    }

    if (!fastingStatusEl || !fastingTimerEl || !startFastingBtn || !endFastingBtn) return;

    clearInterval(fastingInterval);
    fastingStatusEl.innerText = "Fasting ended!";
    fastingTimerEl.innerText = "--:--:--";
    startFastingBtn.disabled = false;
    endFastingBtn.disabled = true;

    const endTime = new Date().toISOString();

    // ✅ Save completed fast to Firebase history
    const userDocRef = doc(db, "users", user.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        const activeFasting = userDoc.exists() ? userDoc.data().activeFasting : null;

        if (activeFasting) {
            const plannedEndTime = new Date(activeFasting.endTime);
            const actualEndTime = new Date();
            
            // Modified duration calculation for better visibility
            const actualDuration = (actualEndTime - new Date(activeFasting.startTime)) / (1000 * 60 * 60);
            const fastDuration = actualDuration;

            // Change status logic to only show "Completed" when timer runs out naturally
            let status = "Ended Early"; // Default to "Ended Early"

            // Check if the current time is past or equal to the planned end time
            if (actualEndTime >= new Date(activeFasting.endTime)) {
                status = "Completed";
            }

            await updateDoc(userDocRef, {
                fastingHistory: arrayUnion({
                    startTime: activeFasting.startTime,
                    plannedEndTime: activeFasting.endTime,
                    actualEndTime: endTime,
                    duration: fastDuration.toFixed(2),  // Store raw number without " hrs"
                    status: status
                }),
                activeFasting: null
            });

            // Add a small delay before reloading history
            setTimeout(() => {
                loadFastingHistory();
            }, 500);
        }
    } catch (error) {
        console.error("❌ ERROR ending fasting session:", error);
    }
}

async function loadFastingHistory() {
    if (!fastingHistoryList) return;

    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("❌ User not logged in!");
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            let fastingHistory = userDoc.data().fastingHistory || [];
            // Sort history by start time in descending order
            fastingHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            
            let filteredHistory = [...fastingHistory]; // Create a copy for filtering

            // Calculate statistics from complete history
            const totalFasts = fastingHistory.length;
            const completedFasts = fastingHistory.filter(fast => fast.status === "Completed").length;
            const completionRate = totalFasts ? ((completedFasts / totalFasts) * 100).toFixed(1) : 0;
            const avgDuration = totalFasts ? 
                fastingHistory.reduce((acc, fast) => acc + parseFloat(fast.duration), 0) / totalFasts : 0;

            // Update statistics display
            if (totalFastsEl) totalFastsEl.textContent = totalFasts;
            if (avgDurationEl) avgDurationEl.textContent = `${avgDuration.toFixed(2)} hrs`;
            if (completionRateEl) completionRateEl.textContent = `${completionRate}%`;

            // Create/Update chart with last 7 fasts
            const last7Fasts = fastingHistory
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                .slice(0, 7)
                .reverse();
            
            if (ctx) {
                if (fastingChart) {
                    fastingChart.destroy();
                }
                // Chart configuration
                const chartData = {
                    type: 'bar',
                    data: {
                        labels: last7Fasts.map(fast => {
                            const date = new Date(fast.startTime);
                            const month = date.getMonth() + 1;
                            const day = date.getDate();
                            // Fix the date formatting
                            return `${month}/${day}`;
                        }),
                        datasets: [{
                            label: 'Last 7 Fasting Sessions (in hours)',
                            data: last7Fasts.map(fast => parseFloat(fast.duration)),
                            backgroundColor: last7Fasts.map(fast => 
                                fast.status === "Completed" ? '#10b981' : '#ef4444'
                            ),
                            borderColor: '#0f172a',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 24,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value + ' hrs';
                                    }
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Your Last 7 Fasting Sessions',
                                font: {
                                    size: 16
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    title: function(context) {
                                        const fast = last7Fasts[context[0].dataIndex];
                                        return `Session on ${new Date(fast.startTime).toLocaleDateString()}`;
                                    },
                                    label: function(context) {
                                        const fast = last7Fasts[context.dataIndex];
                                        return [
                                            `Duration: ${context.raw.toFixed(2)} hours`,
                                            `Status: ${fast.status}`,
                                            `Start: ${new Date(fast.startTime).toLocaleString()}`,
                                            `End: ${new Date(fast.actualEndTime).toLocaleString()}`
                                        ];
                                    }
                                }
                            }
                        }
                    }
                };
                
                // Create new chart instance
                fastingChart = new Chart(ctx, chartData);
            }

            // Apply date filtering if dates are selected
            if (filterStartDate.value && filterEndDate.value) {
                const startDate = new Date(filterStartDate.value);
                const endDate = new Date(filterEndDate.value);
                endDate.setHours(23, 59, 59);

                filteredHistory = filteredHistory.filter(fast => {
                    const fastDate = new Date(fast.startTime);
                    return fastDate >= startDate && fastDate <= endDate;
                });
            }

            // Update history list with filtered data
            fastingHistoryList.innerHTML = filteredHistory.length
                ? filteredHistory.slice(0, 50).map((fast, index) => `
                    <li class="${index === 0 ? 'new-entry' : ''}">
                        <strong>Start:</strong> ${new Date(fast.startTime).toLocaleString()}<br>
                        <strong>Planned End:</strong> ${new Date(fast.plannedEndTime).toLocaleString()}<br>
                        <strong>Actual End:</strong> ${new Date(fast.actualEndTime).toLocaleString()}<br>
                        <strong>Duration:</strong> ${fast.duration} hrs<br>
                        <strong>Status:</strong> <span style="color: ${fast.status === "Ended Early" ? "red" : "green"}">${fast.status}</span>
                    </li>
                `).join("")
                : "<li>No fasting history found.</li>";
        }
    } catch (error) {
        console.error("Error loading fasting history:", error);
    }
}

// Add event listeners for the filter buttons
filterBtn?.addEventListener('click', loadFastingHistory);
resetFilterBtn?.addEventListener('click', () => {
    filterStartDate.value = '';
    filterEndDate.value = '';
    loadFastingHistory();
});

// Add these near the bottom of the file, before the download event listener
// ✅ Attach Event Listeners (Only if Elements Exist)
if (startFastingBtn) startFastingBtn.addEventListener("click", startFasting);
if (endFastingBtn) endFastingBtn.addEventListener("click", endFasting);

// ✅ Restore fasting status & load history on page load
document.addEventListener("DOMContentLoaded", () => {
    // Set default text for fasting schedule
    if (fastingTypeIndicator) {
        fastingTypeIndicator.textContent = "12:12 (12 hours fasting, 12 hours eating)";
    }

    // Handle auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            restoreActiveFasting();
            loadFastingHistory();
        }
    });
});

// Add this function near the top with other functions
async function restoreActiveFasting() {
    console.log("🔄 Checking for active fasting session...");

    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const activeFasting = userDoc.data().activeFasting;

        if (activeFasting) {
            const endTime = new Date(activeFasting.endTime);

            if (new Date() < endTime) {
                fastingStatusEl.innerText = `Fasting started! Ends at ${endTime.toLocaleTimeString()}`;
                startFastingBtn.disabled = true;
                endFastingBtn.disabled = false;
                startCountdownTimer(endTime);
                console.log("✅ Restored fasting session from Firebase.");
            } else {
                console.log("✅ Previous fasting session completed.");
                clearActiveFasting();
            }
        }
    }
}



document.getElementById("download-fasting")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
  
    if (!userDoc.exists()) {
      alert("User data not found.");
      return;
    }
  
    const data = userDoc.data();
    const fastingLogs = Array.isArray(data.fastingHistory) ? data.fastingHistory : [];
  
    if (fastingLogs.length === 0) {
      alert("No fasting logs to export.");
      return;
    }
  
    const headers = ["Start Time", "Planned End Time", "Actual End Time", "Duration", "Status"];
    const rows = fastingLogs.map(log => [
      `"${new Date(log.startTime).toLocaleString()}"`,
      `"${new Date(log.plannedEndTime).toLocaleString()}"`,
      `"${new Date(log.actualEndTime).toLocaleString()}"`,
      log.duration,
      log.status
    ]);
  
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fasting-history.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });


    
 


    
 




// Update the fasting window select event listener
if (fastingWindowSelect) {
    fastingWindowSelect.addEventListener("change", (e) => {
        const schedule = e.target.options[e.target.selectedIndex].text;
        if (fastingTypeIndicator) {
            fastingTypeIndicator.textContent = schedule || "Select a fasting schedule";
        }
    });
}

