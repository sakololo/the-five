// Get variety ID from URL parameter
function getVarietyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'taggiasca';
}

// Populate variety detail page
function populateVarietyPage() {
    const varietyId = getVarietyIdFromUrl();
    const variety = varietiesData[varietyId];

    if (!variety) {
        window.location.href = 'index.html';
        return;
    }

    // Update page title
    document.title = `${variety.name} | オリーブオイル品種ガイド`;

    // Hero section
    document.getElementById('variety-name').textContent = variety.name;
    document.getElementById('variety-name-original').textContent = variety.nameOriginal;
    document.getElementById('variety-origin').textContent = variety.origin;
    document.getElementById('variety-tagline').textContent = variety.tagline;

    // Set hero background image
    const heroImage = document.getElementById('variety-hero-image');
    if (variety.images && variety.images.landscape) {
        heroImage.style.backgroundImage = `url('${variety.images.landscape}')`;
    }

    // Quick profile - set scale fills
    const bitternessPercent = (variety.profile.bitterness / 5) * 100;
    const pungencyPercent = (variety.profile.pungency / 5) * 100;
    const fruitinessPercent = (variety.profile.fruitiness / 5) * 100;

    document.getElementById('bitterness-fill').style.width = `${bitternessPercent}%`;
    document.getElementById('pungency-fill').style.width = `${pungencyPercent}%`;
    document.getElementById('fruitiness-fill').style.width = `${fruitinessPercent}%`;

    // About section
    document.getElementById('about-text').textContent = variety.about;

    // Characteristics list
    const characteristicsList = document.getElementById('characteristics-list');
    characteristicsList.innerHTML = '';
    variety.characteristics.forEach(char => {
        const li = document.createElement('li');
        li.textContent = char;
        characteristicsList.appendChild(li);
    });

    // Usage guide
    const rawIcon = document.getElementById('raw-icon');
    const rawLabel = document.getElementById('raw-label');
    if (variety.usage.type === 'raw') {
        rawIcon.textContent = '🥗';
        rawLabel.textContent = '生食向き';
    } else if (variety.usage.type === 'cooked') {
        rawIcon.textContent = '🔥';
        rawLabel.textContent = '加熱向き';
    } else {
        rawIcon.textContent = '✨';
        rawLabel.textContent = '万能';
    }

    const usageDishes = document.getElementById('usage-dishes');
    usageDishes.innerHTML = '';
    variety.usage.dishes.forEach(dish => {
        const dishCard = document.createElement('div');
        dishCard.className = 'dish-card';
        dishCard.textContent = dish;
        usageDishes.appendChild(dishCard);
    });

    // Comparison scale - highlight current variety
    document.querySelectorAll('.scale-marker').forEach(marker => {
        if (marker.dataset.variety === varietyId) {
            marker.classList.add('current');
        }
    });

    // Position markers on scale
    positionScaleMarkers();

    // Other varieties cards
    const otherVarietiesContainer = document.getElementById('other-varieties');
    otherVarietiesContainer.innerHTML = '';

    Object.keys(varietiesData).forEach(key => {
        if (key !== varietyId) {
            const otherVariety = varietiesData[key];
            const card = createVarietyCard(otherVariety, key);
            otherVarietiesContainer.appendChild(card);
        }
    });
}

// Position scale markers based on intensity
function positionScaleMarkers() {
    const markers = {
        'taggiasca': document.getElementById('marker-1'),
        'leccino': document.getElementById('marker-2'),
        'tonda-iblea': document.getElementById('marker-3')
    };

    // Calculate intensity (average of bitterness and pungency)
    const intensities = {};
    Object.keys(varietiesData).forEach(key => {
        const variety = varietiesData[key];
        intensities[key] = (variety.profile.bitterness + variety.profile.pungency) / 2;
    });

    // Position markers (0-100%)
    Object.keys(markers).forEach(key => {
        const marker = markers[key];
        if (marker) {
            const intensity = intensities[key];
            const position = ((intensity - 1) / 4) * 100; // Scale 1-5 to 0-100%
            marker.style.left = `${position}%`;
        }
    });
}

// Create variety card for comparison section
function createVarietyCard(variety, varietyId) {
    const card = document.createElement('a');
    card.href = `variety.html?id=${varietyId}`;
    card.className = 'variety-link-card';

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = variety.name;

    const tagline = document.createElement('div');
    tagline.className = 'card-tagline';
    tagline.textContent = variety.tagline;

    card.appendChild(name);
    card.appendChild(tagline);

    return card;
}

// Smooth scroll to top on page load
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});

// Initialize page
document.addEventListener('DOMContentLoaded', populateVarietyPage);
