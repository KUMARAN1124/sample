document.addEventListener('DOMContentLoaded', function() {
    init();
    attachEventListeners();
});

function init() {
    console.log("Initializing the application...");
    resetDashboardStats(); // Initialize dashboard stats to zero
    if (!localStorage.getItem('inventory')) {
        localStorage.setItem('inventory', JSON.stringify([])); // Initialize inventory if not present
    }
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', JSON.stringify([]));
    }
    updateInventoryTable();
    updateTransactionsTable();  // Make sure this is called here to load existing transactions
    updateDashboard();
    updateTodayTransactions();
    console.log("Initialization complete.");
}

function attachEventListeners() {
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleItemSubmission);
    }
    const categoryFilter = document.getElementById('category-filter');
    //if (categoryFilter) {
      //  categoryFilter.addEventListener('change', filterInventoryByCategory);
    //}
    // document.getElementById('search-inventory').addEventListener('keyup', searchInventory);
    const exportInventoryBtn = document.getElementById('export-inventory-btn');
    if (exportInventoryBtn) {
        exportInventoryBtn.addEventListener('click', function(event) {
            exportToCSV(); // Ensure this targets the correct function
        });
    }
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent form submission default behavior
            generateReport(); // Call generateReport function
        });
    }

    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(sectionId);
        });
    });
}

function resetDashboardStats() {
    console.log("Resetting dashboard stats to zero...");
    document.querySelector('.stat-value[data-stat="totalItems"]').textContent = '0';
    document.querySelector('.stat-value[data-stat="lowStockItems"]').textContent = '0';
    document.querySelector('.stat-value[data-stat="totalValue"]').textContent = '$0';
    document.querySelector('.stat-value[data-stat="transactions"]').textContent = '0';
    console.log("Dashboard stats reset to zero.");
}

function handleItemSubmission(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const price = parseFloat(formData.get('price'));

    console.log(price); // Add this to log and check if the price is correctly parsed

    const item = {
        productName: formData.get('productName'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        price: price,
        stockLevel: parseInt(formData.get('stockLevel')),
        supplier: formData.get('supplier'),
        threshold: parseInt(formData.get('threshold')),
        dateAdded: new Date().toISOString()
    };

    addNewItem(item);
    event.target.reset();
}


function addNewItem(item) {
    const inventory = JSON.parse(localStorage.getItem('inventory'));
    inventory.push(item);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    logTransaction(item, 'Added');
    updateInventoryTable();
    updateDashboard();
    updateTodayTransactions();
    showNotification('Item added successfully!', 'success');
}

function updateInventoryTable() {
    const inventory = JSON.parse(localStorage.getItem('inventory'));
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = inventory.map(item => `
        <tr>
            <td>${item.productName}</td>
            <td>${item.sku}</td>
            <td>${item.category}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.stockLevel}</td>
            <td><button onclick="removeItem('${item.sku}')" class="btn-remove">Remove</button></td>
        </tr>
    `).join('');
}


function updateDashboard() {
    const inventory = JSON.parse(localStorage.getItem('inventory'));
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.stockLevel < 10).length;

    // Calculate the total value by summing the product of price and stockLevel for each item
    let totalValue = 0;
    inventory.forEach(item => {
        totalValue += item.price * item.stockLevel;
    });

    // Format the total value to always show two decimal places
    const formattedTotalValue = totalValue.toFixed(2);

    // Update the dashboard statistics
    document.querySelector('.stat-value[data-stat="totalItems"]').textContent = totalItems;
    document.querySelector('.stat-value[data-stat="lowStockItems"]').textContent = lowStockItems;
    document.querySelector('.stat-value[data-stat="totalValue"]').textContent = `$${formattedTotalValue}`;
    document.querySelector('.stat-value[data-stat="transactions"]').textContent = totalItems; // Assuming you update this dynamically
}




function searchInventory(event) {
    const searchQuery = event.target.value.toLowerCase();
    const inventory = JSON.parse(localStorage.getItem('inventory'));
    const filteredInventory = inventory.filter(item => item.productName.toLowerCase().includes(searchQuery));
    displayInventory(filteredInventory);
}

function displayInventory(inventory) {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = inventory.length > 0 ? inventory.map(item => `
        <tr>
            <td>${item.productName}</td>
            <td>${item.sku}</td>
            <td>${item.category}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.stockLevel}</td>
            <td><button onclick="removeItem('${item.sku}')">Remove</button></td>
        </tr>
    `).join('') : '<tr><td colspan="6">Not Found</td></tr>';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    section.style.display = 'block';
    section.classList.add('fade-in');

    // Manage Recent Transactions visibility
    const recentTransactions = document.querySelector('.table-card');
    if (sectionId === 'dashboard') {
        recentTransactions.style.display = 'block'; // Show only on Dashboard
    } else {
        recentTransactions.style.display = 'none'; // Hide on other sections
    }
}

function exportToCSV() {
    const categoryFilter = document.getElementById('category-filter').value;
    const inventory = JSON.parse(localStorage.getItem('inventory'));
    
    // Determine which items to export based on the category filter
    let filteredInventory = inventory;
    if (categoryFilter !== "all" && categoryFilter) {
        filteredInventory = inventory.filter(item => item.category === categoryFilter);
    }

    // Map data for CSV export
    const data = filteredInventory.map(item => {
        return {
            'Product Name': item.productName,
            'SKU': item.sku,
            'Category': item.category,
            'Price': `$${item.price.toFixed(2)}`,
            'Stock Level': item.stockLevel
        };
    });

    if (data.length === 0) {
        alert('No items to export in the selected category.');
        return;
    }

    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = Object.keys(data[0]).join(',');
    csvContent += headers + '\n' + data.map(row => {
        return Object.values(row).join(',');
    }).join('\n');

    // Generate a filename based on the category or a default name for 'all'
    const filename = `${categoryFilter !== "all" && categoryFilter ? categoryFilter : 'full_inventory'}_inventory.csv`;

    // Encode CSV content and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}




function showNotification(message, type = 'success') {
    const notificationContainer = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;

    switch (reportType) {
        case 'inventory':
            exportInventoryReport();  // Export all inventory items
            break;
        case 'transactions':
            exportTransactionsReport();  // Export all transactions
            break;
        case 'lowstock':
            exportLowStockReport();  // Export low stock items
            break;
        default:
            exportInventoryReport();
            break;
    }
}






function removeItem(sku) {
    let inventory = JSON.parse(localStorage.getItem('inventory'));
    const itemIndex = inventory.findIndex(item => item.sku === sku);

    if (itemIndex > -1) {
        const item = inventory[itemIndex]; // Capture the item details before removing it
        inventory.splice(itemIndex, 1); // Remove the item from the inventory
        localStorage.setItem('inventory', JSON.stringify(inventory));

        logTransaction(item, 'Removed'); // Log the transaction after capturing the item details
        updateInventoryTable(); // Update the table display
        updateDashboard(); // Update dashboard stats if necessary
        updateTodayTransactions();
        showNotification('Item removed successfully!', 'success'); // Show success message
    } else {
        showNotification('Item not found!', 'error'); // Show error if item is not found
    }
}


function logTransaction(item, type) {
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    transactions.push({
        date: new Date().toISOString().slice(0, 10),
        item: item.productName,
        type: type,
        quantity: item.stockLevel,
        status: 'Completed'
    });

    // Keep only the last 10 transactions for display
    //transactions = transactions.slice(-10);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateTransactionsTable();
    updateTodayTransactions();
}

function updateTransactionsTable() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = ''; // Clear previous entries

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.item}</td>
            <td>${transaction.type}</td>
            <td>${transaction.quantity}</td>
            <td>${transaction.status}</td>
        `;
        tbody.appendChild(row);
    });
}


function updateTodayTransactions() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const today = new Date().toISOString().slice(0, 10);
    const todayTransactionsCount = transactions.filter(transaction => transaction.date === today).length;

    document.querySelector('.stat-value[data-stat="transactions"]').textContent = todayTransactionsCount;
}

function exportInventoryReport() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const data = inventory.map(item => {
        return {
            'Product Name': item.productName,
            'SKU': item.sku,
            'Category': item.category,
            'Price': item.price.toFixed(2),
            'Stock Level': item.stockLevel,
            'Supplier': item.supplier,
            'Date Added': item.dateAdded
        };
    });
    console.log("Exporting inventory report data:", data); // Debug log
    exportToCSV2(data, 'inventory_report.csv');
}


function exportLowStockReport() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    
    // Debugging: Check stockLevel types
    inventory.forEach(item => {
        console.log(`Item: ${item.productName}, stockLevel: ${item.stockLevel}, type: ${typeof item.stockLevel}`);
    });
    
    const lowStockItems = inventory.filter(item => Number(item.stockLevel) < 10);
    
    const data = lowStockItems.map(item => {
        return {
            'Product Name': item.productName,
            'SKU': item.sku,
            'Category': item.category,
            'Price': item.price.toFixed(2),
            'Stock Level': item.stockLevel,
            'Supplier': item.supplier,
            'Date Added': item.dateAdded
        };
    });
    console.log("Exporting low stock report data:", data); // Debug log
    exportToCSV2(data, 'low_stock_report.csv');
}



function exportTransactionsReport() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    console.log("Exporting transactions report data:", transactions); // Debug log
    exportToCSV2(transactions, 'transactions_report.csv');
}

function exportTransactionsReport() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const data = transactions.map(transaction => {
        return {
            'Date': transaction.date,
            'Item': transaction.item,
            'Type': transaction.type,
            'Quantity': transaction.quantity,
            'Status': transaction.status
        };
    });
    console.log("Exporting transactions report data:", data); // Debug log
    exportToCSV2(data, 'transactions_report.csv');
}



function exportToCSV2(data, filename) {
    if (data.length === 0) {
        alert("No data available to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');  

    // Create a Blob object representing the data as a CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });   

    // Create a link and trigger a download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link); // Required for Firefox

    link.click(); // This will download the data file named 'filename'
    document.body.removeChild(link);
}


