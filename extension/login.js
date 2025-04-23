document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const trackingBtn = document.getElementById('tracking-btn');
    const loginForm = document.querySelector('.login-form');
    const signupForm = document.querySelector('.signup-form');
    const trackingForm = document.querySelector('.tracking-form');
    const loginSubmitBtn = document.getElementById('login-submit');
    const loginUsernameInput = document.getElementById('login-username');
    const switcherButtons = document.querySelectorAll('.switcher-btn');

    // Función para mostrar un formulario y ocultar los demás
    const showForm = (formToShow, activeButton) => {
        loginForm.classList.remove('active');
        signupForm.classList.remove('active');
        trackingForm.classList.remove('active');
        switcherButtons.forEach(btn => btn.classList.remove('active'));

        formToShow.classList.add('active');
        activeButton.classList.add('active');
    };

    loginBtn.addEventListener('click', () => {
        showForm(loginForm, loginBtn);
    });

    signupBtn.addEventListener('click', () => {
        showForm(signupForm, signupBtn);
    });

    trackingBtn.addEventListener('click', () => {
        showForm(trackingForm, trackingBtn);
    });

    loginSubmitBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Evitar la recarga de la página al enviar el formulario
        const username = loginUsernameInput.value.trim().toUpperCase();

        if (username === 'ADMIN') {
            window.location.href = 'index.html';
        } //else if (username === 'USER') {
            //sessionStorage.setItem("nombreUsuario", document.getElementById("login-username").value);
            //window.location.href = 'tracking.html';// Redirige a la otra página
        //} 
        else {
            //alert('Usuario no reconocido.'); // Puedes personalizar este mensaje
            sessionStorage.setItem("nombreUsuario", document.getElementById("login-username").value);
            window.location.href = 'tracking.html';// Redirige a la otra página
        }
    });
});