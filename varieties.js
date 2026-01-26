// Search and filter state
let searchName = '';
let searchOrigin = '';

// Populate varieties grid
function populateVarietiesGrid() {
    const grid = document.getElementById('varieties-grid');

    if (!grid) return;

    // Filter varieties based on search criteria
    const filteredVarieties = Object.keys(varietiesData).filter(key => {
        const variety = varietiesData[key];

        // Name search (matches name, nameOriginal, or tagline)
        const matchesName = !searchName ||
            variety.name.toLowerCase().includes(searchName.toLowerCase()) ||
            variety.nameOriginal.toLowerCase().includes(searchName.toLowerCase()) ||
            variety.tagline.toLowerCase().includes(searchName.toLowerCase());

        // Origin filter
        const matchesOrigin = !searchOrigin ||
            variety.origin.includes(searchOrigin);

        return matchesName && matchesOrigin;
    });

    // Clear grid
    grid.innerHTML = '';

    // Show results or no results message
    if (filteredVarieties.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <p class="no-results-text">該当する品種が見つかりませんでした</p>
            <button class="clear-search-btn" onclick="clearSearch()">検索をクリア</button>
        `;
        grid.appendChild(noResults);
        return;
    }

    // Sort varieties alphabetically by Japanese name
    const sortedVarieties = filteredVarieties.sort((a, b) => {
        return varietiesData[a].name.localeCompare(varietiesData[b].name, 'ja');
    });

    sortedVarieties.forEach(key => {
        const variety = varietiesData[key];
        const card = createVarietyGridCard(variety, key);
        grid.appendChild(card);
    });
}

// Create variety card for grid
function createVarietyGridCard(variety, varietyId) {
    const card = document.createElement('a');
    card.href = `variety.html?id=${varietyId}`;
    card.className = 'variety-grid-card';

    // Header
    const header = document.createElement('div');
    header.className = 'variety-card-header';

    const name = document.createElement('h2');
    name.className = 'variety-card-name';
    name.textContent = variety.name;

    const nameOriginal = document.createElement('p');
    nameOriginal.className = 'variety-card-name-original';
    nameOriginal.textContent = variety.nameOriginal;

    const origin = document.createElement('p');
    origin.className = 'variety-card-origin';
    origin.textContent = variety.origin;

    header.appendChild(name);
    header.appendChild(nameOriginal);
    header.appendChild(origin);

    // Tagline
    const tagline = document.createElement('p');
    tagline.className = 'variety-card-tagline';
    tagline.textContent = variety.tagline;

    // Profile summary
    const profileSummary = document.createElement('div');
    profileSummary.className = 'variety-card-profile';

    const profileItems = [
        { label: '苦味', value: variety.profile.bitterness },
        { label: '辛味', value: variety.profile.pungency },
        { label: 'フルーティ', value: variety.profile.fruitiness }
    ];

    profileItems.forEach(item => {
        const profileItem = document.createElement('div');
        profileItem.className = 'profile-summary-item';

        const label = document.createElement('span');
        label.className = 'profile-summary-label';
        label.textContent = item.label;

        const dots = document.createElement('span');
        dots.className = 'profile-summary-dots';

        // Create 5 dots, fill based on value
        for (let i = 1; i <= 5; i++) {
            const dot = document.createElement('span');
            dot.className = i <= item.value ? 'dot filled' : 'dot';
            dots.appendChild(dot);
        }

        profileItem.appendChild(label);
        profileItem.appendChild(dots);
        profileSummary.appendChild(profileItem);
    });

    card.appendChild(header);
    card.appendChild(tagline);
    card.appendChild(profileSummary);

    return card;
}

// Clear search filters
function clearSearch() {
    searchName = '';
    searchOrigin = '';
    document.getElementById('search-name').value = '';
    document.getElementById('search-origin').value = '';
    populateVarietiesGrid();
}

// Setup search event listeners
function setupSearch() {
    const nameInput = document.getElementById('search-name');
    const originSelect = document.getElementById('search-origin');

    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            searchName = e.target.value;
            populateVarietiesGrid();
        });
    }

    if (originSelect) {
        originSelect.addEventListener('change', (e) => {
            searchOrigin = e.target.value;
            populateVarietiesGrid();
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    populateVarietiesGrid();
    setupSearch();
});
