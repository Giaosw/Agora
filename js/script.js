document.addEventListener('DOMContentLoaded', function () {
    // Botones para abrir los modales
    const registroModal = new bootstrap.Modal(document.getElementById('registroModal'));
    const ingresoModal = new bootstrap.Modal(document.getElementById('ingresoModal'));

    document.getElementById('btn-registrarse').onclick = () => registroModal.show();
    document.getElementById('btn-ingresar').onclick = () => ingresoModal.show();

    // Chatbot
    const chatbotIcon = document.getElementById('chatbot-icon');
    const chatbox = document.getElementById('chatbox');
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');

    chatbotIcon.addEventListener('click', () => {
        chatbox.style.display = chatbox.style.display === 'flex' ? 'none' : 'flex';
        chatMessages.innerHTML = '<p><strong>Chatbot:</strong> Hola ¿En qué te puedo ayudar?</p>';
    });

    sendButton.addEventListener('click', () => {
        if (userInput.value.trim() !== '') {
            chatMessages.innerHTML += `<p><strong>Tú:</strong> ${userInput.value}</p>`;
            userInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
});
