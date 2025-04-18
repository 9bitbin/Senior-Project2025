// messaging.js
import { auth, db } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, setDoc,
  addDoc, onSnapshot, query, orderBy, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const userList = document.getElementById("user-list");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let currentUser = null;
let selectedUserId = null;
let currentFriends = [];
let unsubscribeMessages = null;
let allUsers = [];
let currentSearchValue = "";
const latestMessages = {};
const onlineStatus = {};
let lastSeenTimestamps = {};
const userIdToNameMap = {};

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function renderMessage(msg, isUser) {
  const div = document.createElement("div");
  div.className = `message ${isUser ? "user" : "ai"}`;
  div.innerHTML = `<div class="bubble">${msg.text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#10b981",
    color: "white",
    padding: "12px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 9999,
    fontWeight: "bold",
    transition: "opacity 0.3s ease"
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

async function sendMessage() {
  const text = chatInput.value.trim();
  console.log("[Debug] Attempting to send message:", text);

  if (!text) {
    showToast("⚠️ Message cannot be empty");
    return;
  }

  if (!selectedUserId) {
    showToast("⚠️ Please select a friend to chat with.");
    return;
  }

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const friendList = userDoc.data().friends || [];

  if (!friendList.includes(selectedUserId)) {
    showToast("⚠️ You can only message your friends.");
    return;
  }

  const convId = getConversationId(currentUser.uid, selectedUserId);
  const msgRef = collection(db, "messages", convId, "messages");

  await addDoc(msgRef, {
    text,
    senderId: currentUser.uid,
    receiverId: selectedUserId,
    timestamp: new Date().toISOString()
  });

  console.log("✅ Message sent to:", selectedUserId);
  chatInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

function updateOnlineStatus() {
  const statusRef = doc(db, "status", currentUser.uid);
  setDoc(statusRef, { online: true }, { merge: true });

  window.addEventListener("beforeunload", () => {
    setDoc(statusRef, { online: false }, { merge: true });
  });

  onSnapshot(collection(db, "status"), (snapshot) => {
    snapshot.forEach(docSnap => {
      onlineStatus[docSnap.id] = docSnap.data().online;
    });
    renderUserList({ all: allUsers, pendingRequests: [] }, currentUser.uid);
  });
}

function loadConversation(uid1, uid2) {
  chatMessages.innerHTML = "";
  if (unsubscribeMessages) unsubscribeMessages();

  const convId = getConversationId(uid1, uid2);
  const messagesRef = collection(db, "messages", convId, "messages");
  const q = query(messagesRef, orderBy("timestamp"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      renderMessage(msg, msg.senderId === currentUser.uid);

      if (msg.senderId !== currentUser.uid && selectedUserId !== msg.senderId) {
        const msgTime = new Date(msg.timestamp).getTime();
        if (!lastSeenTimestamps[msg.senderId] || msgTime > lastSeenTimestamps[msg.senderId]) {
          lastSeenTimestamps[msg.senderId] = msgTime;
          const senderName = userIdToNameMap[msg.senderId] || "Someone";
          showToast(`💬 New message from ${senderName}`);
        }
      }
    });
  });
}

function renderUserList(users, currentUid) {
  const friendReqs = users.pendingRequests || [];
  const container = document.createElement("div");

  const searchWrapper = document.createElement("div");
  searchWrapper.innerHTML = `
    <input type="text" id="searchInput" placeholder="Search users..." value="${currentSearchValue}">
  `;
  const searchInput = searchWrapper.querySelector("#searchInput");
  searchInput.addEventListener("input", (e) => {
    currentSearchValue = e.target.value;
    if (currentSearchValue.trim() === "") {
      renderUserList({ all: allUsers, pendingRequests: [] }, currentUid);
    } else {
      filterUserList(currentSearchValue, currentUid);
    }
  });

  container.appendChild(searchWrapper);

  if (friendReqs.length > 0) {
    const title = document.createElement("h4");
    title.textContent = "Friend Requests";
    container.appendChild(title);

    for (const req of friendReqs) {
      const reqDiv = document.createElement("div");
      reqDiv.className = "user-item";
      reqDiv.innerHTML = `
        <strong>${req.name}</strong><br>
        <button data-uid="${req.uid}" class="accept-btn">✅ Accept</button>
        <button data-uid="${req.uid}" class="reject-btn">❌ Reject</button>
      `;
      reqDiv.querySelector(".accept-btn").addEventListener("click", () => acceptFriend(req.uid));
      reqDiv.querySelector(".reject-btn").addEventListener("click", () => rejectFriend(req.uid));
      container.appendChild(reqDiv);
    }
  }

  const title2 = document.createElement("h4");
  title2.textContent = "All Friends";
  container.appendChild(title2);

  for (const user of users.all) {
    if (user.uid === currentUid || !currentFriends.includes(user.uid)) continue;

    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    const lastMsg = latestMessages[user.uid] || "";
    const online = onlineStatus[user.uid] ? "🟢" : "⚪";
    userDiv.innerHTML = `<strong>${online} ${user.name}</strong><br><small>${lastMsg}</small>`;

    userDiv.addEventListener("click", () => {
      document.querySelectorAll(".user-item").forEach(u => u.classList.remove("active"));
      userDiv.classList.add("active");
      selectedUserId = user.uid;
      loadConversation(currentUid, user.uid);
    });

    container.appendChild(userDiv);
  }

  userList.innerHTML = "";
  userList.appendChild(container);
}

function filterUserList(searchTerm, currentUid) {
  const lowerTerm = searchTerm.toLowerCase();
  const filtered = allUsers.filter(user =>
    user.uid !== currentUid &&
    !currentFriends.includes(user.uid) &&
    user.name.toLowerCase().includes(lowerTerm)
  );

  const container = document.createElement("div");
  const searchWrapper = document.createElement("div");
  searchWrapper.innerHTML = `
    <input type="text" id="searchInput" placeholder="Search users..." value="${currentSearchValue}">
  `;
  const searchInput = searchWrapper.querySelector("#searchInput");
  searchInput.addEventListener("input", (e) => {
    currentSearchValue = e.target.value;
    if (currentSearchValue.trim() === "") {
      renderUserList({ all: allUsers, pendingRequests: [] }, currentUid);
    } else {
      filterUserList(currentSearchValue, currentUid);
    }
  });
  container.appendChild(searchWrapper);

  const title = document.createElement("h4");
  title.textContent = "Search Results";
  container.appendChild(title);

  for (const user of filtered) {
    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    userDiv.innerHTML = `<strong>${user.name}</strong><br>`;

    const addBtn = document.createElement("button");
    addBtn.textContent = "➕ Add Friend";
    addBtn.className = "add-friend-btn";
    addBtn.addEventListener("click", () => sendFriendRequest(user.uid));
    userDiv.appendChild(addBtn);

    container.appendChild(userDiv);
  }

  userList.innerHTML = "";
  userList.appendChild(container);
}

async function loadUsers(currentUid) {
  const usersRef = collection(db, "users");
  const usersSnapshot = await getDocs(usersRef);

  const userDoc = await getDoc(doc(db, "users", currentUid));
  currentFriends = userDoc.exists() ? userDoc.data().friends || [] : [];

  const friendReqs = await getDoc(doc(db, "friendRequests", currentUid));
  const pendingIds = friendReqs.exists() ? friendReqs.data().pending || [] : [];
  const pendingRequests = [];

  allUsers = usersSnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;
    const name = data.name || data.displayName || "Unnamed User";
    userIdToNameMap[uid] = name;
    return { uid, name };
  });

  for (const uid of pendingIds) {
    const docSnap = await getDoc(doc(db, "users", uid));
    pendingRequests.push({ uid, name: docSnap.data().name || "Unnamed User" });
  }

  currentFriends.forEach(friendId => {
    const convId = getConversationId(currentUid, friendId);
    const msgRef = collection(db, "messages", convId, "messages");
    const q = query(msgRef, orderBy("timestamp", "desc"));
    getDocs(q).then(snap => {
      const latest = snap.docs[0]?.data()?.text;
      if (latest) {
        latestMessages[friendId] = latest;
        renderUserList({ all: allUsers, pendingRequests }, currentUid);
      }
    });
  });

  renderUserList({ all: allUsers, pendingRequests }, currentUid);
}

async function sendFriendRequest(receiverId) {
  if (!currentUser) return;
  const requestRef = doc(db, "friendRequests", receiverId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    await setDoc(requestRef, { pending: [currentUser.uid] });
  } else {
    const data = requestSnap.data();
    if (!data.pending.includes(currentUser.uid)) {
      await updateDoc(requestRef, { pending: arrayUnion(currentUser.uid) });
    }
  }

  showToast("✅ Friend request sent!");
}

async function acceptFriend(uidToAccept) {
  const currentRef = doc(db, "users", currentUser.uid);
  const theirRef = doc(db, "users", uidToAccept);

  await updateDoc(currentRef, { friends: arrayUnion(uidToAccept) });
  await updateDoc(theirRef, { friends: arrayUnion(currentUser.uid) });
  await updateDoc(doc(db, "friendRequests", currentUser.uid), { pending: arrayRemove(uidToAccept) });
  showToast("✅ Friend added!");
  loadUsers(currentUser.uid);
}

async function rejectFriend(uidToReject) {
  await updateDoc(doc(db, "friendRequests", currentUser.uid), { pending: arrayRemove(uidToReject) });
  showToast("❌ Request rejected.");
  loadUsers(currentUser.uid);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;
  await loadUsers(user.uid);
  updateOnlineStatus();
});
