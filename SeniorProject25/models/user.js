import { db } from "./database.js"; // Import Firestore instance
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Save Username function for Firestore (Uses UID as document ID)
export async function save(uid, username) {
    if (!uid || !username.trim()) {
        console.error("Invalid UID or username. Not saving to Firestore.");
        return;
    }

    try {
        await setDoc(doc(db, "users", uid), { username: username });
        console.log(`User "${username}" saved successfully in Firestore!`);
    } catch (error) {
        console.error("Error saving user to Firestore:", error);
    }
}

// Save Profile function for Firestore (Test Collection)
export async function saveProfile(uid, profileData) {
    if (!uid || !profileData) {
        console.error("Invalid UID or profile data. Not saving to Firestore.");
        return;
    }

    // Extract only required fields for the "test" collection
    const testProfileData = {
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        birthday: profileData.birthday || "",
        height: profileData.height || "",
        healthConditions: profileData.healthConditions || [],
    };

    try {
        await setDoc(doc(db, "test", uid), testProfileData, { merge: true });
        alert("Profile saved successfully in Firestore:", testProfileData);
    } catch (error) {
        alert("Error saving profile to Firestore:", error);
    }
}
