// REPLACE THIS WITH YOUR ACTUAL PUBLISHED CSV URL from Google Sheets
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScnPH8UkrCQhHc3YhtCQ_ZVyG9uDAvMlWb6zh-3uPf1IHhbcWn4q3RGqFrHPf-WILzOM-Nz87Odj8A/pub?gid=1446913663&single=true&output=csv'; 

// IMPORTANT: Define coordinates for your tables on the image.
// You'll need to get these manually (e.g., using an image editor to find pixel positions).
// x, y are top-left coordinates. width, height are dimensions of the table area.
const TABLE_COORDINATES = {
    '1': { x: 1262, y: 639, width: 1393, height: 765 }, // Example: Table 1 at (50,100) with 80x80 size
    '2': { x: 1649, y: 756, width: 1515, height: 637 },
    '3': { x: 1638, y: 914, width: 1766, height: 798 },
    '4': { x: 1521, y: 925, width: 1381, height: 799 },
    '5': { x: 1268, y: 909, width: 1137, height: 789 },
    // ... add all 33 of your tables here.
    // Use your image editing tool to get accurate x,y,width,height for each table on your actual map image.
    // For circular tables, use (x,y) as center and width/height as diameter for a rough square overlay.
};

let guestData = []; // To store parsed guest list data

const guestNameInput = document.getElementById('guestNameInput');
const searchButton = document.getElementById('searchButton');
const resultsBox = document.getElementById('resultsBox');
const layoutImage = document.getElementById('layoutImage');

// Function to fetch and parse CSV data
async function fetchGuestData() {
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const csvText = await response.text();
        guestData = parseCSV(csvText);
        console.log('Guest data loaded:', guestData);
    } catch (error) {
        console.error('Error fetching guest data:', error);
        resultsBox.innerHTML = '<span style="color: red;">Failed to load guest list. Please try again later.</span>';
    }
}

// Simple CSV Parser (assumes first row is header)
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim()); // Trim headers

    // Find column indices
    const firstNameCol = headers.indexOf('First Name');
    const lastNameCol = headers.indexOf('Last Name');
    const tableNumCol = headers.indexOf('Table#'); // Assuming 'Table#' as header for Column F

    if (firstNameCol === -1 || lastNameCol === -1 || tableNumCol === -1) {
        throw new Error('CSV headers not found: First Name, Last Name, or Table#');
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // Skip empty lines

        // A more robust split that handles commas within quotes
        const values = line.match(/(?:[^,"']+|"[^"]*")+/g).map(v => v.replace(/^"|"$/g, '').trim());

        data.push({
            firstName: values[firstNameCol] ? values[firstNameCol].toLowerCase() : '',
            lastName: values[lastNameCol] ? values[lastNameCol].toLowerCase() : '',
            originalFirstName: values[firstNameCol] || '', // Keep original for display
            originalLastName: values[lastNameCol] || '',
            tableNumber: values[tableNumCol] || ''
        });
    }
    return data;
}

// Function to search for guest
function searchGuest() {
    const inputName = guestNameInput.value.trim().toLowerCase();
    resultsBox.innerHTML = ''; // Clear previous results
    removeBlinkingOverlay(); // Clear any previous blinking

    if (inputName === '') {
        resultsBox.innerHTML = 'Please enter a name.';
        return;
    }

    const inputParts = inputName.split(' ').filter(part => part.length > 0);
    let foundGuests = [];

    // 1. Prioritize Exact Full Name Match
    if (inputParts.length >= 2) {
        const targetFirstName = inputParts[0];
        const targetLastName = inputParts.slice(1).join(' '); // Handles multi-word last names

        for (const guest of guestData) {
            if (guest.firstName === targetFirstName && guest.lastName === targetLastName) {
                foundGuests.push(guest);
                break; // Found exact match, no need to search further
            }
        }
    }

    // 2. If no exact full name match, or if input was a single word, proceed with broader partial match
    if (foundGuests.length === 0) {
        for (const guest of guestData) {
            const foundInFirst = inputParts.some(part => guest.firstName.includes(part));
            const foundInLast = inputParts.some(part => guest.lastName.includes(part));

            if (foundInFirst || foundInLast) {
                foundGuests.push(guest);
            }
        }
    }

    // Display results
    if (foundGuests.length === 1) {
        const guest = foundGuests[0];
        resultsBox.innerHTML = `Your Table Number: <br><strong>Table ${guest.tableNumber}</strong><br>(${guest.originalFirstName} ${guest.originalLastName})`;
        blinkTableOnMap(guest.tableNumber);
    } else if (foundGuests.length > 1) {
        let message = 'Multiple matches. Please find your name and table:\n\n';
        foundGuests.forEach(guest => {
            message += `${guest.originalFirstName} ${guest.originalLastName} - Table: ${guest.tableNumber}\n`;
        });
        resultsBox.innerHTML = message;
        // Do not blink for multiple results, as it's unclear which to highlight.
    } else {
        resultsBox.innerHTML = 'Guest Not Found. Please check spelling.';
    }
}

// Function to create and manage blinking overlay
let currentOverlay = null;
function blinkTableOnMap(tableNumber) {
    removeBlinkingOverlay(); // Remove any existing overlay

    const coords = TABLE_COORDINATES[tableNumber];
    if (!coords) {
        console.warn(`Coordinates for Table ${tableNumber} not found.`);
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'blinking-overlay';
    
    // Scale coordinates based on actual image size vs. coordinate source (if applicable)
    // For simplicity, assuming image is at its natural size or scaled by CSS `max-width: 100%`
    // If your image scales dramatically, you might need to calculate a ratio.
    const imgWidth = layoutImage.naturalWidth;
    const imgHeight = layoutImage.naturalHeight;
    const currentImgWidth = layoutImage.offsetWidth; // Rendered width
    const currentImgHeight = layoutImage.offsetHeight; // Rendered height

    // Calculate scaling factor if image is resized by CSS
    const scaleX = currentImgWidth / imgWidth;
    const scaleY = currentImgHeight / imgHeight;

    overlay.style.left = `${coords.x * scaleX}px`;
    overlay.style.top = `${coords.y * scaleY}px`;
    overlay.style.width = `${coords.width * scaleX}px`;
    overlay.style.height = `${coords.height * scaleY}px`;

    layoutImage.parentElement.appendChild(overlay);
    currentOverlay = overlay;
}

function removeBlinkingOverlay() {
    if (currentOverlay) {
        currentOverlay.remove();
        currentOverlay = null;
    }
}

// Event Listeners
searchButton.addEventListener('click', searchGuest);
guestNameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchGuest();
    }
});

// Initial data fetch when page loads
fetchGuestData();
