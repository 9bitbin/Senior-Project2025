document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('body').insertAdjacentHTML('afterbegin', `
      <div class="sidebar">
        <h2>VIDIA</h2>
        <ul>
          <li><a href="home.html">🏠 Dashboard</a></li>
          <li><a href="profile.html">👤 Profile</a></li>
          <li><a href="nutrition.html">🍎 Nutrition & Meals</a></li>
          <li><a href="budget.html">💰 Budget</a></li>
          <li><a href="exercise.html">🏋️‍♂️ Exercise</a></li>
          <li><a href="fasting.html">⏳ Fasting</a></li>
          <li><a href="recipe.html">📖 Recipes</a></li>
          <li><a href="community.html">🌍 Community</a></li>
          <li><a href="messaging.html">💬 Messaging</a></li>
          <li><a href="ai-advice.html">🧠 AI Advisor</a></li>
          <li><a href="ai-meals.html">🤖 AI Meals</a></li>
          <li><a href="goalsweightpage.html">🎯Goals & ⚖️Weight</a></li>
          <li><a href="weight.html">⚖️ Weight</a></li>
          <li><a href="goals.html">🎯 Goals</a></li>
          <li><a href="index.html">🚪 Logout</a></li>
        </ul>
      </div>
    `);
  });
  