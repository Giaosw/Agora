// Variables globales
let speechRecognition;
let speechSynthesis;
let isSpeaking = false;
const userName = sessionStorage.getItem("nombreUsuario");
let voicesLoaded = false;
let initialGreetingRead = false;
let startSpeechBtn;
let voiceOverlaySoundWaveDiv;
let voiceOverlayDiv;
const textInputTextarea = document.getElementById('text-input'); // Obtener referencia aquí
const conversationMessagesDiv = document.getElementById('conversation-messages'); // Obtener referencia aquí
let conversationContext = ""; // Variable para almacenar el contexto de la conversación

async function waitForVoices(maxAttempts = 3, delayMs = 3000) {
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        console.log(`Waiting for voices... (Attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        const currentVoices = speechSynthesis.getVoices();
        if (currentVoices.length > 0) {
            voicesLoaded = true;
            console.log("Voices loaded successfully after waiting.");
            return true;
        }
    }
    console.log("Max attempts reached, voices not loaded.");
    return false;
}

async function sendMessageToAPI(userMessage) {
    try {
        let messageToSend = userMessage;
        if (userMessage !== '101') {
            // Eliminar el marcador anterior si existe
            conversationContext = conversationContext.replace(" ||contexto arriba|| ", "");
            conversationContext += userMessage + " ||contexto arriba|| ";
            messageToSend = conversationContext;
        }

        const url = `https://hook.eu2.make.com/vujf8afckji54g8upjrhd3sabburx4tk?user=${encodeURIComponent(userName)}&message=${encodeURIComponent(messageToSend)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.text(); // Obtener la respuesta como texto plano
        console.log('Respuesta del servidor:', data);
        return data;
    } catch (error) {
        console.error('Error al enviar la petición:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    voiceOverlayDiv = document.getElementById('voice-overlay');
    voiceOverlaySoundWaveDiv = document.getElementById('voice-overlay-sound-wave');
    const closeVoiceOverlayBtn = document.getElementById('close-voice-overlay-btn');
    startSpeechBtn = document.getElementById('start-speech-btn'); // Obtener referencia al botón

    const pendingOrders = ['ABC123', 'DEF456'];

    // Inicialización de la Web Speech API
    if ('webkitSpeechRecognition' in window) {
        speechRecognition = new webkitSpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.lang = 'es-ES';

        speechRecognition.onstart = () => {
            console.log('Speech recognition started and listening...');
            voiceOverlaySoundWaveDiv.style.display = 'flex'; // Mostrar animación al escuchar
        };

        speechRecognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, true);
            const botResponse = await sendMessageToAPI(transcript);
            if (botResponse) {
                // Actualizar el contexto con la respuesta del bot
                conversationContext = conversationContext.replace(" ||contexto arriba|| ", "");
                conversationContext += botResponse + " ||contexto arriba|| ";
                addBotMessage(botResponse);
                simulateSpeech(botResponse, () => {
                    speakMessage(botResponse);
                });
            }
        };

        speechRecognition.onend = () => {
            console.log('Speech recognition ended.');
            voiceOverlaySoundWaveDiv.style.display = 'none'; // Ocultar animación al finalizar escucha
        };

        speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            voiceOverlaySoundWaveDiv.style.display = 'none'; // Ocultar animación en caso de error
        };
    } else {
        console.error('La API de reconocimiento de voz no es compatible con este navegador.');
    }

    // Inicialización de la Web Speech Synthesis API
    if ('speechSynthesis' in window) {
        speechSynthesis = window.speechSynthesis;

        speechSynthesis.onvoiceschanged = () => {
            const currentVoices = speechSynthesis.getVoices();
            if (currentVoices.length > 0) {
                voicesLoaded = true;
                console.log("Voices loaded via onvoiceschanged.");
            }
        };

        const initialVoices = speechSynthesis.getVoices();
        if (initialVoices.length > 0) {
            voicesLoaded = true;
            console.log("Voices loaded on initial check.");
        }
    } else {
        console.error('La API de síntesis de voz no es compatible con este navegador.');
        voicesLoaded = true; // Si no hay TTS, consideramos que "cargó" para el flujo.
    }

    // Esperar a que las voces se carguen con reintentos usando un bucle for
    await waitForVoices();

    // Event listener para el botón "Comienza a hablar con SOFIA"
    startSpeechBtn.addEventListener('click', async () => {
        if (voicesLoaded && !initialGreetingRead) {
            const initialBotResponse = await sendMessageToAPI('101');
            if (initialBotResponse) {
                initialGreeting = initialBotResponse;
                // Actualizar el contexto con el saludo inicial del bot
                conversationContext = initialGreeting + " ||contexto arriba|| ";
                simulateSpeech(initialGreeting, () => {
                    speakMessage(initialGreeting);
                });
                addBotMessage(initialGreeting);
                initialGreetingRead = true;
                startSpeechBtn.style.display = 'none'; // Ocultar el botón después de hacer clic
                voiceOverlaySoundWaveDiv.style.display = 'flex'; // Mostrar la animación de las barritas
                if (speechRecognition) {
                    speechRecognition.start();
                    console.log('Speech recognition started after initial greeting (on start button click).');
                }
            }
        }
    });

    // Event listener para el textarea (enviar con Enter)
    textInputTextarea.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Verificar si se presionó Enter y no Shift+Enter
            event.preventDefault(); // Evitar el salto de línea por defecto
            const message = textInputTextarea.value.trim();
            if (message) {
                addMessage(message, true);
                textInputTextarea.value = '';
                const botResponse = await sendMessageToAPI(message);
                if (botResponse) {
                    // Actualizar el contexto con la respuesta del bot
                    conversationContext = conversationContext.replace(" ||contexto arriba|| ", "");
                    conversationContext += botResponse + " ||contexto arriba|| ";
                    addBotMessage(botResponse);
                    simulateSpeech(botResponse, () => {
                        speakMessage(botResponse);
                    });
                }
                console.log('Mensaje enviado con Enter:', message);
            }
        }
    });

    // Botón para cerrar la superposición de voz
    closeVoiceOverlayBtn.addEventListener('click', () => {
        voiceOverlayDiv.classList.add('hidden');
        if (speechRecognition) {
            speechRecognition.stop();
            console.log('Speech recognition stopped by closing overlay.');
            voiceOverlaySoundWaveDiv.style.display = 'none'; // Asegurar que la animación se oculte
        }
    });

    // Botón para activar el micrófono (ahora solo para iniciar escucha posterior)
    micBtn.addEventListener('click', () => {
        voiceOverlayDiv.classList.remove('hidden');
        if (voicesLoaded && initialGreetingRead) { // Verificar si el saludo ya se leyó
            if (speechRecognition) {
                speechRecognition.start();
                console.log('Speech recognition started by microphone button.');
                voiceOverlaySoundWaveDiv.style.display = 'flex'; // Mostrar animación al escuchar
            }
            startSpeechBtn.style.display = 'none'; // Asegurar que el botón esté oculto
        } else if (voicesLoaded && !initialGreetingRead) {
            // Simular el clic en el botón de inicio para el flujo inicial
            startSpeechBtn.click();
        }
    });

    // Botón para enviar mensaje de texto
    sendBtn.addEventListener('click', async () => {
        const message = textInputTextarea.value.trim();
        if (message) {
            addMessage(message, true);
            textInputTextarea.value = '';
            const botResponse = await sendMessageToAPI(message);
            if (botResponse) {
                // Actualizar el contexto con la respuesta del bot
                conversationContext = conversationContext.replace(" ||contexto arriba|| ", "");
                conversationContext += botResponse + " ||contexto arriba|| ";
                addBotMessage(botResponse);
                simulateSpeech(botResponse, () => {
                    speakMessage(botResponse);
                });
            }
            console.log('Mensaje enviado con botón:', message);
        }
    });
});

// Función para añadir un mensaje al área de conversación
const addMessage = (text, isUser = false) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    messageDiv.textContent = text;
    conversationMessagesDiv.appendChild(messageDiv);
    conversationMessagesDiv.scrollTop = conversationMessagesDiv.scrollHeight;
};

// Función para añadir un mensaje del bot al área de conversación
const addBotMessage = (text) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('bot-message');
    messageDiv.textContent = text;
    conversationMessagesDiv.appendChild(messageDiv);
    conversationMessagesDiv.scrollTop = conversationMessagesDiv.scrollHeight;
};

// Función para simular la "habla" del bot con animación de ondas en la superposición
const simulateSpeech = (message, onEndCallback) => {
    isSpeaking = true;
    document.getElementById('voice-overlay-sound-wave').style.display = 'flex'; // Mostrar animación al hablar

    const speechDuration = message.split(' ').length * 300;
    setTimeout(() => {
        document.getElementById('voice-overlay-sound-wave').style.display = 'none'; // Ocultar animación al finalizar habla
        isSpeaking = false;
        if (onEndCallback) {
            onEndCallback();
        }
    }, speechDuration);
};

// Función para que el navegador lea un mensaje
const speakMessage = (message) => {
    if (speechSynthesis && voicesLoaded) {
        console.log('speakMessage - Attempting to speak:', message);
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        speechSynthesis.speak(utterance);
    } else {
        console.log('speakMessage - speechSynthesis not ready or voices not loaded.');
    }
};

let initialGreeting;
// Función para leer el saludo inicial
const speakInitialGreeting = async (name, orders) => {
    const initialBotResponse = await sendMessageToAPI('101');
    if (initialBotResponse) {
        initialGreeting = initialBotResponse;
        // Actualizar el contexto con el saludo inicial del bot
        conversationContext = initialGreeting + " ||contexto arriba|| ";
        simulateSpeech(initialGreeting, () => {
            speakMessage(initialGreeting);
        });
        addBotMessage(initialGreeting);
    }
};