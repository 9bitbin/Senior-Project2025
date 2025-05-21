// community.js
import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, query, orderBy, doc, getDocs,
  updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, onSnapshot, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

window.toggleComments = function(button) {
  console.log('Toggle comments clicked');
  const commentsSection = button.closest('.comments-section');
  const commentsContainer = commentsSection.querySelector('.comments-container');
  
  if (commentsContainer) {
    console.log('Found comments container, current display:', commentsContainer.style.display);
    
    // Remove inline style and use a class instead
    commentsContainer.classList.toggle('hidden');
    const isHidden = commentsContainer.classList.contains('hidden');
    
    // Update button text
    const commentCount = button.textContent.match(/\d+/)?.[0] || '0';
    button.innerHTML = `💬 Comments (${commentCount}) ${isHidden ? '▼' : '▲'}`;
    console.log('Toggled container visibility');
  } else {
    console.error('Comments container not found');
  }
};


window.submitComment = async function(button) {
  if (!currentUser) return;
  
  const commentContainer = button.closest('.comments-container');
  const input = commentContainer.querySelector('.comment-input');
  const post = button.closest('.post');
  const postId = post.dataset.postId;
  
  if (!input || !input.value.trim()) return;

  try {
    const postRef = doc(db, "sharedPosts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) return;
    
    const newComment = {
      userId: currentUser.uid,
      content: input.value.trim(),
      timestamp: new Date().toISOString()
    };
    
    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });
    
    input.value = '';
    
    // Store the current visibility state
    const wasVisible = !commentContainer.classList.contains('hidden');
    
    // Refresh the post to show the new comment
    const updatedDoc = await getDoc(postRef);
    const postData = { ...updatedDoc.data(), id: postId };
    const newPostElement = renderPost(postData);
    
    // Replace the old post with the new one
    post.replaceWith(newPostElement);
    
    // If comments were visible, show them in the new post
    if (wasVisible) {
      const newCommentsContainer = newPostElement.querySelector('.comments-container');
      if (newCommentsContainer) {
        newCommentsContainer.classList.remove('hidden');
        const toggleButton = newPostElement.querySelector('.comments-toggle');
        if (toggleButton) {
          const commentCount = toggleButton.textContent.match(/\d+/)?.[0] || '0';
          toggleButton.innerHTML = `💬 Comments (${commentCount}) ▲`;
        }
      }
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
  }
}

 export function generateUserAvatar(userId, username, isAnonymous = false) {
  const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50'];
  
  if (isAnonymous) {
    return {
      initials: 'AN',
      color: '#6b7280',
      displayName: 'Anonymous'
    };
  }

  const colorIndex = [...userId].reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const cleanUsername = username.split('#')[0].trim();
  const words = cleanUsername.split(' ');
  
  let initials;
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else {
    initials = words[0][0].toUpperCase(); // Only use first letter for single word names
  }

  return {
    initials,
    color: colors[colorIndex],
    displayName: cleanUsername
  };
}

function userNameCount(username) {
  if (!username || !userIdToNameMap) return 0;
  return Object.values(userIdToNameMap).filter(user => 
    user && user.name && user.name.toLowerCase() === username.toLowerCase()
  ).length;
}

function toggleRecipeSection() {
  const recipeSection = document.getElementById('recipe-share-section');
  const arrowIcon = document.getElementById('arrowIcon');
  
  if (!recipeSection || !arrowIcon) {
    console.error('Recipe section elements not found');
    return;
  }

  // Get current state
  const isHidden = recipeSection.style.display === 'none' || !recipeSection.style.display;

  // Toggle visibility
  recipeSection.style.display = isHidden ? 'block' : 'none';
  arrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  arrowIcon.style.transition = 'transform 0.3s ease';
  arrowIcon.textContent = isHidden ? '▲' : '▼';

  // Only fetch and display recipes when opening the section
  if (isHidden && currentUser) {
    // Show loading state
    recipeSection.innerHTML = '<p style="text-align: center; padding: 20px;">Loading your recipes...</p>';
    
    const recipesRef = collection(db, "users", currentUser.uid, "savedRecipes");
    getDocs(recipesRef)
      .then((snapshot) => {
        if (snapshot.empty) {
          recipeSection.innerHTML = '<p style="text-align: center; padding: 20px;">No saved recipes found. Save some recipes first!</p>';
          return;
        }

        let recipesHTML = `
          <div class="recipe-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            padding: 15px;">
        `;
        
        snapshot.forEach((doc) => {
          const recipe = doc.data();
          recipesHTML += `
            <div class="recipe-card" style="
              background: white;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              overflow: hidden;
              position: relative;">
              <input type="checkbox" 
                class="recipe-select" 
                data-recipe-id="${doc.id}" 
                data-recipe-name="${recipe.name}"
                style="position: absolute; top: 8px; right: 8px; width: 18px; height: 18px;">
              <img src="${recipe.image}" alt="${recipe.name}" 
                style="width: 100%; height: 150px; object-fit: cover;">
              <div style="padding: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px;">${recipe.name}</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong>Category:</strong> ${recipe.category || 'N/A'}<br>
                  <strong>Origin:</strong> ${recipe.origin || 'N/A'}
                </p>
              </div>
            </div>
          `;
        });
        
        recipesHTML += `</div>
          <button onclick="shareSelectedRecipes()" 
            style="
              display: block;
              margin: 20px auto;
              padding: 10px 20px;
              background-color: #3b82f6;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;">
            Share Selected Recipes
          </button>
        `;
        
        recipeSection.innerHTML = recipesHTML;
      })
      .catch(error => {
        console.error("Error loading recipes:", error);
        recipeSection.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Error loading recipes. Please try again.</p>';
      });
  }
}
window.shareSelectedRecipes = async function() {
  if (!currentUser) return;
  
  const selectedRecipes = document.querySelectorAll('.recipe-select:checked');
  if (selectedRecipes.length === 0) {
    alert('Please select at least one recipe to share');
    return;
  }

  try {
    let recipeNames = [];
    for (const checkbox of selectedRecipes) {
      const recipeName = checkbox.dataset.recipeName;
      if (recipeName) recipeNames.push(recipeName);
    }

    const postContent = document.getElementById('postContent');
    if (postContent) {
      const isMultiple = recipeNames.length > 1;
      postContent.value = isMultiple ? 
        `Check out my recipes for:\n${recipeNames.join('\n')}` : 
        `Check out my recipe for ${recipeNames[0]}`;
    }
    
    window.selectedRecipeIds = Array.from(selectedRecipes).map(checkbox => 
      checkbox.dataset.recipeId
    );
  } catch (error) {
    console.error("Error preparing recipes to share:", error);
    alert("Error preparing recipes to share. Please try again.");
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  // Format: MM/DD/YYYY, HH:MM AM/PM
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  return `${formattedDate}, ${formattedTime}`;
}

function renderPost(post) {
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.dataset.postId = post.id;
  postElement.style.backgroundColor = 'white';
  postElement.style.borderRadius = '12px';
  postElement.style.padding = '20px';
  postElement.style.marginBottom = '20px';
  postElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

  // Your existing code for userInfo and avatar
  const userInfo = userIdToNameMap[post.userId] || { name: 'Unknown User', email: '' };
  const userName = post.anonymous ? 'Anonymous' : formatUserDisplay(userInfo.name, post.userId);
  const avatar = generateUserAvatar(post.userId, userName, post.anonymous);
  const postHeader = `
    <div class="post-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <div class="post-header-left" style="display: flex; align-items: center;">
        <div class="user-initial" style="
            width: 40px; 
            height: 40px; 
            background-color: ${avatar.color}; 
            color: white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin-right: 10px; 
            font-weight: bold; 
            font-size: 16px;
            font-family: system-ui, -apple-system, sans-serif;">
            ${avatar.initials}
        </div>
        <div style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="user-name" style="font-weight: 500; color: #1f2937;">
              ${userName}${!post.anonymous && userNameCount(userName) > 1 ? ` #${post.userId.substring(0, 6)}` : ''}
            </span>
            ${!post.anonymous && post.userId !== currentUser?.uid && !friendList.includes(post.userId) ? 
              `<button onclick="sendFriendRequest('${post.userId}')" style="padding: 2px 8px; border: none; border-radius: 4px; background-color: #3b82f6; color: white; cursor: pointer; font-size: 12px;">
                Add Friend
              </button>` : ''
            }
          </div>
          <span class="post-timestamp" style="color: #6b7280; font-size: 12px;">
            ${formatTimestamp(post.timestamp)}
          </span>
        </div>
      </div>
      <div class="post-header-right" style="display: flex; align-items: center; gap: 10px;">
        <span class="post-tag" style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
          ${getPostTypeIcon(post.type)} ${post.type}
        </span>
        ${isCurrentUser(post.userId) ? `
          <button onclick="deletePost('${post.id}')" class="delete-btn" style="display: flex; align-items: center; gap: 5px; padding: 4px 8px; border: none; border-radius: 4px; background-color: #ef4444; color: white; cursor: pointer;">
            Delete 🗑️
          </button>` : ''}
      </div>
    </div>
  `;

  const recipeContent = post.recipeIds ? `
  <div class="shared-recipes" style="margin: 15px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
    <h4 style="margin: 0 0 10px 0;">🍳 Shared Recipes</h4>
    <div class="recipe-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
      ${post.recipeIds.map((recipeId, index) => `
        <div class="recipe-card" style="
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h5 style="margin: 0 0 10px 0;">${post.recipeNames[index]}</h5>
          <button onclick="viewSharedRecipe('${post.userId}', '${recipeId}')" 
            class="view-recipe-btn" style="
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;">
            View Full Recipe
          </button>
        </div>
      `).join('')}
    </div>
  </div>
` : '';

  const likeButton = `
  <button onclick="toggleLike('${post.id}')" class="like-btn" style="
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    background-color: ${post.likes?.includes(currentUser?.uid) ? '#ef4444' : '#e5e7eb'};
    color: ${post.likes?.includes(currentUser?.uid) ? 'white' : '#374151'};
    cursor: pointer;
    transition: all 0.2s;
    width: fit-content;">
    ${post.likes?.includes(currentUser?.uid) ? '❤️' : '🤍'} 
    ${post.likes?.length || 0}
  </button>
`;

  // Update the comments section
  const commentsSection = `
  <div class="comments-section" style="width: 100%;">
    <button class="comments-toggle" onclick="window.toggleComments(this)" style="
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 15px;
      border: none;
      border-radius: 8px;
      background-color: #f3f4f6;
      color: #374151;
      cursor: pointer;
      font-size: 14px;
      width: 100%;">
      💬 Comments (${post.comments?.length || 0}) ▲
    </button>
    
    <div class="comments-container hidden" style="
      margin-top: 15px;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 12px;
      width: 100%;
      box-sizing: border-box;">
      <div class="comments-list" style="margin-bottom: 15px;">
        ${post.comments && post.comments.length > 0 ? 
          post.comments.map(comment => {
            const commentUser = userIdToNameMap[comment.userId] || { name: 'Unknown User' };
            const avatar = generateUserAvatar(comment.userId, commentUser.name);
            return `
              <div class="comment" style="display: flex; gap: 12px; margin-bottom: 12px; padding: 10px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div class="comment-avatar" style="
                  width: 32px;
                  height: 32px;
                  background-color: ${avatar.color};
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;">
                  ${avatar.initials}
                </div>
                <div class="comment-content" style="flex: 1;">
                  <div class="comment-header" style="margin-bottom: 4px;">
                    <span class="comment-author" style="font-weight: 500; color: #1f2937;">
                      ${commentUser.name}
                    </span>
                    <span class="comment-time" style="font-size: 12px; color: #6b7280; margin-left: 8px;">
                      ${formatTimestamp(comment.timestamp)}
                    </span>
                  </div>
                  <div class="comment-text" style="color: #374151;">
                    ${comment.content ? escapeHtml(comment.content) : '(no content)'}
                  </div>
                </div>
              </div>
            `;
          }).join('') : 
          '<p style="text-align: center; color: #6b7280; padding: 10px;">No comments yet</p>'
        }
      </div>
      
      <div class="comment-input-container" style="display: flex; gap: 10px;">
        <input type="text" class="comment-input" placeholder="Write a comment..." style="
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
          font-size: 14px;">
        <button onclick="submitComment(this)" class="post-comment-btn" style="
          padding: 8px 16px;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;">
          Post
        </button>
      </div>
    </div>
  </div>
`;




const postFooter = `
  <div class="post-footer" style="display: flex; gap: 10px; margin-top: 15px;">
    ${likeButton}
    ${commentsSection}
  </div>
`;

postElement.innerHTML = `
  ${postHeader}
  <div class="post-content" style="margin: 15px 0;">
    <p style="margin: 0; white-space: pre-wrap;">${post.content}</p>
    ${recipeContent || ''}
  </div>
  ${postFooter}
`;

return postElement;
}
// Add toggleLike function
export async function toggleLike(postId) {
  if (!currentUser) return;

  try {
    const postRef = doc(db, "sharedPosts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) return;
    
    const likes = postDoc.data().likes || [];
    const userLiked = likes.includes(currentUser.uid);
    
    await updateDoc(postRef, {
      likes: userLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

window.viewSharedRecipe = async function(userId, recipeId) {
  try {
    const recipeRef = doc(db, "users", userId, "savedRecipes", recipeId);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      alert("Recipe not found");
      return;
    }

    const recipe = recipeDoc.data();
    
    const popup = document.createElement('div');
    popup.className = 'recipe-popup';
    popup.innerHTML = `
      <div class="recipe-popup-content">
        <button class="close-btn" onclick="this.closest('.recipe-popup').remove()">×</button>
        <h2>${recipe.name}</h2>
        ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin: 10px 0;">` : ''}
        <div class="recipe-details">
          <p><strong>Category:</strong> ${recipe.category || 'N/A'}</p>
          <p><strong>Origin:</strong> ${recipe.origin || 'N/A'}</p>
          <h3>Ingredients:</h3>
          <ul>
            ${recipe.ingredients ? recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('') : '<li>No ingredients listed</li>'}
          </ul>
          <h3>Instructions:</h3>
          <div style="white-space: pre-wrap;">${recipe.instructions || 'No instructions available'}</div>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  } catch (error) {
    console.error("Error viewing recipe:", error);
    alert("Error loading recipe details");
  }
};

function expandPost(element) {
  const content = element.closest('.post-content');
  const fullText = content.querySelector('.full-text');
  const truncatedText = content.querySelector('.truncated-text');
  const expandBtn = content.querySelector('.expand-btn');

  if (fullText && truncatedText) {
    if (truncatedText.style.display !== 'none') {
      truncatedText.style.display = 'none';
      fullText.style.display = 'block';
      expandBtn.innerHTML = '↑';
      expandBtn.title = 'Show less';
    } else {
      truncatedText.style.display = 'block';
      fullText.style.display = 'none';
      expandBtn.innerHTML = '↓';
      expandBtn.title = 'Show more';
    }
  }
}
function generateRandomHash() {
  return Math.random().toString(36).substring(2, 8);
}

// Add the escapeHtml function
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



function isCommunityPage() {
  return window.location.pathname.toLowerCase().includes('community.html');
}

let searchInput = null;
let postFilter = null;
let friendToggle = null;
let postContent = null;
let postType = null;
let anonymousCheck = null;
let visibilityCheck = null;
let currentUser = null;
let allPosts = [];
let filteredPosts = [];
let friendList = [];
let friendRequests = [];
let userIdToNameMap = {};
let sharePostBtn = null;

// Initialize UI function
function initializeUI() {
  getPostsContainer();
  createCommunityIcons();
  createUserSearchBar();
}



// Add missing updateNotificationBadge function
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge');
  if (!badge) return;
  
  if (friendRequests && friendRequests.length > 0) {
    badge.textContent = friendRequests.length;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// 🔹 Select Elements
function formatUserDisplay(username, userId) {
  if (!username || username === 'Anonymous') return 'Anonymous';
  
  const duplicateCount = userNameCount(username);
  // Only show hash for duplicate names
  return duplicateCount > 1 ? `${username} #${userId.substring(0, 6)}` : username;
}

// Usw these functions to get or create the elements when needed
function getCommunityHeader() {
  let header = document.querySelector(".community-header");
  if (!header) {
    header = document.createElement("div");
    header.className = "community-header";
    header.style.display = "flex";
    header.style.justifyContent = "flex-end";
    header.style.alignItems = "center";
    header.style.position = "absolute";
    header.style.top = "20px";
    header.style.right = "40px";
    header.style.zIndex = "1000";
    header.style.backgroundColor = "transparent";
    header.style.width = "auto"; // Added width auto
    
    document.body.appendChild(header);
  }
  return header;
}

function getPostsContainer() {
  let container = document.getElementById("communityFeed");
  if (!container) {
    container = document.createElement("div");
    container.id = "communityFeed";
    container.className = "community-feed";
    container.style.marginTop = "80px";
    container.style.padding = "20px";
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.maxWidth = "800px";
    container.style.margin = "80px auto 40px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "20px";
    container.style.minHeight = "calc(100vh - 200px)";
    container.style.background = "transparent";
    
    document.body.appendChild(container);
  }
  return container;
}


function listenForPosts() {
  if (!currentUser) {
    console.log("No current user");
    return;
  }
  
  const postsRef = collection(db, "sharedPosts");
  const q = query(postsRef, orderBy("timestamp", "desc"));
  
  console.log("Setting up posts listener...");
  
  return onSnapshot(q, (snapshot) => {
    console.log("Received snapshot update");
    allPosts = [];
    snapshot.forEach((doc) => {
      const post = { ...doc.data(), id: doc.id };
      allPosts.push(post);
    });
    
    console.log("Posts loaded:", allPosts.length);
    filterPosts();
  }, (error) => {
    console.error("Error listening for posts:", error);
  });
}

// Fix the loadUserNames function to properly return a Promise
async function loadUserNames() {
  try {
    console.log("Loading user names...");
    userIdToNameMap = {};
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const userId = docSnap.id;
      const displayName = data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Anonymous');
      
      userIdToNameMap[userId] = {
        name: displayName,
        email: data.email || ''
      };
    });

    console.log("Loaded user names:", userIdToNameMap);
    return true;
  } catch (error) {
    console.error("Error loading user names:", error);
    return false;
  }
}
// Add a function to create community icons that was missing
// Update the createCommunityIcons function to add labels under icons
function createCommunityIcons() {
  const header = getCommunityHeader(); 
  header.className = 'community-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'flex-end'; // Changed to flex-end
  header.style.padding = '10px';
  header.style.backgroundColor = 'transparent'; // Changed from #f3f4f6
  header.style.position = 'absolute';
  header.style.top = '20px';
  header.style.right = '40px';
  header.style.zIndex = '1000';
  header.style.width = 'auto';

  // Remove any existing text nodes
  while (header.firstChild) {
    header.removeChild(header.firstChild);
  }

// Create friend list container
  const friendListContainer = document.createElement("div");
  friendListContainer.className = "icon-container";
  friendListContainer.style.display = "flex";
  friendListContainer.style.flexDirection = "column";
  friendListContainer.style.alignItems = "center";
  friendListContainer.style.position = "relative";
  friendListContainer.style.cursor = "pointer";
  friendListContainer.style.backgroundColor = "#f3f4f6";
  friendListContainer.style.padding = "10px";
  friendListContainer.style.borderRadius = "12px";
  friendListContainer.style.width = "80px";
  
  const friendListIcon = document.createElement("div");
  friendListIcon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  const friendListLabel = document.createElement("span");
  friendListLabel.textContent = "Friends";
  friendListLabel.style.fontSize = "12px";
  friendListLabel.style.marginTop = "4px";
  friendListLabel.style.color = "#4b5563";
  
  friendListContainer.appendChild(friendListIcon);
  friendListContainer.appendChild(friendListLabel);
  friendListContainer.addEventListener("click", showFriendList);
  
  // Create friend requests icon with label
  const friendRequestsContainer = document.createElement("div");
  friendRequestsContainer.className = "icon-container";
  friendRequestsContainer.style.display = "flex";
  friendRequestsContainer.style.flexDirection = "column";
  friendRequestsContainer.style.alignItems = "center";
  friendRequestsContainer.style.position = "relative";
  friendRequestsContainer.style.marginLeft = "15px";
  friendRequestsContainer.style.cursor = "pointer";
  friendRequestsContainer.style.backgroundColor = "#f3f4f6";
  friendRequestsContainer.style.padding = "10px";
  friendRequestsContainer.style.borderRadius = "12px";
  friendRequestsContainer.style.width = "80px";
  
  const friendRequestsIcon = document.createElement("div");
  friendRequestsIcon.style.position = "relative";
  friendRequestsIcon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 8V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 11H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="notification-badge" style="display: none; position: absolute; top: -8px; right: -8px; background-color: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 12px; display: flex; justify-content: center; align-items: center; border: 2px solid white;"></span>
  `;
  
  const friendRequestsLabel = document.createElement("span");
  friendRequestsLabel.textContent = "Requests";
  friendRequestsLabel.style.fontSize = "12px";
  friendRequestsLabel.style.marginTop = "4px";
  friendRequestsLabel.style.color = "#4b5563";
  
  friendRequestsContainer.appendChild(friendRequestsIcon);
  friendRequestsContainer.appendChild(friendRequestsLabel);
  friendRequestsContainer.addEventListener("click", showFriendRequests);
 
  // Add containers to header
 header.appendChild(friendListContainer);
 header.appendChild(friendRequestsContainer);

 // Update notification badge
 updateNotificationBadge();

 return header;
}

function filterPosts() {
  if (!allPosts) {
    console.log("No posts to filter");
    return;
  }
  
  console.log("Starting to filter posts. Total posts:", allPosts.length);
  
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const selectedType = postFilter?.value || 'all';
  const friendsOnly = friendToggle?.checked || false;

  filteredPosts = allPosts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm);
    const matchesType = selectedType === 'all' || post.type === selectedType;
    const matchesFriends = !friendsOnly || (friendList && friendList.includes(post.userId));
    return matchesSearch && matchesType && matchesFriends;
  });

  console.log("Filtered posts:", filteredPosts.length);
  renderFilteredPosts();
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the community page
  if (!isCommunityPage()) return;

  // Initialize UI elements
  searchInput = document.getElementById("searchInput");
  postFilter = document.getElementById("postFilter");
  friendToggle = document.getElementById("friendToggle");
  postContent = document.getElementById("postContent");
  postType = document.getElementById("postType");
  anonymousCheck = document.getElementById("anonymousCheck");
  visibilityCheck = document.getElementById("visibilityCheck");
  sharePostBtn = document.getElementById("sharePostBtn");

  // Initialize recipe toggle and its event listeners
  const recipeToggle = document.getElementById('toggleArrow');
  if (recipeToggle && postType) {
    // Set initial visibility based on post type
    recipeToggle.style.display = postType.value === 'meal' ? 'block' : 'none';
    
    // Add click event listener for toggle
    recipeToggle.addEventListener('click', toggleRecipeSection);
    
    // Add change event listener for post type
    postType.addEventListener('change', function() {
      const recipeSection = document.getElementById('recipe-share-section');
      
      if (this.value === 'meal') {
        recipeToggle.style.display = 'block';
      } else {
        recipeToggle.style.display = 'none';
        if (recipeSection) {
          recipeSection.style.display = 'none';
        }
      }
    });
  }

  // Initialize UI components
  initializeUI();
  
  // Add event listeners
  if (searchInput) {
    searchInput.addEventListener('input', filterPosts);
    searchInput.addEventListener('click', function() {
      const postsContainer = getPostsContainer();
      postsContainer.style.display = 'block';
      filterPosts();
    });
  }
  if (postFilter) postFilter.addEventListener('change', filterPosts);
  if (friendToggle) friendToggle.addEventListener('change', filterPosts);
  if (sharePostBtn) sharePostBtn.addEventListener('click', sharePost);

  // Initialize auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    await loadUserNames();
    listenForPosts();
    listenForFriendRequests();
  });
});


function renderFilteredPosts() {
  const postsContainer = getPostsContainer();
  if (!postsContainer) return;

  postsContainer.innerHTML = '';
  
  if (!filteredPosts || filteredPosts.length === 0) {
    postsContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No posts available.</p>';
    return;
  }

  // Sort posts by timestamp (newest first)
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const timeA = a.timestamp?.toMillis() || 0;
    const timeB = b.timestamp?.toMillis() || 0;
    return timeB - timeA;
  });

  // Render each post using the renderPost function
  sortedPosts.forEach(post => {
    const postElement = renderPost(post);
    postsContainer.appendChild(postElement);
  });

  // Add event listeners to the new posts
  addPostEventListeners();
}

// Add this helper function for post event listeners
function addPostEventListeners() {
  // Add event listeners for comments sections
  document.querySelectorAll('.comments-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const container = this.nextElementSibling;
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Add event listeners for comment inputs
  document.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const postId = this.closest('.post').dataset.postId;
        submitComment(postId);
      }
    });
  });

  // Add event listeners for read more buttons
  document.querySelectorAll('.read-more-btn').forEach(button => {
    button.addEventListener('click', function() {
      const content = this.parentElement;
      content.classList.add('expanded');
      this.style.display = 'none';
    });
  });
  
  // Initialize comments sections to be hidden
  document.querySelectorAll('.comments-container').forEach(container => {
    container.style.display = 'none';
  });
}

function isCurrentUser(userId) {
  return currentUser && currentUser.uid === userId;
}

// Add missing showFriendList function
function showFriendList() {
  if (!currentUser) return;
  
  // Toggle panel if it already exists
  let panel = document.getElementById("friendListPanel");
  if (panel) {
    panel.remove();
    return;
  }
  
  // Close friend requests panel if open to avoid overlap
  const requestsPanel = document.getElementById("friendRequestsPanel");
  if (requestsPanel) {
    requestsPanel.remove();
  }
  
  panel = document.createElement("div");
  panel.id = "friendListPanel";
  panel.className = "friend-list-panel";
  panel.style.position = "fixed";
  panel.style.top = "140px"; // Below search bar
  panel.style.right = "20px";
  panel.style.width = "300px";
  panel.style.maxHeight = "calc(100vh - 160px)";
  panel.style.backgroundColor = "white";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
  panel.style.zIndex = "998";
  panel.style.overflowY = "auto";
  
  // Create panel header
  const header = document.createElement("div");
  header.className = "panel-header";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.padding = "15px";
  header.style.borderBottom = "1px solid #eee";
  
  const title = document.createElement("h3");
  title.textContent = "Friend List";
  title.style.margin = "0";
  
  // Add a plus button to add friends
  const addFriendBtn = document.createElement("button");
  addFriendBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 5v14m-7-7h14" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  addFriendBtn.style.display = "flex";
  addFriendBtn.style.alignItems = "center";
  addFriendBtn.style.justifyContent = "center";
  addFriendBtn.style.width = "30px";
  addFriendBtn.style.height = "30px";
  addFriendBtn.style.backgroundColor = "#3b82f6";
  addFriendBtn.style.color = "white";
  addFriendBtn.style.border = "none";
  addFriendBtn.style.borderRadius = "50%";
  addFriendBtn.style.cursor = "pointer";
  addFriendBtn.title = "Add Friend";
  addFriendBtn.addEventListener("click", () => {
    // Show search popup for adding friends
    const searchInput = document.querySelector(".user-search-input");
    if (searchInput) {
      searchInput.focus();
    } else {
      createUserSearchBar();
      setTimeout(() => {
        const newSearchInput = document.querySelector(".user-search-input");
        if (newSearchInput) newSearchInput.focus();
      }, 100);
    }
  });
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-panel";
  closeBtn.innerHTML = "×"; // Changed from &times; to × for better visibility
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.fontSize = "28px"; // Increased size
  closeBtn.style.cursor = "pointer";
  closeBtn.style.color = "#666";
  closeBtn.style.padding = "0 5px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.transition = "color 0.2s";
  closeBtn.addEventListener("mouseover", () => closeBtn.style.color = "#000");
  closeBtn.addEventListener("mouseout", () => closeBtn.style.color = "#666");
  closeBtn.addEventListener("click", () => panel.remove());
  
  
  const headerControls = document.createElement("div");
  headerControls.style.display = "flex";
  headerControls.style.alignItems = "center";
  headerControls.style.gap = "10px";
  
  
  headerControls.appendChild(closeBtn);
  
  header.appendChild(title);
  header.appendChild(headerControls);
  panel.appendChild(header);
  
  // Create panel content
  const content = document.createElement("div");
  content.className = "panel-content";
  content.style.padding = "15px";
  
  if (!friendList || friendList.length === 0) {
    content.innerHTML = "<p>You don't have any friends yet.</p>";
  } else {
    content.innerHTML = "<p>Loading friends...</p>";
    
    // Load friend details
    const loadFriends = async () => {
      try {
        const friendsHTML = [];
        for (const friendId of friendList) {
            const friendDoc = await getDoc(doc(db, "users", friendId));
            if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                const displayName = friendData.displayName || friendData.name;
                const email = friendData.email;
                const username = displayName || (email ? email.split('@')[0] : 'User');
                const avatar = generateUserAvatar(friendId, username);
                
                // Count username occurrences
                const usersWithSameName = Object.values(userIdToNameMap).filter(user => 
                    user && user.name === username
                ).length;
                
                friendsHTML.push(`
                    <div class="friend-item" style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div class="user-initial" style="
                            width: 40px; 
                            height: 40px; 
                            background-color: ${avatar.color}; 
                            color: white; 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            font-weight: bold; 
                            font-size: 16px;
                            font-family: system-ui, -apple-system, sans-serif;">
                            ${avatar.initials}
                        </div>
                        <div style="flex: 1; margin-left: 10px;">
                            <div style="font-weight: 500; color: #1f2937;">
                                ${username}${usersWithSameName > 1 ? ` #${friendId.substring(0, 6)}` : ''}
                            </div>
                        </div>
                        <button onclick="removeFriend('${friendId}')" style="padding: 5px 10px; border: none; border-radius: 4px; background-color: #ef4444; color: white; cursor: pointer;">
                            Remove
                        </button>
                    </div>
                `);
            }
        }
        
        if (friendsHTML.length > 0) {
          content.innerHTML = friendsHTML.join('');
        } else {
          content.innerHTML = "<p>You don't have any friends yet.</p>";
        }
      } catch (error) {
        console.error("Error loading friends:", error);
        content.innerHTML = "<p>Error loading friends. Please try again.</p>";
      }
    };
    
    loadFriends();
  }
  
  panel.appendChild(content);
  document.body.appendChild(panel);
}

// Make getPostTypeIcon globally accessible
function getPostTypeIcon(type) {
  const icons = {
    meal: '🍽️',
    workout: '💪',
    mindset: '🧠',
    sleep: '🛌',
    hydration: '💧',
    weight: '📉',
    health: '🩺',
    achievement: '🏆',
    motivation: '🌟',
    question: '❓'
  };
  return icons[type] || '📝';
}

// Make deletePost globally accessible
async function deletePost(postId) {
  try {
    await deleteDoc(doc(db, "sharedPosts", postId));
    alert('Post deleted successfully.');
    renderFilteredPosts();
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('Error deleting post. Please try again.');
  }
}

// Add this function to create a search bar for users
function createUserSearchBar() {
  // Remove any existing search container
  const existingSearch = document.querySelector('.user-search-container');
  if (existingSearch) {
    existingSearch.remove();
  }

  const searchContainer = document.createElement("div");
  searchContainer.className = "user-search-container";
  searchContainer.style.display = "flex";
  searchContainer.style.alignItems = "center";
  searchContainer.style.position = "absolute"; 
  searchContainer.style.top = "20px"; // Added top position
  searchContainer.style.left = "300px"; 
  searchContainer.style.zIndex = "1000"; // Increased z-index
  searchContainer.style.backgroundColor = "white"; // Changed from transparent
  searchContainer.style.padding = "8px 16px";
  searchContainer.style.borderRadius = "30px";
  searchContainer.style.width = "300px";
  searchContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; // Added shadow
  

  // Create suggestions container
  const suggestionsContainer = document.createElement("div");
  suggestionsContainer.className = "search-suggestions";
  suggestionsContainer.style.position = "absolute";
  suggestionsContainer.style.top = "100%";
  suggestionsContainer.style.left = "0";
  suggestionsContainer.style.width = "100%";
  suggestionsContainer.style.maxHeight = "200px";
  suggestionsContainer.style.overflowY = "auto";
  suggestionsContainer.style.backgroundColor = "white";
  suggestionsContainer.style.borderRadius = "8px";
  suggestionsContainer.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
  suggestionsContainer.style.display = "none";
  suggestionsContainer.style.zIndex = "1000";
  
  // Create search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search users...";
  searchInput.className = "user-search-input";
  searchInput.style.padding = "8px 12px";
  searchInput.style.borderRadius = "20px";
  searchInput.style.border = "none";
  searchInput.style.outline = "none";
  searchInput.style.width = "100%";
  searchInput.style.fontSize = "14px";
  searchInput.style.backgroundColor = "transparent";
  
  // Create search button
  const searchButton = document.createElement("button");
  searchButton.className = "user-search-button";
  searchButton.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`;
  searchButton.style.background = "none";
  searchButton.style.border = "none";
  searchButton.style.cursor = "pointer";
  searchButton.style.color = "#6b7280";
  searchButton.style.display = "flex";
  searchButton.style.alignItems = "center";
  searchButton.style.justifyContent = "center";
  
  // Add event listeners
  searchInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 1) {
      suggestionsContainer.style.display = "none";
      return;
    }
  
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const suggestions = [];
      const usernameCounts = {};
      
      
      // Count username occurrences
      usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const displayName = userData.displayName || userData.name;
        const username = displayName || (userData.email ? userData.email.split('@')[0] : 'User');
        usernameCounts[username.toLowerCase()] = (usernameCounts[username.toLowerCase()] || 0) + 1;
      });
  
      usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const userId = docSnap.id;
        if (userId === currentUser.uid) return;
        
        const displayName = userData.displayName || userData.name;
        const email = userData.email;
        const username = displayName || (email ? email.split('@')[0] : 'User');
        
        if (username.toLowerCase().includes(query)) {
          suggestions.push({ 
            id: userId, 
            username, 
            email,
            hasDuplicate: usernameCounts[username.toLowerCase()] > 1
          });
        }
      });
  
      if (suggestions.length > 0) {
        suggestionsContainer.innerHTML = suggestions.map(user => {
          const avatar = generateUserAvatar(user.id, user.username);
          return `
            <div class="suggestion-item" onclick="searchUsers('${user.username}')" 
              style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
              <div class="user-initial" style="
                width: 40px; 
                height: 40px; 
                background-color: ${avatar.color}; 
                color: white; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: bold; 
                font-size: 16px;
                font-family: system-ui, -apple-system, sans-serif;">
                ${avatar.initials}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 500; color: #1f2937;">
                  ${user.username}${user.hasDuplicate ? ` #${user.id.substring(0, 6)}` : ''}
                </div>
                ${user.email ? `<div style="font-size: 12px; color: #6b7280;">${user.email}</div>` : ''}
              </div>
            </div>
          `;
        }).join('');
        suggestionsContainer.style.display = "block";
      } else {
        suggestionsContainer.innerHTML = '<div style="padding: 8px 16px; color: #6b7280;">No users found</div>';
        suggestionsContainer.style.display = "block";
      }
    } catch (error) {
      console.error("Error searching users:", error);
      suggestionsContainer.innerHTML = '<div style="padding: 8px 16px; color: #ef4444;">Error searching users</div>';
      suggestionsContainer.style.display = "block";
    }
  });
   
  
  
  searchButton.addEventListener("click", () => {
    searchUsers(searchInput.value.trim());
  });
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchButton);
  searchContainer.appendChild(suggestionsContainer);
  
  document.body.appendChild(searchContainer);
  }

// Add this function to search for users
async function searchUsers(query) {
  if (!query) {
    alert("Please enter a username to search");
    return;
  }
  
  try {
    console.log("Searching for users with query:", query);
    
    // Create results popup
    let popup = document.getElementById("userSearchPopup");
    if (popup) {
      popup.remove();
    }
    
    popup = document.createElement("div");
    popup.id = "userSearchPopup";
    popup.className = "user-search-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.backgroundColor = "white";
    popup.style.borderRadius = "8px";
    popup.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
    popup.style.width = "350px";
    popup.style.maxHeight = "500px";
    popup.style.overflowY = "auto";
    popup.style.zIndex = "1000";
    
    // Create popup header
    const header = document.createElement("div");
    header.className = "popup-header";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "15px";
    header.style.borderBottom = "1px solid #eee";
    
    const title = document.createElement("h3");
    title.textContent = "Search Results";
    title.style.margin = "0";
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-popup";
    closeBtn.innerHTML = "&times;";
    closeBtn.style.background = "none";
    closeBtn.style.border = "none";
    closeBtn.style.fontSize = "24px";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => popup.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    popup.appendChild(header);
    
    // Create popup content
    const content = document.createElement("div");
    content.className = "popup-content";
    content.style.padding = "15px";
    
    // Loading indicator
    content.innerHTML = "<p>Searching for users...</p>";
    popup.appendChild(content);
    document.body.appendChild(popup);
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = [];
    
    usersSnapshot.forEach(docSnap => {
      const userData = docSnap.data();
      const userId = docSnap.id;
      
      // Skip current user
      if (userId === currentUser.uid) return;
      
      // Get display name or email
      const displayName = userData.displayName || userData.name;
      const email = userData.email;
      const username = displayName || (email ? email.split('@')[0] : 'User');
      
      // Check if username or email matches query
      if (
        username.toLowerCase().includes(query.toLowerCase()) ||
        (email && email.toLowerCase().includes(query.toLowerCase()))
      ) {
        users.push({
          id: userId,
          username,
          email
        });
      }
    });
    
    // Update content with results
    content.innerHTML = "";
    if (users.length === 0) {
      content.innerHTML = "<p>No users found matching your search.</p>";
  } else {
      users.forEach(user => {
          const userItem = document.createElement("div");
          userItem.className = "user-item";
          userItem.style.display = "flex";
          userItem.style.alignItems = "center";
          userItem.style.marginBottom = "15px";
          userItem.style.paddingBottom = "15px";
          userItem.style.borderBottom = "1px solid #eee";
          
          const avatar = generateUserAvatar(user.id, user.username);
          
          // Count username occurrences
          const usersWithSameName = Object.values(userIdToNameMap).filter(u => 
              u && u.name === user.username
          ).length;
          
          userItem.innerHTML = `
              <div class="user-initial" style="
                  width: 40px; 
                  height: 40px; 
                  background-color: ${avatar.color}; 
                  color: white; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  font-weight: bold; 
                  font-size: 16px;
                  margin-right: 10px;
                  font-family: system-ui, -apple-system, sans-serif;">
                  ${avatar.initials}
              </div>
              <div style="flex: 1;">
                  <div style="font-weight: 500; color: #1f2937;">
                      ${user.username}${usersWithSameName > 1 ? ` #${user.id.substring(0, 6)}` : ''}
                  </div>
                  ${user.email ? `<div style="font-size: 12px; color: #6b7280;">${user.email}</div>` : ''}
              </div>
              <button onclick="sendFriendRequest('${user.id}')" class="add-friend-btn" style="
                  padding: 5px 10px;
                  border: none;
                  border-radius: 4px;
                  background-color: #3b82f6;
                  color: white;
                  cursor: pointer;
                  font-size: 14px;">
                  Add Friend
              </button>
          `;
          content.appendChild(userItem);
      });
  }
} catch (error) {
console.error("Error searching users:", error);
content.innerHTML = "<p>Error searching for users. Please try again.</p>";
}
} 
// Add this function to send friend requests
async function sendFriendRequest(userId) {
  if (!currentUser) return;
  
  try {
    // Create a unique ID for the friend request
    const requestId = `${currentUser.uid}_${userId}`;
    const requestRef = doc(db, "friendRequests", requestId);
    
    // Check if request already exists
    const existingRequest = await getDoc(requestRef);
    if (existingRequest.exists()) {
      alert('Friend request already sent!');
      return;
    }
    
    // Send the friend request
    await setDoc(requestRef, {
      from: currentUser.uid,
      to: userId,
      status: 'pending',
      timestamp: serverTimestamp(),
      fromName: currentUser.displayName || currentUser.email
    });
    
    alert('Friend request sent!');
  } catch (error) {
    console.error('Error sending friend request:', error);
    alert('Error sending friend request. Please try again.');
  }
}

// Make these functions globally accessible
window.getPostTypeIcon = getPostTypeIcon;
window.deletePost = deletePost;
window.searchUsers = searchUsers;
window.sendFriendRequest = sendFriendRequest;





// Add missing getAvatarUrl function
function getAvatarUrl(userId, anonymous = false) {
  if (anonymous) {
    return 'https://ui-avatars.com/api/?name=Anonymous&background=random';
  }
  const userInfo = userIdToNameMap[userId];
  const name = userInfo?.name || 'User';
  const email = userInfo?.email;
  
  // Use email prefix for duplicate names
  const displayName = Object.values(userIdToNameMap).filter(user => 
    user && user.name === name
  ).length > 1 ? `${name} ${email?.split('@')[0] || ''}` : name;
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
}


// Add missing listenForFriendRequests function
function listenForFriendRequests() {
  if (!currentUser) return;
  
  const userRef = doc(db, "users", currentUser.uid);
  
  onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      friendRequests = userData.friendRequests || [];
      friendList = userData.friends || [];
      
      // Update notification badge
      updateNotificationBadge();
      
      // Update friend list panel if open
      const friendListPanel = document.getElementById("friendListPanel");
      if (friendListPanel) {
        showFriendList();
      }
      
      // Update friend requests panel if open
      const friendRequestsPanel = document.getElementById("friendRequestsPanel");
      if (friendRequestsPanel) {
        showFriendRequests();
      }
      
      // Refresh posts to update friend-only visibility
      filterPosts();
    }
  });
}
// Add missing showFriendRequests function
function showFriendRequests() {
  if (!currentUser) return;
  
  // Toggle panel if it already exists
  let panel = document.getElementById("friendRequestsPanel");
  if (panel) {
    panel.remove();
    return;
  }
  
  // Close friend list panel if open to avoid overlap
  const friendPanel = document.getElementById("friendListPanel");
  if (friendPanel) {
    friendPanel.remove();
  }
  
  panel = document.createElement("div");
  panel.id = "friendRequestsPanel";
  panel.className = "friend-requests-panel";
  panel.style.position = "fixed";
  panel.style.top = "140px"; // Below search bar
  panel.style.right = "20px"; // Same position as friend list to avoid overlap
  panel.style.width = "300px";
  panel.style.maxHeight = "calc(100vh - 160px)";
  panel.style.backgroundColor = "white";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
  panel.style.zIndex = "998";
  panel.style.overflowY = "auto";
  
  // Create panel header
  const header = document.createElement("div");
  header.className = "panel-header";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.padding = "15px";
  header.style.borderBottom = "1px solid #eee";
  
  const title = document.createElement("h3");
  title.textContent = "Friend Requests";
  title.style.margin = "0";
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-panel";
  closeBtn.innerHTML = "×"; // Changed from &times; to × for better visibility
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.fontSize = "28px"; // Increased size
  closeBtn.style.cursor = "pointer";
  closeBtn.style.color = "#666";
  closeBtn.style.padding = "0 5px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.transition = "color 0.2s";
  closeBtn.addEventListener("mouseover", () => closeBtn.style.color = "#000");
  closeBtn.addEventListener("mouseout", () => closeBtn.style.color = "#666");
  closeBtn.addEventListener("click", () => panel.remove());
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);
  
  // Create panel content
  const content = document.createElement("div");
  content.className = "panel-content";
  content.style.padding = "15px";
  
  if (!friendRequests || friendRequests.length === 0) {
    content.innerHTML = "<p>You don't have any friend requests.</p>";
  } else {
    const requestsHTML = friendRequests.map(request => {
      const username = request.username;
      const usersWithSameName = Object.values(userIdToNameMap).filter(user => 
        user && user.name === username
      ).length;
      
      const displayUsername = usersWithSameName > 1 ? 
        `${username} #${request.userId.substring(0, 6)}` : 
        username;
  
      return `
        <div class="request-item" style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <img src="${getAvatarUrl(request.userId)}" alt="User Avatar" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 500;">${displayUsername}</div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="acceptFriendRequest('${request.userId}')" style="padding: 5px 10px; border: none; border-radius: 4px; background-color: #10b981; color: white; cursor: pointer;">Accept</button>
            <button onclick="rejectFriendRequest('${request.userId}')" style="padding: 5px 10px; border: none; border-radius: 4px; background-color: #ef4444; color: white; cursor: pointer;">Decline</button>
          </div>
        </div>
      `;
    }).join('');
  
  
    
    content.innerHTML = requestsHTML;
  }
  
  panel.appendChild(content);
  document.body.appendChild(panel);
}

// Add missing acceptFriendRequest function
async function acceptFriendRequest(userId) {
  try {
    if (!currentUser) return;
    
    // Get current user data
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
      alert("Your user profile could not be found.");
      return;
    }
    
    const userData = userDoc.data();
    const currentFriends = userData.friends || [];
    const currentRequests = userData.friendRequests || [];
    
    // Find the request
    const requestIndex = currentRequests.findIndex(req => req.userId === userId);
    if (requestIndex === -1) {
      alert("Friend request not found.");
      return;
    }
    
    // Add to friends list
    if (!currentFriends.includes(userId)) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(userId)
      });
    }
    
    // Remove from friend requests
    const updatedRequests = [...currentRequests];
    updatedRequests.splice(requestIndex, 1);
    
    await updateDoc(doc(db, "users", currentUser.uid), {
      friendRequests: updatedRequests
    });
    
    // Add current user to other user's friends list
    await updateDoc(doc(db, "users", userId), {
      friends: arrayUnion(currentUser.uid)
    });
    
    alert("Friend request accepted!");
    
    // Refresh the friend requests popup
    showFriendRequests();
  } catch (error) {
    console.error("Error accepting friend request:", error);
    alert("Error accepting friend request. Please try again.");
  }
}

// Add missing rejectFriendRequest function
async function rejectFriendRequest(userId) {
  try {
    if (!currentUser) return;
    
    // Get current user data
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
      alert("Your user profile could not be found.");
      return;
    }
    
    const userData = userDoc.data();
    const currentRequests = userData.friendRequests || [];
    
    // Find the request
    const requestIndex = currentRequests.findIndex(req => req.userId === userId);
    if (requestIndex === -1) {
      alert("Friend request not found.");
      return;
    }
    
    // Remove from friend requests
    const updatedRequests = [...currentRequests];
    updatedRequests.splice(requestIndex, 1);
    
    await updateDoc(doc(db, "users", currentUser.uid), {
      friendRequests: updatedRequests
    });
    
    alert("Friend request rejected.");
    
    // Refresh the friend requests popup
    showFriendRequests();
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    alert("Error rejecting friend request. Please try again.");
  }
}

// Add missing removeFriend function
async function removeFriend(friendId) {
  try {
    if (!currentUser) return;
    
    // Get current user data
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
      alert("Your user profile could not be found.");
      return;
    }
    
    const userData = userDoc.data();
    const currentFriends = userData.friends || [];
    
    // Check if friend exists
    if (!currentFriends.includes(friendId)) {
      alert("Friend not found in your friend list.");
      return;
    }
    
    // Remove from friends list
    const updatedFriends = currentFriends.filter(id => id !== friendId);
    
    await updateDoc(doc(db, "users", currentUser.uid), {
      friends: updatedFriends
    });
    
    // Remove current user from other user's friends list
    const friendDoc = await getDoc(doc(db, "users", friendId));
    if (friendDoc.exists()) {
      const friendData = friendDoc.data();
      const friendsFriends = friendData.friends || [];
      
      if (friendsFriends.includes(currentUser.uid)) {
        const updatedFriendsFriends = friendsFriends.filter(id => id !== currentUser.uid);
        
        await updateDoc(doc(db, "users", friendId), {
          friends: updatedFriendsFriends
        });
      }
    }
    
    alert("Friend removed successfully.");
    
    // Refresh the friend list popup
    showFriendList();
  } catch (error) {
    console.error("Error removing friend:", error);
    alert("Error removing friend. Please try again.");
  }
}

// Add missing sharePost function
async function sharePost() {
  if (!currentUser) return alert("⚠️ You must be logged in to share a post.");

  // Get values instead of setting them to empty
  const content = postContent.value;
  const type = postType.value;
  const anonymous = anonymousCheck.checked;
  const friendsOnly = visibilityCheck.checked;

  if (!content.trim()) {
    alert('Please enter post content.');
    return;
  }

  try {
    // Create post data
    const postData = {
      userId: currentUser.uid,
      content: content,
      type: type,
      timestamp: serverTimestamp(),
      anonymous: anonymous,
      friendsOnly: friendsOnly,
      likes: [],
      comments: []
    };

    // Add recipe data if recipes were selected
    if (window.selectedRecipeIds && window.selectedRecipeIds.length > 0) {
      postData.recipeIds = window.selectedRecipeIds;
      // Get recipe names for display
      const recipeNames = [];
      for (const recipeId of window.selectedRecipeIds) {
        const recipeRef = doc(db, "users", currentUser.uid, "savedRecipes", recipeId);
        const recipeSnap = await getDoc(recipeRef);
        if (recipeSnap.exists()) {
          recipeNames.push(recipeSnap.data().name);
        }
      }
      postData.recipeNames = recipeNames;
    }

    // Add post to database
    await addDoc(collection(db, "sharedPosts"), postData);

    // Reset form
    postContent.value = '';
    postType.value = 'meal';
    anonymousCheck.checked = false;
    visibilityCheck.checked = false;
    window.selectedRecipeIds = [];

    // Reset recipe section
    const recipeSection = document.getElementById('recipe-share-section');
    const arrowIcon = document.getElementById('arrowIcon');
    if (recipeSection && arrowIcon) {
      recipeSection.style.display = 'none';
      arrowIcon.textContent = '▼';
      arrowIcon.style.transform = 'rotate(0deg)';
    }

    alert('Post shared successfully! 🎉');
  } catch (error) {
    console.error('Error sharing post:', error);
    alert('Error sharing post. Please try again.');
  }
}

async function viewRecipeDetails(recipeId) {
  try {
    const recipeRef = doc(db, "users", currentUser.uid, "savedRecipes", recipeId);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      alert("Recipe not found");
      return;
    }

    const recipe = recipeDoc.data();
    
    const popup = document.createElement('div');
    popup.className = 'recipe-popup';
    popup.innerHTML = `
      <div class="recipe-popup-content">
        <button class="close-btn" onclick="this.closest('.recipe-popup').remove()">×</button>
        <h2>${recipe.name}</h2>
        <img src="${recipe.image}" alt="${recipe.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin: 10px 0;">
        <div class="recipe-details">
          <p><strong>Category:</strong> ${recipe.category}</p>
          <p><strong>Origin:</strong> ${recipe.origin}</p>
          <h3>Ingredients:</h3>
          <ul>
            ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
          </ul>
          <h3>Instructions:</h3>
          <ol>
            ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Close popup when clicking outside
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.remove();
    });
  } catch (error) {
    console.error("Error loading recipe details:", error);
    alert("Error loading recipe details. Please try again.");
  }
}


  // Add postType event listener and trigger initial state
  if (postType) {
    const handlePostTypeChange = async (e) => {
      const recipeContainer = document.getElementById('recipe-share-section');
      if (e.target.value === 'meal') {
        if (!recipeContainer) {
          try {
            const recipesRef = collection(db, "users", currentUser.uid, "savedRecipes");
            const recipesSnapshot = await getDocs(recipesRef);
            const recipes = [];
            recipesSnapshot.forEach(doc => {
              recipes.push({ id: doc.id, ...doc.data() });
            });

            const container = document.createElement('div');
            container.id = 'recipe-share-section';
            container.innerHTML = `
              <div id="recipe-share-container" style="padding: 15px;">
                <div class="results-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 20px;">
                  ${recipes.length ? recipes.map(recipe => `
                    <div class="recipe-card" style="background: #fefefe; border-radius: 16px; box-shadow: 0 3px 12px rgba(0,0,0,0.06); overflow: hidden;">
                      <img src="${recipe.image}" alt="${recipe.name}" style="width: 100%; height: 180px; object-fit: cover;">
                      <div class="card-body" style="padding: 16px;">
                        <h3 style="font-size: 18px; margin-bottom: 10px;">${recipe.name}</h3>
                        <p style="font-size: 14px; margin-bottom: 12px;">${recipe.instructions.substring(0, 100)}...</p>
                        <button onclick="selectRecipeToShare('${recipe.id}', '${recipe.name}')" 
                                style="width: 100%; padding: 10px; background-color: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">
                          Share This Recipe
                        </button>
                      </div>
                    </div>
                  `).join('') : 
                  '<div style="text-align: center; padding: 20px; color: #666;">No saved recipes yet. Save some recipes from the Recipe page first!</div>'}
                </div>
                <input type="hidden" id="recipe-select" value="">
              </div>
            `;
            postType.parentNode.insertBefore(container, postType.nextSibling);

            // Add the selection function to window scope
            window.selectRecipeToShare = function(recipeId, recipeName) {
              const postContentEl = document.getElementById('postContent');
              if (postContentEl) {
                postContentEl.value = `Check out my recipe for ${recipeName}!`;
              }
              const recipeSelect = document.getElementById('recipe-select');
              if (recipeSelect) {
                recipeSelect.value = recipeId;
              }
            };

          } catch (error) {
            console.error('Error loading recipes:', error);
            // Show error message
            const container = document.createElement('div');
            container.id = 'recipe-share-section';
            container.innerHTML = `
              <div id="recipe-share-container" style="padding: 15px;">
                <div style="color: #ef4444; text-align: center; padding: 10px;">Error loading recipes. Please try again.</div>
                <input type="hidden" id="recipe-select" value="">
              </div>
            `;
            postType.parentNode.insertBefore(container, postType.nextSibling);
          }
        }
      } else {
        recipeContainer?.remove();
      }
    };

    // Remove any existing listeners and add the new one
    postType.removeEventListener('change', handlePostTypeChange);
    postType.addEventListener('change', handlePostTypeChange);

    // Trigger the change event immediately if type is 'meal'
    if (postType.value === 'meal') {
      postType.dispatchEvent(new Event('change'));
    }
  }
  
// Make these functions globally accessible
window.getPostTypeIcon = getPostTypeIcon;
window.deletePost = deletePost;
window.searchUsers = searchUsers;
window.sendFriendRequest = sendFriendRequest;
window.showFriendList = showFriendList;
window.showFriendRequests = showFriendRequests;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.removeFriend = removeFriend;
window.escapeHtml = escapeHtml;  
window.expandPost = expandPost;
window.viewRecipeDetails = viewRecipeDetails;
window.generateUserAvatar = generateUserAvatar;
window.toggleLike = toggleLike;

