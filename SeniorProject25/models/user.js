import { db } from "./database.js"; // Import Firestore instance
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";


// Save user data

export async function saveUser(uid, userData) {
    if (!uid || !userData) {
        console.error("Invalid UID or user data.");
        return;
    }

    // Remove weight from userData before saving
    const { weight, ...filteredUserData } = userData; 

    try {
        await setDoc(doc(db, "users", uid), filteredUserData, { merge: true }); // Merge with existing data
        console.log(`User "${uid}" saved successfully with data:`, filteredUserData);
    } catch (error) {
        console.error("Error saving user:", error);
    }
}

// Get user data
export async function getUser(uid) {
    if (!uid) return console.error("Invalid UID.");
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
    }
}

// Update user data
export async function updateUser(uid, updates) {
    if (!uid || !updates) return console.error("Invalid UID or updates.");
    try {
        await updateDoc(doc(db, "users", uid), updates);
        console.log(`User "${uid}" updated successfully.`);
    } catch (error) {
        console.error("Error updating user:", error);
    }
}

// Delete user
export async function deleteUser(uid) {
    if (!uid) return console.error("Invalid UID.");
    try {
        await deleteDoc(doc(db, "users", uid));
        console.log(`User "${uid}" deleted successfully.`);
    } catch (error) {
        console.error("Error deleting user:", error);
    }
}

// Save weight entry
export async function saveWeight(uid, weight) {
    if (!uid || !weight) {
        console.error("Invalid UID or weight. Cannot save.");
        return;
    }

    try {
        const weightValue = parseFloat(weight);
        if (isNaN(weightValue)) {
            console.error("Invalid weight value. Must be a number.");
            return;
        }

        // Ensure weight is stored inside the "weight" subcollection
        const weightCollectionRef = collection(db, `users/${uid}/weight`); 
        const newWeightEntry = {
            weight: weightValue,
            timestamp: new Date().toISOString() // Ensure ISO string for consistency
        };

        await addDoc(weightCollectionRef, newWeightEntry);
        console.log(`Weight entry ${weightValue} saved under users/${uid}/weight.`);
    } catch (error) {
        console.error("Error saving weight:", error);
    }
}

// Get all weight entries for a user
export async function getUserWeights(uid) {
    if (!uid) return console.error("Invalid UID.");
    try {
        const weightCollectionRef = collection(db, "users", uid, "weight");
        const snapshot = await getDocs(weightCollectionRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error retrieving weights:", error);
        return [];
    }
}

// Delete a weight entry
export async function deleteWeight(uid, weightId) {
    if (!uid || !weightId) return console.error("Invalid UID or weight ID.");
    try {
        await deleteDoc(doc(db, "users", uid, "weight", weightId));
        console.log(`Weight entry "${weightId}" deleted.`);
    } catch (error) {
        console.error("Error deleting weight:", error);
    }
}
