import { db, auth } from "./firebase-config.js";
import {
    collection, addDoc, query, orderBy, doc, updateDoc, deleteDoc, arrayUnion, getDoc, getDocs, onSnapshot, where
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Select Elements
const postsContainer = document.getElementById("communityFeed");
const sharePostBtn = document.getElementById("sharePostBtn");
const postContent = document.getElementById("postContent");
const postType = document.getElementById("postType");
const anonymousCheck = document.getElementById("anonymousCheck");
const searchUserInput = document.getElementById("searchUser");
const clearSearchBtn = document.getElementById("clearSearchBtn");

// ✅ Listen for real-time updates & auto-refresh posts
function listenForPosts(searchQuery = '') {
    const postsRef = collection(db, "sharedPosts");

    // If a search query is provided, filter the posts by username
    let q = query(postsRef, orderBy("timestamp", "desc"));
    if (searchQuery) {
        q = query(postsRef, orderBy("timestamp", "desc"), where("username", "==", searchQuery));
    }

    onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = ""; // Clear the feed
        snapshot.forEach((docSnapshot) => {
            renderPost(docSnapshot.id, docSnapshot.data());
        });
    });
}

// ✅ Render a single post
function renderPost(postId, post) {
    const user = auth.currentUser;

    // Check if the current user liked the post
    const userLiked = post.likes && post.likes.includes(user?.uid);
    const likeButtonText = userLiked ? "Unlike 👍" : "Like 👍";

    // Generate avatar
    const avatarUrl = post.anonymous
        ? "https://i.pravatar.cc/40?u=anonymous"
        : `https://i.pravatar.cc/40?u=${post.userId}`;

    const postElement = document.createElement("div");
    postElement.classList.add("post");
    postElement.setAttribute("id", `post-${postId}`); // Add an ID for updates
    postElement.setAttribute("data-type", post.type.toUpperCase()); // For color coding

    postElement.innerHTML = `
        <div class="post-header">
            <img src="${avatarUrl}" alt="User Avatar" class="user-avatar">
            <p><strong>${post.anonymous ? "Anonymous User" : "User"}</strong></p>
            <p>📌 <strong>${post.type.toUpperCase()}</strong></p>
            <p>${post.content}</p>
            <p>🕒 <em>Shared on ${new Date(post.timestamp?.toDate()).toLocaleString()}</em></p>
        </div>

        <button class="like-btn" data-id="${postId}">${likeButtonText} (${post.likes?.length || 0})</button>

        <div class="comments-section">
            <h4>💬 Comments</h4>
            <div id="comments-${postId}">
                ${post.comments?.map(comment => `
                    <p><strong>${comment.username || "Unknown User"}:</strong> ${comment.text}</p>
                `).join("") || "<p>No comments yet.</p>"}
            </div>
            <input type="text" id="commentInput-${postId}" placeholder="Add a comment...">
            <button class="comment-btn" data-id="${postId}">Comment 💬</button>
        </div>

        ${user?.uid === post.userId ? `<button class="delete-btn" data-id="${postId}">🗑️ Delete Post</button>` : ""}
        <hr>
    `;

    postsContainer.appendChild(postElement);

    // Attach event listeners
    postElement.querySelector(".like-btn").addEventListener("click", () => toggleLike(postId));
    postElement.querySelector(".comment-btn").addEventListener("click", () => addComment(postId));
    if (postElement.querySelector(".delete-btn")) {
        postElement.querySelector(".delete-btn").addEventListener("click", () => deletePost(postId));
    }
}

// ✅ Share a Post
sharePostBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠️ You must be logged in to share a post.");

    const content = postContent.value.trim();
    if (!content) return alert("⚠️ Post content cannot be empty.");

    try {
        await addDoc(collection(db, "sharedPosts"), {
            userId: user.uid,
            content: content,
            type: postType.value,
            anonymous: anonymousCheck.checked,
            timestamp: new Date(),
            likes: [],
            comments: [],
            username: user.displayName || user.email.split("@")[0] // Storing the username for search
        });

        postContent.value = ""; // Clear input field
    } catch (error) {
        console.error("Error sharing post:", error);
    }
});

// ✅ Toggle Like
async function toggleLike(postId) {
    const user = auth.currentUser;
    if (!user) return alert("⚠️ You must be logged in to like posts.");

    const postRef = doc(db, "sharedPosts", postId);
    const postSnapshot = await getDoc(postRef);
    const post = postSnapshot.data();

    let updatedLikes = post.likes || [];

    if (updatedLikes.includes(user.uid)) {
        updatedLikes = updatedLikes.filter(uid => uid !== user.uid); // Unlike
    } else {
        updatedLikes.push(user.uid); // Like
    }

    await updateDoc(postRef, { likes: updatedLikes });
}

// ✅ Add Comment with Username
async function addComment(postId) {
    const user = auth.currentUser;
    if (!user) return alert("⚠️ You must be logged in to comment.");

    const commentInput = document.getElementById(`commentInput-${postId}`);
    const commentText = commentInput.value.trim();
    if (!commentText) return alert("⚠️ Comment cannot be empty.");

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    const username = userData?.displayName || user.email.split("@")[0]; // Use display name or email prefix

    const postRef = doc(db, "sharedPosts", postId);
    await updateDoc(postRef, {
        comments: arrayUnion({
            userId: user.uid,
            username: username,
            text: commentText,
            timestamp: new Date().toISOString()
        })
    });

    commentInput.value = ""; // Clear input
}

// ✅ Delete Post (Only for the Owner)
async function deletePost(postId) {
    const user = auth.currentUser;
    if (!user) return alert("⚠️ You must be logged in to delete posts.");

    const postRef = doc(db, "sharedPosts", postId);
    await deleteDoc(postRef);
}

// ✅ Start real-time updates
listenForPosts();

// ✅ Search Functionality
searchUserInput.addEventListener("input", (e) => {
    const searchQuery = e.target.value.trim().toLowerCase();
    //listenForPosts(searchQuery); // Refresh the posts with the search query
});

// ✅ Clear search functionality
clearSearchBtn.addEventListener("click", () => {
    const inputField = document.getElementById("searchUser");
    const output = document.querySelector(".search-container p");

    //searchUserInput.value = "";
    inputField.value = "";
    output.textContent = "";
    followBtn.style.display = "none";

    listenForPosts(); // Clear search and refresh all posts
});

let searchedUserId = null; // store the found user's ID

document.getElementById("searchBtn").addEventListener("click", async function () {
    const input = document.getElementById("searchUser").value.trim();
    const output = document.querySelector(".search-container p");
    const followBtn = document.getElementById("followBtn");

    followBtn.style.display = "none";
    searchedUserId = null; // reset on each search

    if (!input) {
        output.textContent = "Please enter a username.";
        return;
    }

    try {
        const userRef = collection(db, "users");
        const q = query(userRef, where("name", "==", input));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            searchedUserId = docSnap.id; // save found user's ID
            output.textContent = `${input} found`;
            followBtn.style.display = "inline-block";
        } else {
            output.textContent = `${input} not found`;
        }
    } catch (error) {
        console.error("Error searching Firestore:", error);
        output.textContent = "Error searching for user.";
    }
});

document.getElementById("followBtn").addEventListener("click", async () => {
    if (!searchedUserId || !auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;
    const currentUserRef = doc(db, "users", currentUserId);

    try {
        await updateDoc(currentUserRef, {
            friends: arrayUnion(searchedUserId) // adds the user to friends array
        });
        alert("New friend added successfully!");
    } catch (error) {
        console.error("Error adding friend:", error);
        alert("Failed to add user.");
    }
});

