document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if (email === 'user@gmail.com' && password === '12345') {
            window.location.href = 'index.html';
        } else {
            alert('Invalid credentials, please try again.');
        }
    });
});