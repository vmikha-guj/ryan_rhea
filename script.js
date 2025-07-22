const tablePositions = fetch('table_positions.json').then(res => res.json());
const layout = document.getElementById('layout');
const highlight = document.getElementById('highlight');

async function findTable() {
  const name = document.getElementById('guestName').value.trim().toLowerCase();
  const resultDiv = document.getElementById('result');

  if (!name) {
    resultDiv.innerText = "Please enter your name.";
    resultDiv.style.color = "red";
    highlight.style.display = "none";
    return;
  }

  resultDiv.innerText = "Searching...";
  resultDiv.style.color = "#333";

  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbydqHDgOoL2iPHu0sbEBeR7gdK_bq9pAuWWQbRSGx4s1kfEtZ-CbJX68-lAU7usHLon/exec' + encodeURIComponent(name));
    const text = await response.text();
    resultDiv.innerText = text;

    const match = text.match(/(\d+)/);
    if (match) {
      const tableNum = parseInt(match[1]);
      const positions = await tablePositions;
      const table = positions.find(t => t.table === tableNum);

      if (table) {
        const rect = layout.getBoundingClientRect();
        const x = (table.x / 100) * rect.width;
        const y = (table.y / 100) * rect.height;
        highlight.style.left = x + 'px';
        highlight.style.top = y + 'px';
        highlight.style.display = "block";
      }
    } else {
      highlight.style.display = "none";
      resultDiv.style.color = "red";
    }
  } catch (error) {
    resultDiv.innerText = "Error occurred.";
    resultDiv.style.color = "red";
    highlight.style.display = "none";
  }
}
