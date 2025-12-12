/* app.js — handles homepage, search page, recipe page using TheMealDB
   Endpoints:
   - Search by ingredient: https://www.themealdb.com/api/json/v1/1/filter.php?i=chicken
   - Search by name:       https://www.themealdb.com/api/json/v1/1/search.php?s=Arrabiata
   - Lookup by id:         https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772
   - Random meal:          https://www.themealdb.com/api/json/v1/1/random.php
*/

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

// helper: escape
function esc(s){ return (s||'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

// small DOM helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// debounce
function debounce(fn, wait=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); } }

// Detect page by body id
const page = document.body.id || '';

if (page === 'page-home') initHome();
if (page === 'page-search') initSearch();
if (page === 'page-recipe') initRecipe();

/* ---------------- HOME ---------------- */
function initHome(){
  const trendingGrid = $('#trendingGrid');
  const featuredGrid = $('#featuredGrid');
  const tagList = $('#tagList');
  const searchForm = $('#searchForm');
  const searchInput = $('#searchInput');

  // basic tags
  const tags = ['chicken','beef','rice','egg','salmon','pasta','soup','cake','tofu','potato'];
  tags.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag';
    btn.textContent = capitalize(t);
    btn.onclick = ()=> location.href = `search.html?q=${encodeURIComponent(t)}`;
    tagList.appendChild(btn);
  });

  // trending: fetch multiple random meals
  (async function loadTrending(){
    trendingGrid.innerHTML = 'Loading...';
    try {
      const promises = [];
      for(let i=0;i<6;i++) promises.push(fetch(`${API_BASE}/random.php`).then(r=>r.json()));
      const results = await Promise.all(promises);
      trendingGrid.innerHTML = '';
      results.forEach(r => {
        const meal = r.meals[0];
        trendingGrid.appendChild(cardForMeal(meal));
      });
    } catch (e){
      trendingGrid.innerHTML = '<p class="muted">Unable to load trending.</p>';
    }
  })();

  // featured: search some popular names (fallback)
  (async function loadFeatured(){
    const picks = ['Chicken','Beef','Prawn','Arrabiata','Curry'];
    featuredGrid.innerHTML = 'Loading...';
    try {
      const rows = [];
      for (const p of picks){
        const res = await fetch(`${API_BASE}/search.php?s=${encodeURIComponent(p)}`).then(r=>r.json());
        if (res.meals) rows.push(...res.meals.slice(0,2));
      }
      featuredGrid.innerHTML = '';
      rows.forEach(meal => featuredGrid.appendChild(cardForMeal(meal)));
    } catch(e){
      featuredGrid.innerHTML = '<p class="muted">Unable to load featured.</p>';
    }
  })();

  // search form: redirect to search page with query param
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const q = (searchInput.value || '').trim();
    if (!q) return;
    location.href = `search.html?q=${encodeURIComponent(q)}`;
  });
}

/* ---------------- SEARCH ---------------- */
function initSearch(){
  const form = $('#searchFormPage');
  const input = $('#searchInputPage');
  const resultsGrid = $('#resultsGrid');
  const meta = $('#searchMeta');
  const noResults = $('#noResults');

  // read q from URL
  const urlParams = new URLSearchParams(location.search);
  const q0 = urlParams.get('q') || '';
  input.value = q0;

  async function doSearch(q){
    resultsGrid.innerHTML = 'Searching...';
    meta.textContent = '';
    noResults.style.display = 'none';
    if (!q) { resultsGrid.innerHTML = '<p class="muted">Type ingredient or recipe name above to search.</p>'; return; }

    try {
      // first try search by name
      const byName = await fetch(`${API_BASE}/search.php?s=${encodeURIComponent(q)}`).then(r=>r.json());
      // second: search by ingredient (filter)
      const byIng = await fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(q)}`).then(r=>r.json());

      const results = [];
      if (byName && byName.meals) results.push(...byName.meals);
      if (byIng && byIng.meals) {
        // filter.php returns only idMeal, strMeal, strMealThumb
        byIng.meals.forEach(m => {
          // avoid duplicates
          if (!results.find(x=>x.idMeal===m.idMeal)) results.push(m);
        });
      }

      if (results.length === 0) {
        resultsGrid.innerHTML = '';
        noResults.style.display = '';
        meta.textContent = `No results for "${q}"`;
        return;
      }

      meta.textContent = `${results.length} result(s) for "${q}"`;
      resultsGrid.innerHTML = '';
      results.forEach(meal => resultsGrid.appendChild(cardForMeal(meal)));
    } catch (e){
      console.error(e);
      resultsGrid.innerHTML = '<p class="muted">Failed to load results.</p>';
    }
  }

  // initial search if q present
  if (input.value) doSearch(input.value);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    history.replaceState(null,'',`?q=${encodeURIComponent(q)}`);
    doSearch(q);
  });
}

/* ---------------- RECIPE ---------------- */
function initRecipe(){
  const wrap = $('#recipeWrap');
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');

  if (!id){
    wrap.innerHTML = `<div class="recipe-meta"><p class="muted">No recipe selected. Try searching or click a recipe card.</p></div>`;
    return;
  }

  (async function load(){
    wrap.innerHTML = 'Loading...';
    try {
      const res = await fetch(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`).then(r=>r.json());
      const meal = res.meals && res.meals[0];
      if (!meal) { wrap.innerHTML = '<p class="muted">Recipe not found.</p>'; return; }

      const ingredients = [];
      for (let i=1;i<=20;i++){
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) ingredients.push(`${measure ? measure.trim() : ''} ${ing.trim()}`.trim());
      }

      // build markup
      wrap.innerHTML = `
        <div class="recipe-meta">
          <img src="${esc(meal.strMealThumb)}" alt="${esc(meal.strMeal)}" class="hero-img" />
          <h2>${esc(meal.strMeal)}</h2>
          <p class="muted"><strong>Category:</strong> ${esc(meal.strCategory || '—')} &nbsp; <strong>Area:</strong> ${esc(meal.strArea || '—')}</p>
          <p style="margin-top:8px">${meal.strTags ? `<strong>Tags:</strong> ${esc(meal.strTags)}` : ''}</p>
          <p style="margin-top:12px"><a class="btn primary" href="${meal.strYoutube || '#'}" target="_blank" ${meal.strYoutube ? '' : 'aria-disabled="true"'}>Watch video</a></p>
        </div>

        <div>
          <div class="card ingredients">
            <h3>Ingredients</h3>
            <ul>${ingredients.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
          </div>

          <div class="card instructions" style="margin-top:12px">
            <h3>Instructions</h3>
            <p>${esc(meal.strInstructions)}</p>
          </div>

          ${meal.strSource ? `<p class="muted" style="margin-top:12px">Source: <a href="${esc(meal.strSource)}" target="_blank">${esc(meal.strSource)}</a></p>` : ''}
        </div>
      `;

    } catch(e){
      console.error(e);
      wrap.innerHTML = '<p class="muted">Failed to load recipe.</p>';
    }
  })();
}

/* ---------------- UTIL: card for meal ---------------- */
function cardForMeal(meal){
  const div = document.createElement('div');
  div.className = 'card';
  const id = meal.idMeal;
  const title = meal.strMeal || meal.title || '';
  const img = meal.strMealThumb || meal.image || '';
  const category = (meal.strCategory) ? `<p class="muted">${esc(meal.strCategory)}</p>` : '';
  div.innerHTML = `
    <img src="${esc(img)}" alt="${esc(title)}" loading="lazy">
    <div class="card-body">
      <h3>${esc(title)}</h3>
      ${category}
      <div class="card-actions">
        <a class="btn primary" href="recipe.html?id=${encodeURIComponent(id)}">View</a>
        <button class="btn" data-id="${id}" aria-label="save">Save</button>
      </div>
    </div>
  `;
  // save button (simple favorites to localStorage)
  const saveBtn = div.querySelector('button[data-id]');
  saveBtn.addEventListener('click', () => {
    try {
      const favs = JSON.parse(localStorage.getItem('nc_favs')||'[]');
      if (!favs.find(x=>x.id===id)) {
        favs.push({id,title,img});
        localStorage.setItem('nc_favs', JSON.stringify(favs));
        saveBtn.textContent = 'Saved';
      } else {
        saveBtn.textContent = 'Already';
      }
    } catch(e){ console.error(e) }
  });

  return div;
}
/* ---------------- small utilities ---------------- */
function capitalize(s){ return (s||'').toString().replace(/^\w/, c => c.toUpperCase()) }
