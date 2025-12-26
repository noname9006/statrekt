// dashboard.js - Client-side JavaScript for dashboard interactivity

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Format large numbers with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Format date to readable string
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(err => {
    showToast('Failed to copy', 'error');
  });
}

/**
 * Export table data to CSV
 */
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) {
    showToast('Table not found', 'error');
    return;
  }

  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    const row = [];
    const cols = rows[i].querySelectorAll('td, th');

    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
      data = data.replace(/"/g, '""');
      row.push('"' + data + '"');
    }

    csv.push(row.join(','));
  }

  const csvString = csv.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('Exported to ' + filename, 'success');
}

/**
 * Refresh data without page reload
 */
async function refreshData(metric, timeframe = 'week') {
  try {
    const response = await fetch(`/api/analytics/${metric}?timeframe=${timeframe}`);
    const data = await response.json();

    if (data.success) {
      showToast('Data refreshed', 'success');
      return data.data;
    } else {
      showToast('Failed to refresh data', 'error');
      return null;
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
    return null;
  }
}

/**
 * Toggle dark/light theme (future feature)
 */
function toggleTheme() {
  // Future implementation for theme toggle
  showToast('Theme toggle coming soon!', 'warning');
}

/**
 * Search/filter table rows
 */
function filterTable(inputId, tableId) {
  const input = document.getElementById(inputId);
  const filter = input.value.toUpperCase();
  const table = document.getElementById(tableId);
  const tr = table.getElementsByTagName('tr');

  for (let i = 1; i < tr.length; i++) {
    const td = tr[i].getElementsByTagName('td');
    let found = false;

    for (let j = 0; j < td.length; j++) {
      if (td[j]) {
        const txtValue = td[j].textContent || td[j].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          found = true;
          break;
        }
      }
    }

    tr[i].style.display = found ? '' : 'none';
  }
}

/**
 * Sort table by column
 */
function sortTable(tableId, columnIndex, isNumeric = false) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort((a, b) => {
    const aValue = a.querySelectorAll('td')[columnIndex].textContent.trim();
    const bValue = b.querySelectorAll('td')[columnIndex].textContent.trim();

    if (isNumeric) {
      return parseFloat(bValue.replace(/,/g, '')) - parseFloat(aValue.replace(/,/g, ''));
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  rows.forEach(row => tbody.appendChild(row));
}

// Initialize tooltips (if using a tooltip library)
document.addEventListener('DOMContentLoaded', function() {
  // Add any initialization code here
  console.log('StatRekt Dashboard loaded');
});
