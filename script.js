const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));


const ingredientInput = $('#ingredient');
const searchBtn = $('#searchBtn');
const resultsEl = $('#results');
const detailEl = $('#detail');
const timeSelect = $('#timeSelect');

let lastResults = []; 


function showEmpty(message) {
  resultsEl.innerHTML = `<div class="empty">${message}</div>`;
}


function clearDetail() {
  detailEl.hidden = true;
  detailEl.innerHTML = '';
}


function openDetail(html) {
  detailEl.hidden = false;
  detailEl.innerHTML = html;
  detailEl.querySelector('.close')?.addEventListener('click', clearDetail);
}


function renderList(meals) {
  if (!meals || meals.length === 0) {
    showEmpty('No recipes found. Try a different ingredient.');
    return;
  }

  resultsEl.innerHTML = meals.map(m => `
    <article class="card" data-id="${m.idMeal}" tabindex="0" aria-label="${m.strMeal}">
      <img src="${m.strMealThumb}" alt="${m.strMeal}" loading="lazy" />
      <h3>${m.strMeal}</h3>
    </article>
  `).join('');

  
  $$('.card').forEach(card => {
    card.addEventListener('click', () => fetchMealDetail(card.dataset.id));
    card.addEventListener('keypress', e => {
      if (e.key === 'Enter') fetchMealDetail(card.dataset.id);
    });
  });
}


async function fetchByIngredient(ingredient) {
  if (!ingredient || ingredient.trim().length < 1) {
    showEmpty('Type an ingredient and press Search.');
    return;
  }

  showEmpty('Searching...');
  try {
    const res = await fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(ingredient.trim())}`);
    const data = await res.json();
    lastResults = data.meals || [];
    applyFiltersAndRender();
  } catch (err) {
    showEmpty('Network or API error. Check console.');
    console.error(err);
  }
}


async function fetchMealDetail(id) {
  if (!id) return;
  openDetail('<div class="empty">Loading details…</div>');
  try {
    const res = await fetch(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`);
    const data = await res.json();
    const meal = (data.meals && data.meals[0]) || null;

    if (!meal) {
      openDetail('<div class="empty">Details not available.</div>');
      return;
    }

    
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
      }
    }

    
    const html = `
      <div class="close" role="button" tabindex="0">Close ✕</div>
      <h2>${meal.strMeal}</h2>
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" style="width:100%;border-radius:8px;margin-bottom:8px" />
      <strong>Category:</strong> ${meal.strCategory || '—'}<br />
      <strong>Area:</strong> ${meal.strArea || '—'}<br />
      <h3>Ingredients</h3>
      <ul>${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      <h3>Instructions</h3>
      <p style="white-space:pre-wrap;font-size:0.93rem">${meal.strInstructions}</p>
      ${meal.strYoutube ? `<p><a href="${meal.strYoutube}" target="_blank" rel="noopener">Watch on YouTube</a></p>` : ''}
    `;
    openDetail(html);
  } catch (err) {
    openDetail('<div class="empty">Failed to load meal details.</div>');
    console.error(err);
  }
}


function applyFiltersAndRender() {
  let filtered = lastResults.slice();


  const timeVal = timeSelect.value;
  if (timeVal !== 'any') {
    const max = parseInt(timeVal, 10);
    filtered = filtered.filter(m => {
      const title = m.strMeal.toLowerCase();
      const quickKeywords = ['salad','wrap','sandwich','stir','taco','omelet','quick','soup'];
      const slowKeywords = ['stew','casserole','braise','roast','bake','slow'];
      if (max <= 15) {
        return quickKeywords.some(k => title.includes(k));
      }
      if (max <= 30) {
        return quickKeywords.some(k => title.includes(k)) || !slowKeywords.some(k => title.includes(k));
      }
      return true;
    });
  }

  const checkedMoods = $$('.mood-cb:checked').map(i => i.value);
  if (checkedMoods.length) {
    filtered = filtered.filter(m => {
      const title = m.strMeal.toLowerCase();
      const moodMap = {
        comfort: ['casserole','stew','pie','pot roast','curry'],
        light: ['salad','grill','grilled','light','sashimi','ceviche','steamed'],
        spicy: ['chili','spicy','hot','pepper','szechuan','cajun']
      };
      return checkedMoods.some(mood =>
        (moodMap[mood] || []).some(k => title.includes(k))
      );
    });
  }

  renderList(filtered);
}


searchBtn.addEventListener('click', () => fetchByIngredient(ingredientInput.value));
ingredientInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchByIngredient(ingredientInput.value);
});
timeSelect.addEventListener('change', applyFiltersAndRender);
$$('.mood-cb').forEach(cb => cb.addEventListener('change', applyFiltersAndRender));


showEmpty('Type an ingredient (e.g., "chicken") and press Search.');
