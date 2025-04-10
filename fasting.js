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

let fastingInterval = null; // Store timer interval

// ✅ Start Fasting Function
async function startFasting() {
    console.log("✅ Starting fast...");

    const user = auth.currentUser;
    if (!user) {
        alert("❌ Please log in to start fasting.");
        return;
    }

    if (!fastingWindowSelect || !fastingStatusEl || !startFastingBtn || !endFastingBtn) return;

    const fastingHours = parseInt(fastingWindowSelect.value);
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + fastingHours * 60 * 60 * 1000).toISOString();

    fastingStatusEl.innerText = `Fasting started! Ends at ${new Date(endTime).toLocaleTimeString()}`;
    startFastingBtn.disabled = true;
    endFastingBtn.disabled = false;

    // ✅ Save the active fasting session in Firebase
    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            activeFasting: { startTime, endTime }
        });
        console.log("✅ Active fasting session saved.");
    } catch (error) {
        console.error("❌ ERROR saving active fasting session:", error);
    }

    startCountdownTimer(new Date(endTime));
    loadFastingHistory(); // ✅ Update fasting history instantly
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
            const fastDuration = (actualEndTime - new Date(activeFasting.startTime)) / (1000 * 60 * 60); // Hours

            let status = "Completed";
            if (actualEndTime < plannedEndTime) {
                status = "Ended Early"; // ✅ Mark as "Ended Early" if stopped before time
            }

            await updateDoc(userDocRef, {
                fastingHistory: arrayUnion({
                    startTime: activeFasting.startTime,
                    plannedEndTime: activeFasting.endTime,
                    actualEndTime: endTime,
                    duration: fastDuration.toFixed(2) + " hrs",
                    status: status
                }),
                activeFasting: null // ✅ Clear active fasting session
            });
        }

        console.log("✅ Fasting session ended and saved to history.");
    } catch (error) {
        console.error("❌ ERROR ending fasting session:", error);
    }

    loadFastingHistory(); // ✅ Update fasting history instantly
}

// ✅ Load Fasting History
async function loadFastingHistory() {
    console.log("🔄 Loading fasting history...");

    if (!fastingHistoryList) return;

    const user = auth.currentUser;
    if (!user) {
        console.error("❌ User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const fastingHistory = userDoc.data().fastingHistory || [];

        fastingHistoryList.innerHTML = fastingHistory.length
            ? fastingHistory.map(fast => `
                <li>
                    <strong>Start:</strong> ${new Date(fast.startTime).toLocaleString()}<br>
                    <strong>Planned End:</strong> ${new Date(fast.plannedEndTime).toLocaleString()}<br>
                    <strong>Actual End:</strong> ${new Date(fast.actualEndTime).toLocaleString()}<br>
                    <strong>Duration:</strong> ${fast.duration}<br>
                    <strong>Status:</strong> <span style="color: ${fast.status === "Ended Early" ? "red" : "green"}">${fast.status}</span>
                </li>
            `).join("")
            : "<li>No fasting history found.</li>";
    }
}

// ✅ Restore Active Fasting Session on Page Load
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

// ✅ Attach Event Listeners (Only if Elements Exist)
if (startFastingBtn) startFastingBtn.addEventListener("click", startFasting);
if (endFastingBtn) endFastingBtn.addEventListener("click", endFasting);

// ✅ Restore fasting status & load history on page load
document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            restoreActiveFasting();
            loadFastingHistory();
        }
    });
});

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
  
