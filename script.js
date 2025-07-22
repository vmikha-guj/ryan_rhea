// Your PUBLISHED CSV URL from Google Sheets
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScnPH8UkrCQhHc3YhtCQ_ZVyG9uDAvMlWb6zh-3uPf1IHhbcWn4q3RGqFrHPf-WILzOM-Nz87Odj8A/pub?output=csv';

// IMPORTANT: Define coordinates for your tables on the image.
// x, y are top-left coordinates. width, height are dimensions of the table area.
const TABLE_COORDINATES = {
    '1': { x: 1048, y: 111, width: 134, height: 111 },
    '2': { x: 1305, y: 109, width: 126, height: 109 },
    '3': { x: 1421, y: 269, width: 132, height: 117 },
    '4': { x: 1175, y: 269, width: 125, height: 124 },
    '5': { x: 925, y: 261, width: 135, height: 121 },
    '6': { x: 839, y: 432, width: 128, height: 112 },
    '7': { x: 1066, y: 434, width: 133, height: 112 },
    '8': { x: 1304, y: 440, width: 131, height: 107 },
    '9': { x: 1528, y: 449, width: 125, height: 113 },
    // *** IMPORTANT: YOU MUST ADD THE REMAINING TABLES HERE (10 through 33) ***
    // If a table number is found but no coordinates are provided, the box will not appear.
    // Example for a hypothetical Table 10:
    // '10': { x: XXX, y: YYY, width: WWW, height: HHH },
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
        console.log('Guest data loaded successfully. Total guests:', guestData.length); // Debug log
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

    console.log('CSV Headers Found:', headers); // Debug log
    console.log(`Column Indices: First Name=${firstNameCol}, Last Name=${lastNameCol}, Table#=${tableNumCol}`); // Debug log

    if (firstNameCol === -1 || lastNameCol === -1 || tableNumCol === -1) {
        throw new Error('CSV headers not found: "First Name", "Last Name", or "Table#"');
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // Skip empty lines

        // A more robust split that handles commas within quotes
        const values = line.match(/(?:[^,"']+|"[^"]*")+/g).map(v => v.replace(/^"|"$/g, '').trim());

        const firstName = values[firstNameCol] ? values[firstNameCol].toLowerCase() : '';
        const lastName = values[lastNameCol] ? values[lastNameCol].toLowerCase() : '';
        const tableNumber = values[tableNumCol] || '';

        data.push({
            firstName: firstName,
            lastName: lastName,
            originalFirstName: values[firstNameCol] || '', // Keep original for display
            originalLastName: values[lastNameCol] || '',
            tableNumber: tableNumber
        });
        // Log what's being parsed for each entry (helpful for debugging specific names)
        // console.log(`Parsed row ${i}: First='${firstName}', Last='${lastName}', Table='${tableNumber}'`);
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

    console.log('--- New Search Initiated ---');
    console.log('User Input (trimmed, lowercase):', inputName);
    console.log('Input parts (separated by space):', inputParts);

    // Flexible Search Algorithm: Check if ALL input parts are present in the guest's combined name
    // This allows for flexible ordering (e.g., "Michael Koshy" finding "Koshy Michael")
    // and partial matches where all words in the input are found.
    for (const guest of guestData) {
        // Ensure guest.firstName and guest.lastName are treated as strings before combining
        const guestFirstNameStr = String(guest.firstName || '').trim().toLowerCase();
        const guestLastNameStr = String(guest.lastName || '').trim().toLowerCase();
        
        const guestFullNameInCSV = `${guestFirstNameStr} ${guestLastNameStr}`.trim();

        // Check if ALL terms from the user's input are present anywhere in the combined guest name from CSV
        const allInputPartsFound = inputParts.every(term => guestFullNameInCSV.includes(term));

        if (allInputPartsFound) {
            foundGuests.push(guest);
        }
    }

    if (foundGuests.length > 0) {
        console.log(`Flexible search found ${foundGuests.length} matches.`);
    } else {
        console.log('Flexible search found no matches.');
    }

    // Display results
    if (foundGuests.length === 1) {
        const guest = foundGuests[0];
        // Display only the table number for a single, unique match
        resultsBox.innerHTML = `Your Table Number: <br><strong>Table ${guest.tableNumber}</strong>`;
        console.log('Single unique match found. Blinking table:', guest.tableNumber);
        blinkTableOnMap(guest.tableNumber);
    } else if (foundGuests.length > 1) {
        let message = 'Multiple matches. Please find your name and table:\n\n';
        // Sort for consistent display order (e.g., alphabetically by full name)
        foundGuests.sort((a, b) => {
            const nameA = `${a.originalFirstName} ${a.originalLastName}`.toLowerCase();
            const nameB = `${b.originalFirstName} ${b.originalLastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        foundGuests.forEach(guest => {
            message += `${guest.originalFirstName} ${guest.originalLastName} - Table: ${guest.tableNumber}\n`;
        });
        resultsBox.innerHTML = message;
        console.log('Multiple matches found. Displaying all.');
    } else {
        resultsBox.innerHTML = 'Guest Not Found. Please check spelling.';
        console.log('No matches found for input:', inputName);
    }
}

// Function to create and manage blinking overlay
let currentOverlay = null;
function blinkTableOnMap(tableNumber) {
    removeBlinkingOverlay(); // Remove any existing overlay

    const coords = TABLE_COORDINATES[tableNumber];
    if (!coords) {
        console.warn(`Coordinates for Table ${tableNumber} not found in TABLE_COORDINATES. Cannot blink.`); // Debug log
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'blinking-overlay';
    
    // Scale coordinates based on actual image size vs. coordinate source (if applicable)
    // This uses the natural (original) dimensions of the image vs. its currently rendered dimensions.
    const imgWidth = layoutImage.naturalWidth;
    const imgHeight = layoutImage.naturalHeight;
    const currentImgWidth = layoutImage.offsetWidth; // Rendered width
    const currentImgHeight = layoutImage.offsetHeight; // Rendered height

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