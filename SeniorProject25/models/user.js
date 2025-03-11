import { db } from "./database.js"; // Import Firestore instance
import { doc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

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

// Save user profile under /users collection and store weight in a new weight subcollection.
export async function saveProfile(uid, profileData) {
    if (!uid || !profileData) {
        console.error("Invalid UID or profile data. Not saving to Firestore.");
        return;
    }

    // Extract required fields for the "users" collection
    const userProfileData = {
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        birthday: profileData.birthday || "", // Save birthday
        dietType: profileData.dietType || [],
        healthCondition: profileData.healthCondition || [],
        height: profileData.height || "",
        restriction: profileData.restriction || []
    };

    try {
        // Save user profile in users collection
        await setDoc(doc(db, "users", uid), userProfileData, { merge: true });
        console.log("Profile saved successfully in Firestore under users collection:", userProfileData);

        // Check if weight exists before creating a new collection
        if (profileData.weight) {
            const weightCollectionRef = collection(db, "users", uid, "weight"); // Reference the weight subcollection
            await addDoc(weightCollectionRef, {
                weight: parseFloat(profileData.weight), // Ensure it's stored as a number
                timestamp: new Date()
            });
            console.log("Weight saved successfully in a new weight collection inside users.");
        } else {
            console.log("No weight provided, skipping weight storage.");
        }
    } catch (error) {
        console.error("Error saving profile to Firestore:", error);
    }
}
