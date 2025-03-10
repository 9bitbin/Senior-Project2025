import { db, auth } from "./firebase-config.js";
import { 
    collection, addDoc, query, orderBy, doc, updateDoc, deleteDoc, arrayUnion, getDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Select Elements
const postsContainer = document.getElementById("communityFeed");
const sharePostBtn = document.getElementById("sharePostBtn");
const postContent = document.getElementById("postContent");
const postType = document.getElementById("postType");
const anonymousCheck = document.getElementById("anonymousCheck");

// ✅ Listen for real-time updates & auto-refresh posts
function listenForPosts() {
    const postsRef = collection(db, "sharedPosts");
    const q = query(postsRef, orderBy("timestamp", "desc"));

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
            comments: []
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


