function animateTitle() {
    const title = document.getElementById('sports-title');
    setInterval(() => {
        title.style.transform = 'scale(1.2)';
        title.style.color = '#007bff';
        setTimeout(() => {
            title.style.transform = 'scale(1)';
            title.style.color = '#333';
        }, 300);
    }, 5000);
} 

animateTitle();