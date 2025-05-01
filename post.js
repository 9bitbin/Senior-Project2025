// Function to display posts
function displayPosts(postsToShow) {
    const postList = document.getElementById('postList');
    postList.innerHTML = ''; // clear old posts
    
    postsToShow.forEach(post => {
      const div = document.createElement('div');
      div.textContent = post.content;
      postList.appendChild(div);
    });
  }
  
  // Initially show all posts
  displayPosts(posts);
  
  // Add filter on button click
  document.getElementById('filterMyPostsBtn').addEventListener('click', () => {
    const myPosts = posts.filter(post => post.userId === currentUserId);
    displayPosts(myPosts);
  });
  