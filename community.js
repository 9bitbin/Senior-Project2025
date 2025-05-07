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
const postFilter = document.getElementById("postFilter");

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
  const selectedType = postFilter?.value;

  const filtered = allPosts.filter(post => {
    const isSelf = post.userId === currentUser.uid;
    const isFriendPost = friendList.includes(post.userId);
    const matchesSearch = post.content.toLowerCase().includes(keyword) || post.type.toLowerCase().includes(keyword);
    const isVisible = post.visibility === "public" || (post.visibility === "friends" && (isFriendPost || isSelf));
    const respectsToggle = !filterFriendsOnly || isFriendPost || isSelf;
    const matchesType = selectedType === 'all' || post.type === selectedType;
    return matchesSearch && isVisible && respectsToggle && matchesType;
  });

  postsContainer.innerHTML = "";
  if (filtered.length === 0) {
    postsContainer.innerHTML = "<p>No posts match your filters.</p>";
    return;
  }

  filtered.forEach(post => renderPost(post.id, post));
}

async function renderPost(postId, post) {
  const userLiked = post.likes?.includes(currentUser?.uid);
  const likeButtonText = userLiked ? "Unlike 👍" : "Like 👍";
  const avatarUrl = post.anonymous
    ? "https://i.pravatar.cc/40?u=anonymous"
    : `https://i.pravatar.cc/40?u=${post.userId}`;

 
  let displayName = "User";
  if (!post.anonymous) {
    const userDoc = await getDoc(doc(db, "users", post.userId));
    if (userDoc.exists()) {
      displayName = userDoc.data().displayName || userDoc.data().email?.split("@")[0] || "User";
    }
  }

  const postElement = document.createElement("div");
  postElement.classList.add("post");
  postElement.setAttribute("id", `post-${postId}`);
  postElement.setAttribute("data-type", post.type.toUpperCase());

  postElement.innerHTML = `
    <div class="post-header">
        <div class="post-header-left">
            <img src="${avatarUrl}" alt="User Avatar" class="user-avatar">
            <strong>${post.anonymous ? "Anonymous User" : displayName}</strong>
        </div>
        <div class="post-header-right">
            <span class="post-tag">${post.type.toUpperCase()}</span>
            <span>${post.visibility === "friends" ? "👥 Friends Only" : "🌍 Public"}</span>
        </div>
    </div>

    <div class="post-content">
        ${post.content}
    </div>
    <button class="expand-btn" style="display: none;">Read more</button>

    <div class="post-metadata">
        <span>🕒 ${new Date(post.timestamp?.toDate?.() || post.timestamp).toLocaleString()}</span>
        <span class="like-count">👍 ${post.likes?.length || 0}</span>
        <span>💬 ${post.comments?.length || 0} comments</span>
    </div>

    <button class="like-btn" data-id="${postId}">${likeButtonText}</button>

    <div class="comments-section">
        <button class="comments-toggle">
            <span class="toggle-icon">▶</span>
            Comments (${post.comments?.length || 0})
        </button>
        <div class="comments-container">
            ${post.comments?.map(comment => `
                <div class="comment">
                    <strong>${comment.username || "Unknown User"}</strong>
                    <p>${comment.text}</p>
                    <small>${new Date(comment.timestamp).toLocaleString()}</small>
                </div>
            `).join("") || "<p>No comments yet.</p>"}
            <div class="comment-input-area">
                <input type="text" id="commentInput-${postId}" placeholder="Add a comment...">
                <button class="comment-btn" data-id="${postId}">Comment 💬</button>
            </div>
        </div>
    </div>

    ${currentUser?.uid === post.userId ? `<button class="delete-btn" data-id="${postId}">🗑️ Delete Post</button>` : ""}
  `;

  postsContainer.appendChild(postElement);

  // Remove duplicate event listeners and simplify the logic
  const postContent = postElement.querySelector(".post-content");
  const expandBtn = postElement.querySelector(".expand-btn");
  const commentsToggle = postElement.querySelector(".comments-toggle");
  const commentsContainer = postElement.querySelector(".comments-container");

  // Single check for content overflow with increased timeout
  setTimeout(() => {
    const lineHeight = parseInt(window.getComputedStyle(postContent).lineHeight);
    const maxLines = 3;
    if (postContent.scrollHeight > (lineHeight * maxLines)) {
      expandBtn.style.display = "block";
    }
  }, 300);

  // Single event listener for expand button
  expandBtn.addEventListener("click", () => {
    const isExpanded = postContent.classList.toggle("expanded");
    expandBtn.textContent = isExpanded ? "Show less" : "Read more";
  });

  commentsToggle.addEventListener("click", () => {
    commentsContainer.classList.toggle("show");
    const icon = commentsToggle.querySelector(".toggle-icon");
    icon.textContent = commentsContainer.classList.contains("show") ? "▼" : "▶";
  });

  // Keep the like, comment, and delete button event listeners
  postElement.querySelector(".like-btn").addEventListener("click", () => toggleLike(postId));
  postElement.querySelector(".comment-btn").addEventListener("click", () => addComment(postId));
  if (postElement.querySelector(".delete-btn")) {
    postElement.querySelector(".delete-btn").addEventListener("click", () => deletePost(postId));
  }
}

sharePostBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("⚠️ You must be logged in to share a post.");

  const content = postContent.value.trim();
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
postFilter?.addEventListener("change", renderFilteredPosts);



