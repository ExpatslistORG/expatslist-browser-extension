// Firefox exposes the promise-based API as `browser`; Chrome as `chrome`.
const ext = globalThis.browser ?? globalThis.chrome;

const SITE_URL = 'https://expatslist.org';
const CITY_LIST_TTL_MS = 24 * 60 * 60 * 1000; // cities barely change; refetch once a day

// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------
const tabButtons = document.querySelectorAll('.tab');
const feedView = document.getElementById('feed-view');
const messagesView = document.getElementById('messages-view');

function switchTab(tab) {
  tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  feedView.hidden = tab !== 'feed';
  messagesView.hidden = tab !== 'messages';
}

tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

// ---------------------------------------------------------------------
// City feed — public, no sign-in required
// ---------------------------------------------------------------------
const cityInput = document.getElementById('city-input');
const cityDropdown = document.getElementById('city-dropdown');
const nearYouTag = document.getElementById('near-you');
const feedList = document.getElementById('feed-list');

let allCities = [];
let currentCity = null; // { slug, name, country }
let dropdownMatches = [];
let activeIndex = -1;

function cityLabel(city) {
  return city.country ? `${city.name}, ${city.country}` : city.name;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- feed rendering ----
function renderFeedItems(items, city) {
  feedList.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'feed-empty';
    empty.textContent = `Nothing new in ${city.name} yet.`;
    feedList.appendChild(empty);
  }

  for (const item of items) {
    const a = document.createElement('a');
    a.className = 'feed-item';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener';

    const top = document.createElement('div');
    top.className = 'feed-item-top';
    const badge = document.createElement('span');
    badge.className = 'feed-type';
    badge.textContent = item.typeLabel;
    const time = document.createElement('span');
    time.className = 'feed-time';
    time.textContent = timeAgo(item.createdAt);
    top.append(badge, time);

    const title = document.createElement('div');
    title.className = 'feed-title';
    title.textContent = item.title;

    a.appendChild(top);
    a.appendChild(title);

    if (item.preview) {
      const preview = document.createElement('div');
      preview.className = 'feed-preview';
      preview.textContent = item.preview;
      a.appendChild(preview);
    }

    feedList.appendChild(a);
  }

  // The list's own last stop: reached by scrolling to the end, same as any
  // other item, but a plain link under a rule rather than another card.
  const more = document.createElement('div');
  more.className = 'feed-more';
  const moreLink = document.createElement('a');
  moreLink.href = `${SITE_URL}/${encodeURIComponent(city.slug)}/activity`;
  moreLink.target = '_blank';
  moreLink.rel = 'noopener';
  moreLink.textContent = `Read more of ${city.name}`;
  more.appendChild(moreLink);
  feedList.appendChild(more);
}

async function loadFeed(city) {
  feedList.innerHTML = '<div class="feed-loading">Loading…</div>';
  try {
    const resp = await fetch(`${SITE_URL}/api/cities/${encodeURIComponent(city.slug)}/feed?limit=12`);
    if (!resp.ok) throw new Error('bad response');
    const data = await resp.json();
    renderFeedItems(data.items || [], city);
  } catch {
    feedList.innerHTML = '<div class="feed-empty">Couldn’t load the feed. Try again later.</div>';
  }
}

// ---- city selection ----
async function selectCity(city, source) {
  currentCity = city;
  cityInput.value = cityLabel(city);
  nearYouTag.classList.toggle('visible', source === 'auto');
  closeDropdown();
  await ext.storage.local.set({ selectedCity: city.slug, citySource: source });
  loadFeed(city);
}

async function detectNearestCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const resp = await fetch(`${SITE_URL}/api/geo/nearest-city?tz=${encodeURIComponent(tz)}`);
    if (!resp.ok) throw new Error('bad response');
    const nearest = await resp.json();
    const match = allCities.find((c) => c.slug === nearest.slug);
    return match || allCities[0];
  } catch {
    return allCities[0];
  }
}

async function loadCities() {
  const { cityList, cityListCachedAt, selectedCity, citySource } = await ext.storage.local.get([
    'cityList',
    'cityListCachedAt',
    'selectedCity',
    'citySource',
  ]);

  let cities = cityList;
  const isFresh = cityListCachedAt && Date.now() - cityListCachedAt < CITY_LIST_TTL_MS;

  if (!cities || !isFresh) {
    try {
      const resp = await fetch(`${SITE_URL}/api/cities/list`);
      if (!resp.ok) throw new Error('bad response');
      cities = await resp.json();
      await ext.storage.local.set({ cityList: cities, cityListCachedAt: Date.now() });
    } catch {
      if (!cities) {
        feedList.innerHTML = '<div class="feed-empty">Couldn’t load cities. Try again later.</div>';
        return;
      }
      // Fall back to whatever was cached, even if stale.
    }
  }

  allCities = cities;

  const stored = selectedCity ? allCities.find((c) => c.slug === selectedCity) : null;
  if (stored) {
    selectCity(stored, citySource || 'manual');
    return;
  }

  const nearest = await detectNearestCity();
  if (nearest) selectCity(nearest, 'auto');
}

// ---- searchable dropdown ----
function closeDropdown() {
  cityDropdown.hidden = true;
  activeIndex = -1;
}

function renderDropdown(query) {
  const q = query.trim().toLowerCase();
  dropdownMatches = !q
    ? allCities
    : allCities.filter((c) => c.name.toLowerCase().includes(q) || (c.country || '').toLowerCase().includes(q));
  dropdownMatches = dropdownMatches.slice(0, 8);

  cityDropdown.innerHTML = '';
  if (!dropdownMatches.length) {
    const empty = document.createElement('div');
    empty.className = 'city-empty';
    empty.textContent = 'No city matches your search.';
    cityDropdown.appendChild(empty);
    cityDropdown.hidden = false;
    activeIndex = -1;
    return;
  }

  dropdownMatches.forEach((city, i) => {
    const row = document.createElement('div');
    row.className = 'city-option';
    row.dataset.index = String(i);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = city.name;
    row.appendChild(name);
    if (city.country) {
      const country = document.createElement('span');
      country.className = 'country';
      country.textContent = city.country;
      row.appendChild(country);
    }
    row.addEventListener('mousedown', (e) => {
      // mousedown, not click: fires before the input's blur closes the dropdown.
      e.preventDefault();
      selectCity(city, 'manual');
    });
    cityDropdown.appendChild(row);
  });
  cityDropdown.hidden = false;
  activeIndex = -1;
}

function setActive(index) {
  const rows = cityDropdown.querySelectorAll('.city-option');
  rows.forEach((r) => r.classList.remove('is-active'));
  if (index >= 0 && index < rows.length) {
    rows[index].classList.add('is-active');
    rows[index].scrollIntoView({ block: 'nearest' });
  }
  activeIndex = index;
}

cityInput.addEventListener('focus', () => {
  cityInput.select();
  renderDropdown(cityInput.value === (currentCity ? cityLabel(currentCity) : '') ? '' : cityInput.value);
});

cityInput.addEventListener('input', () => renderDropdown(cityInput.value));

cityInput.addEventListener('keydown', (e) => {
  if (cityDropdown.hidden) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(Math.min(activeIndex + 1, dropdownMatches.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(Math.max(activeIndex - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const pick = dropdownMatches[activeIndex] ?? dropdownMatches[0];
    if (pick) selectCity(pick, 'manual');
  } else if (e.key === 'Escape') {
    closeDropdown();
    cityInput.value = currentCity ? cityLabel(currentCity) : '';
    cityInput.blur();
  }
});

cityInput.addEventListener('blur', () => {
  // A little delay so a mousedown on a row (handled above) still lands first.
  setTimeout(() => {
    closeDropdown();
    cityInput.value = currentCity ? cityLabel(currentCity) : '';
  }, 100);
});

loadCities();
