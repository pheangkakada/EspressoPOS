function updateDateTime() {
    const now = new Date();
    
    // Format date: "Mon, 12.02.2026"
    const dateOptions = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }).replace(/,/g, '');
    
    // Format time: "8:12 PM"
    const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    // Update all datetime elements on the page
    const datetimeElements = document.querySelectorAll('.datetime');
    datetimeElements.forEach(element => {
        element.innerHTML = `
            <span class="material-icons-round">today</span> ${formattedDate} - 
            <span class="material-icons-round">schedule</span> ${formattedTime}
        `;
    });
}

// Initialize and update datetime every second
function initializeDateTime() {
    // Update immediately
    updateDateTime();
    
    // Update every second
    setInterval(updateDateTime, 1000);
}