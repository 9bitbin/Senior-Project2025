// community.js
import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, query, orderBy, doc,
  updateDoc, deleteDoc, arrayUnion, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// 🔹 Select Elements
const postsContainer = document.getElementById("communityFeed");
const sharePostBtn = document.getElementById("sharePostBtn");
const postContent = document.getElementById("postContent");
const postType = document.getElementById("postType");
const anonymousCheck = document.getElementById("anonymousCheck");
const searchInput = document.getElementById("searchInput");
const friendToggle = document.getElementById("friendToggle");
const visibilityCheck = document.getElementById("visibilityCheck");

let allPosts = [];
let currentUser = null;
let friendList = [];

// ✅ Start real-time updates
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    friendList = userDoc.data().friends || [];
  }

  listenForPosts();
});

function listenForPosts() {
  const postsRef = collection(db, "sharedPosts");
  const q = query(postsRef, orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    allPosts = [];
    snapshot.forEach((docSnapshot) => {
      allPosts.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    renderFilteredPosts();
  });
}

function renderFilteredPosts() {
  const keyword = searchInput?.value?.toLowerCase?.() || "";
  const filterFriendsOnly = friendToggle?.checked;

  const filtered = allPosts.filter(post => {
    const isSelf = post.userId === currentUser.uid;
    const isFriendPost = friendList.includes(post.userId);
    const matchesSearch = post.content.toLowerCase().includes(keyword) || post.type.toLowerCase().includes(keyword);
    const isVisible = post.visibility === "public" || (post.visibility === "friends" && (isFriendPost || isSelf));
    const respectsToggle = !filterFriendsOnly || isFriendPost || isSelf;
    return matchesSearch && isVisible && respectsToggle;
  });

  postsContainer.innerHTML = "";
  if (filtered.length === 0) {
    postsContainer.innerHTML = "<p>No posts match your filters.</p>";
    return;
  }

  filtered.forEach(post => renderPost(post.id, post));
}

function renderPost(postId, post) {
  const userLiked = post.likes?.includes(currentUser?.uid);
  const likeButtonText = userLiked ? "Unlike 👍" : "Like 👍";
  const avatarUrl = post.anonymous
    ? "https://i.pravatar.cc/40?u=anonymous"
    : `https://i.pravatar.cc/40?u=${post.userId}`;

  const postElement = document.createElement("div");
  postElement.classList.add("post");
  postElement.setAttribute("id", `post-${postId}`);
  postElement.setAttribute("data-type", post.type.toUpperCase());

  postElement.innerHTML = `
    <div class="post-header">
        <img src="${avatarUrl}" alt="User Avatar" class="user-avatar">
        <p><strong>${post.anonymous ? "Anonymous User" : "User"}</strong></p>
        <p>📌 <strong>${post.type.toUpperCase()}</strong></p>
        <p>${post.content}</p>
        <p>${post.visibility === "friends" ? "👥 Friends Only" : "🌍 Public"}</p>
        <p>🕒 <em>Shared on ${new Date(post.timestamp?.toDate?.() || post.timestamp).toLocaleString()}</em></p>
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

    ${currentUser?.uid === post.userId ? `<button class="delete-btn" data-id="${postId}">🗑️ Delete Post</button>` : ""}
    <hr>
  `;

  postsContainer.appendChild(postElement);

  postElement.querySelector(".like-btn").addEventListener("click", () => toggleLike(postId));
  postElement.querySelector(".comment-btn").addEventListener("click", () => addComment(postId));
  if (postElement.querySelector(".delete-btn")) {
    postElement.querySelector(".delete-btn").addEventListener("click", () => deletePost(postId));
  }
}

sharePostBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("⚠️ You must be logged in to share a post.");

  // Get the manual post input
  const contentInput = postContent.value.trim();

  // Look for selected recipe card
  const selectedCard = document.querySelector(".recipe-card.selected");
  let recipeText = "";

  if (selectedCard) {
    // Get all <p> tags inside the selected recipe card
    const pTags = selectedCard.querySelectorAll("p");

    // Combine all <p> text into one string
    recipeText = Array.from(pTags)
      .map(p => p.innerText.trim())
      .filter(text => text.length > 0)
      .join("\n"); // newline between <p> tags
  }

  // Combine recipe and user input into final content
  const content = recipeText
    ? `${contentInput}\n\n🍽️ Shared Recipe:\n${recipeText}`
    : contentInput;

  if (!content) return alert("⚠️ Post content cannot be empty.");

  try {
    await addDoc(collection(db, "sharedPosts"), {
      userId: currentUser.uid,
      content,
      type: postType.value,
      anonymous: anonymousCheck.checked,
      timestamp: new Date(),
      likes: [],
      comments: [],
      visibility: visibilityCheck?.checked ? "friends" : "public"
    });

    postContent.value = "";

    // Deselect recipe card
    const selectedCard = document.querySelector(".recipe-card.selected");
    if (selectedCard) {
      selectedCard.classList.remove("selected");
    }

  } catch (error) {
    console.error("Error sharing post:", error);
  }
});


async function toggleLike(postId) {
  if (!currentUser) return alert("⚠️ You must be logged in to like posts.");

  const postRef = doc(db, "sharedPosts", postId);
  const postSnapshot = await getDoc(postRef);
  const post = postSnapshot.data();

  let updatedLikes = post.likes || [];

  if (updatedLikes.includes(currentUser.uid)) {
    updatedLikes = updatedLikes.filter(uid => uid !== currentUser.uid);
  } else {
    updatedLikes.push(currentUser.uid);
  }

  await updateDoc(postRef, { likes: updatedLikes });
}

async function addComment(postId) {
  if (!currentUser) return alert("⚠️ You must be logged in to comment.");

  const commentInput = document.getElementById(`commentInput-${postId}`);
  const commentText = commentInput.value.trim();
  if (!commentText) return alert("⚠️ Comment cannot be empty.");

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const username = userDoc.exists() ? (userDoc.data().displayName || currentUser.email.split("@")[0]) : "User";

  const postRef = doc(db, "sharedPosts", postId);
  await updateDoc(postRef, {
    comments: arrayUnion({
      userId: currentUser.uid,
      username,
      text: commentText,
      timestamp: new Date().toISOString()
    })
  });

  commentInput.value = "";
}

async function deletePost(postId) {
  if (!currentUser) return alert("⚠️ You must be logged in to delete posts.");

  await deleteDoc(doc(db, "sharedPosts", postId));
}

searchInput?.addEventListener("input", renderFilteredPosts);
friendToggle?.addEventListener("change", renderFilteredPosts);


document.getElementById("savedRecipes").addEventListener("click", function (event) {
  const card = event.target.closest(".recipe-card");
  const isInsideInteractive = event.target.closest("button, input, textarea");

  if (card && !isInsideInteractive) {
    card.classList.toggle("selected");
    console.log("Recipe card clicked:", card.classList);
  }
});

function toggleArrow() {
  const arrow = document.getElementById("arrowIcon");
  const savedSection = document.getElementById("saved-recipes-section");
  const isDown = arrow.innerHTML === "▼" || !arrow.classList.contains("arrow-right");

  if (isDown) {
    arrow.innerHTML = "▶"; // Switch to right arrow
    arrow.classList.add("arrow-right");
    savedSection.style.display = "none"; // Collapse
  } else {
    arrow.innerHTML = "▼"; // Switch to down arrow
    arrow.classList.remove("arrow-right");
    savedSection.style.display = "block"; // Expand
  }
}

document.getElementById("toggleArrow").addEventListener("click", toggleArrow);



