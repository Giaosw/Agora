// Variables para el mapa y los marcadores
let map;
let markers = [];

// Variables para almacenar los datos generados
let flotaData = [];
let entregasData = [];

// Variables para el reconocimiento de voz
let recognition;
let isRecording = false;
let recordedTranscript = '';

// Inicializar el mapa de Google Maps
function initMap() {
    console.log("initMap() ejecutándose...");
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: { lat: 40.4167, lng: -3.7033 }, // Madrid, Spain.
    });

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        map,
        panel: document.getElementById("panel"),
    });

    directionsRenderer.addListener("directions_changed", () => {
        const directions = directionsRenderer.getDirections();
        if (directions) {
            computeTotalDistance(directions);
        }
    });

    // No llamamos a displayRoute aquí inicialmente
}

function displayRoute(ruta) {
    const waypoints = ruta.slice(1, ruta.length - 1).map(punto => ({
        location: {
            lat: punto.lat,
            lng: punto.lng
        },
        stopover: true // Asegúrate de incluir stopover: true si quieres que sean paradas
    }));

    const service = new google.maps.DirectionsService();
    const display = new google.maps.DirectionsRenderer({
        map: map, // Asegúrate de que 'map' esté definido en tu contexto
        panel: document.getElementById("panel"), // Asegúrate de que 'panel' esté definido en tu HTML
        directions: null // Inicializa directions en null
    });

    service
        .route({
            origin: ruta[0],
            destination: ruta[ruta.length - 1],
            waypoints: waypoints, // Pasar waypoints directamente
            travelMode: google.maps.TravelMode.DRIVING,
            avoidTolls: true,
        })
        .then((result) => {
            display.setDirections(result);
        })
        .catch((e) => {
            alert("Could not display directions due to: " + e);
        });
}

function computeTotalDistance(result) {
    let total = 0;
    const myroute = result.routes[0];
    if (!myroute) {
        return;
    }
    for (let i = 0; i < myroute.legs.length; i++) {
        total += myroute.legs[i].distance.value;
    }
    total = total / 1000;
    document.getElementById("total").innerHTML = total + " km";
}

// Funciones auxiliares (generar placas, ciudades, horas, etc.)
function generateRandomPlate() {
    let plate = "";
    for (let i = 0; i < 3; i++) {
        plate += Math.floor(Math.random() * 10);
    }
    plate += "-";
    for (let i = 0; i < 3; i++) {
        plate += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    return plate;
}

function generateRandomTime() {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    return `<span class="math-inline">\{hour\.toString\(\)\.padStart\(2, '0'\)\}\:</span>{minute.toString().padStart(2, '0')}`;
}

function generateETA(departureTime, distance) {
    const [hours, minutes] = departureTime.split(":").map(Number);
    const travelTimeHours = distance / 80;
    const totalMinutes = hours * 60 + minutes + travelTimeHours * 60;
    const etaHours = Math.floor(totalMinutes / 60) % 24;
    const etaMinutes = Math.floor(totalMinutes % 60);
    return `<span class="math-inline">\{etaHours\.toString\(\)\.padStart\(2, '0'\)\}\:</span>{etaMinutes.toString().padStart(2, '0')}`;
}

// Simulación del recorrido (actualizar posición, distancia, tiempo)
async function startSimulation() {
    setInterval(async () => {
        const selectedRow = document.querySelector("#truckTableBody tr.selected");
        if (selectedRow) {
            const rowIndex = selectedRow.rowIndex;
            const truck = trucks[rowIndex - 1];
            if (truck.distanceCovered < truck.distance) {
                truck.distanceCovered += 0.5;
                truck.timeElapsed = `<span class="math-inline">\{Math\.floor\(truck\.distanceCovered / 80\)\}\:</span>{Math.floor((truck.distanceCovered % 80) / 80 * 60).toString().padStart(2, '0')}`;
                const position = await calculateIntermediatePosition(truck.origin, truck.destination, truck.distanceCovered / truck.distance);

                if (position) {
                    markers[0].setPosition(position);
                }
            }
            updateTable();
        }
    }, 1000);
}

// Variación del ETA (modificar velocidad aleatoriamente)
function updateSimulation() {
    trucks.forEach((truck) => {
        if (truck.distanceCovered + Math.floor(Math.random() * 20) <= truck.distance) {
            truck.distanceCovered += Math.floor(Math.random() * 20);
            truck.timeElapsed = `<span class="math-inline">\{Math\.floor\(truck\.distanceCovered / 80\)\}\:</span>{Math.floor((truck.distanceCovered % 80) / 80 * 60).toString().padStart(2, '0')}`;
        }
    });
    updateTable();
}

// Funciones auxiliares para obtener coordenadas de ciudades, etc.
async function getCityCoordinates(city) {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
        geocoder.geocode({ address: city }, (results, status) => {
            if (status === "OK" && results[0]) {
                resolve(results[0].geometry.location);
            } else {
                console.error("Geocoding failed:", status);
                reject(status);
            }
        });
    });
}

async function calculateIntermediatePosition(origin, destination, fraction) {
    const originCoords = await getCityCoordinates(origin);
    const destinationCoords = await getCityCoordinates(destination);

    if (originCoords && destinationCoords) {
        const lat = originCoords.lat() + (destinationCoords.lat() - originCoords.lat()) * fraction;
        const lng = originCoords.lng() + (destinationCoords.lng() - originCoords.lng()) * fraction;
        return new google.maps.LatLng(lat, lng);
    } else {
        return null;
    }
}

// Función para inicializar el reconocimiento de voz
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false; // Cambiamos a 'false' para obtener un solo resultado final
        recognition.lang = 'es-ES'; // Idioma español

        recognition.onstart = () => {
            document.getElementById('microphoneIcon').classList.remove('fa');
            document.getElementById('microphoneIcon').classList.remove('fa-microphone-slash');
            document.getElementById('microphoneIcon').classList.add('fa');
            document.getElementById('microphoneIcon').classList.add('fa-microphone');
            isRecording = true;
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            // Mostrar el texto transcrito en el chat
            const message = document.createElement('p');
            message.textContent = transcript;
            document.getElementById('voiceChatMessages').appendChild(message);

            // Aplicar el tema al mensaje
            if (document.body.classList.contains('dark-mode')) {
                message.classList.add('dark-mode');
            }

            recordedTranscript = transcript; // Almacenar la transcripción final

            recognition.stop(); // Detener la escucha después de obtener un resultado
            document.getElementById('microphoneIcon').classList.remove('fa');
            document.getElementById('microphoneIcon').classList.remove('fa-microphone');
            document.getElementById('microphoneIcon').classList.add('fa');
            document.getElementById('microphoneIcon').classList.add('fa-microphone-slash');
            isRecording = false;

            // Enviar el mensaje transcrito al API
            if (recordedTranscript.trim() !== '') {
                //document.getElementById("textInput").value = recordedTranscript; // Opcional: mostrar en el input
                assignPedidosToCamiones(recordedTranscript);
                recordedTranscript = ''; // Limpiar el transcript
            }
        };

        recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            recognition.stop(); // Detener la escucha en caso de error también
            document.getElementById('microphoneIcon').classList.remove('fa');
            document.getElementById('microphoneIcon').classList.remove('fa-microphone');
            document.getElementById('microphoneIcon').classList.add('fa');
            document.getElementById('microphoneIcon').classList.add('fa-microphone-slash');
            isRecording = false;
        };

        recognition.onend = () => {
            // El evento 'onend' ahora se disparará después de 'onresult' debido a recognition.stop()
            console.log('Reconocimiento de voz finalizado.');
        };
    } else {
        console.error('La API de reconocimiento de voz no es compatible con este navegador.');
    }
}

// Event listener para el campo de texto y la tecla Enter
document.getElementById("textInput").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        const messageText = document.getElementById("textInput").value;
        const message = document.createElement("p");
        message.textContent = messageText;
        document.getElementById("voiceChatMessages").appendChild(message);

        // Aplicar el tema al mensaje
        if (document.body.classList.contains("dark-mode")) {
            message.classList.add("dark-mode");
        }

        // Limpiar el campo de texto
        document.getElementById("textInput").value = "";

        // Enviar el mensaje de texto al API
        if (messageText.trim() !== '') {
            assignPedidosToCamiones(messageText);
        }
    }
});

// Ocultar tablas y mapa al cargar la página
window.addEventListener("load", () => {
    document.getElementById("flota").style.display = "none";
    document.getElementById("entregasPendientes").style.display = "none";
    document.getElementById("planificacion").style.display = "none";
    document.querySelector(".map-container").style.display = "none";
});

// Función para mostrar tablas y mapa
function showTablesAndMap(step) {
    if (step == 0){
        document.getElementById("flota").style.display = "block";
        document.getElementById("entregasPendientes").style.display = "block";
        document.getElementById("noDataMessage").style.display = "none";
    }
    if (step == 1){
        document.getElementById("planificacion").style.display = "block";
        document.querySelector(".map-container").style.display = "block";
    }
}

// Event listener para el botón "Randomizar Datos"
document.getElementById("randomizeBtn").addEventListener("click", () => {
    // Ahora esta función simplemente limpiará las tablas
    clearTables();
    showMessageInChat("Tablas limpiadas. La información se cargará al realizar una planificación.", true);
});

function clearTables() {
    const flotaTableBody = document.getElementById("flotaTable");
    const entregasTableBody = document.getElementById("entregasTable");
    flotaTableBody.innerHTML = "";
    entregasTableBody.innerHTML = "";
    flotaData = [];
    entregasData = [];
}

// Función para calcular la distancia entre dos coordenadas (en kilómetros)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Función para asignar pedidos a camiones llamando al servicio REST API
async function assignPedidosToCamiones(userMessage = "") {
    const fleetTableBody = document.getElementById("flotaTable");
    const ordersTableBody = document.getElementById("entregasTable");

    const fleetDataToSend = [];
    for (let i = 0; i < fleetTableBody.rows.length; i++) {
        const row = fleetTableBody.rows[i];
        fleetDataToSend.push({
            "Plate": row.cells[0].textContent,
            "Address": row.cells[1].textContent,
            "Latitude": parseFloat(row.cells[3].textContent),
            "Longitude": parseFloat(row.cells[4].textContent)
        });
    }

    const ordersDataToSend = [];
    for (let i = 0; i < ordersTableBody.rows.length; i++) {
        const row = ordersTableBody.rows[i];
        ordersDataToSend.push({
            "Brand": row.cells[1].textContent,
            "Address": row.cells[4].textContent,
            "Latitude": parseFloat(row.cells[2].textContent),
            "Longitude": parseFloat(row.cells[3].textContent)
        });
    }

    const payload = {
        "message": userMessage,
        "fleet": fleetDataToSend,
        "orders": ordersDataToSend
    };

    const apiUrl = 'https://hook.eu2.make.com/wj871adyxqaf2hhlnijrndemgiu3gk9r'; // Reemplaza con la URL de tu API

    try {
        console.log(payload);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user': 'ADMIN'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const responseText = await response.text(); // Obtener la respuesta como texto
        const jsonString = responseText.replace(/^```json\s*/i, '').replace(/```$/i, ''); // Eliminar ```json y ```

        let responseData;
        try {
            responseData = JSON.parse(jsonString); // Intentar parsear el JSON limpio
            console.log("Respuesta del API (parseada):", responseData);

            // Actualizar las tablas con la respuesta del API
            updateTablesFromApiResponse(responseData);
            showMessageInChat(responseData.message, true); // Mostrar el mensaje de la API

        } catch (parseError) {
            console.error("Error al parsear la respuesta JSON:", parseError);
            console.error("Respuesta original del API:", responseText);
            showMessageInChat("Error al procesar la respuesta del servidor.", true);
            return; // Importante: detener la ejecución si el parseo falla
        }

    } catch (error) {
        console.error("Error al llamar al servicio de planificación:", error);
        showMessageInChat("Error al realizar la planificación. Por favor, inténtalo de nuevo.", true);
    }
}

function actualizarIdPedido(idPedidoBuscar, nuevoIdPedido) {
    const tableBody = document.getElementById("entregasTableBody");

    for (let i = 0; i < tableBody.rows.length; i++) {
        const row = tableBody.rows[i];
        const idPedidoOriginal = row.cells[0].textContent; // Obtener el ID de la primera celda

        if (Number(idPedidoOriginal) === idPedidoBuscar) {
            row.cells[0].textContent = nuevoIdPedido; // Actualizar el ID
            break; // Detener la búsqueda después de encontrar y actualizar el ID
        }
    }
}

function generateRoutesForMap(camiones) {
    let ruta = []; // Inicializar ruta fuera del bucle

    camiones.forEach(camion => {
        if (camion.pedidos > 0) {
            // Agregar el depósito de partida
            ruta.push({ lat: camion.latitud, lng: camion.longitud });

            // Agregar los pedidos asignados, ordenados por proximidad
            const pedidosAsignados = entregasData.filter(pedido => pedido.Id_order === camion.Id_order);
            pedidosAsignados.sort((a, b) => {
                const distanciaA = calculateDistance(camion.latitud, camion.longitud, a.Latitude, a.Longitude);
                const distanciaB = calculateDistance(camion.latitud, camion.longitud, b.Latitude, b.Longitude);
                return distanciaA - distanciaB;
            });
            pedidosAsignados.forEach(pedido => {
                ruta.push({ lat: pedido.Latitude, lng: pedido.Longitude });
            });
        }
    });

    // Agregar el depósito de llegada (el más cercano diferente al de partida)
    if (ruta.length > 0) { // Solo si hay alguna ruta generada
        const ultimoPedido = ruta[ruta.length - 1]; // Obtener el último punto de la ruta
        const depositosDisponibles = [
            { direccion: "Polígono Industrial Los Gavilanes, Getafe", latitud: 40.3012, longitud: -3.7381 },
            { direccion: "Polígono Industrial Villaverde, Madrid", latitud: 40.3425, longitud: -3.7123 },
            { direccion: "Calle de Alcalá, 242, Madrid", latitud: 40.4328, longitud: -3.6624 },
            { direccion: "Paseo de la Castellana, 278, Madrid", latitud: 40.4658, longitud: -3.6891 },
            { direccion: "Avenida de América, 2, Madrid", latitud: 40.4429, longitud: -3.6685 },
            { direccion: "Carretera de Toledo, km 12, Leganés", latitud: 40.3345, longitud: -3.7642 },
            { direccion: "Avenida de la Constitución, 100, Fuenlabrada", latitud: 40.2861, longitud: -3.7937 },
            { direccion: "C. de Ofelia Nieto, 64, Tetuán, Madrid", latitud: 40.4658, longitud: -3.6891 },
            { direccion: "C. de Francos Rodríguez, 110, Moncloa - Aravaca, Madrid", latitud: 40.4429, longitud: -3.6685 },
            { direccion: "C. de Ginzo de Limia, S.N, Fuencarral-El Pardo, Madrid", latitud: 40.3345, longitud: -3.7642 },
            { direccion: "Av del Cardenal Herrera Oria, 290, Fuencarral-El Pardo, Madrid", latitud: 40.2861, longitud: -3.7937 },
            { direccion: "C. de Ríos Rosas, 1, Chamberí, Madrid", latitud: 40.4328, longitud: -3.6624 }
            // ... (puedes agregar más depósitos si es necesario) ...
        ].filter(deposito => !ruta.some(punto => Math.abs(punto.lat - deposito.latitud) < 1e-6 && Math.abs(punto.lng - deposito.longitud) < 1e-6));

        let depositoLlegada = null;
        if (depositosDisponibles.length > 0 && ultimoPedido) {
            depositoLlegada = depositosDisponibles.reduce((depositoMasCercano, depositoActual) => {
                const distanciaActual = calculateDistance(ultimoPedido.lat, ultimoPedido.lng, depositoActual.latitud, depositoActual.longitud);
                const distanciaCercano = calculateDistance(ultimoPedido.lat, ultimoPedido.lng, depositoMasCercano.latitud, depositoMasCercano.longitud);
                return distanciaActual < distanciaCercano ? depositoActual : depositoMasCercano;
            }, depositosDisponibles[0]); // Inicializar con el primer depósito disponible
            ruta.push({ lat: depositoLlegada.latitud, lng: depositoLlegada.longitud });
            console.log("Depósito de llegada agregado:", depositoLlegada);
        }
        console.log("ruta final:", ruta);
        // Mostrar la ruta en el mapa
        displayRoute(ruta);
    }
}

// Función para actualizar las tablas con la respuesta del API
function updateTablesFromApiResponse(apiResponse) {
    // Actualizar la tabla de camiones
    const flotaTableBody = document.getElementById("flotaTable");
    flotaTableBody.innerHTML = "";
    flotaData = apiResponse.fleet.map(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.ID_Placa}</td>
            <td>${item.Address}</td>
            <td style="display: none;">${item.Id_order}</td>
            <td style="display: none;">${item.Latitud}</td>
            <td style="display: none;">${item.Longitud}</td>
        `;
        flotaTableBody.appendChild(row);
        return {
            placa: item.ID_Placa,
            direccion: item.Address,
            latitud: item.Latitud,
            longitud: item.Longitud,
            idPedido: item.Id_order
        };
    });

    // Actualizar la tabla de pedidos
    const entregasTableBody = document.getElementById("entregasTable");
    entregasTableBody.innerHTML = "";
    entregasData = apiResponse.orders.map(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="display: none;">${item.Id_order}</td>
            <td>${item.Nombre_cliente}</td>
            <td style="display: none;">${item.Latitude}</td>
            <td style="display: none;">${item.Longitude}</td>
            <td>${item.Address}</td>
        `;
        entregasTableBody.appendChild(row);
        return {
            idPedido: item.Id_order,
            marca: item.Nombre_cliente,
            latitud: item.Latitude,
            longitud: item.Longitude,
            direccion: item.Address
        };
    });

    //Muestra las tablas
    showTablesAndMap(0);

    // Llenar la tabla de planificación
    fillPlanificacionTable();

    // Llenar la tabla de planificación y mostrar la ruta si es necesario
    if (fillPlanificacionTable()) {
        showTablesAndMap(1); 
        displayRouteFromPlanificacionTable();
    }
}

function fillPlanificacionTable() {
    const tableBody = document.getElementById("planificacionTableBody");
    tableBody.innerHTML = ""; // Limpiar la tabla
    const placasProcesadas = new Set(); // Para asegurar un único registro por placa
    let tablaLlenada = false;

    if (flotaData && flotaData.length > 0 && entregasData && entregasData.length > 0) {
        flotaData.forEach(flotaItem => {
            const flotaIdPedido = flotaItem.idPedido;
            const placa = flotaItem.placa;

            if (flotaIdPedido && flotaIdPedido !== null && flotaIdPedido !== undefined && flotaIdPedido !== "" && !placasProcesadas.has(placa)) {
                const entregaAsignada = entregasData.find(entregaItem => entregaItem.idPedido === flotaIdPedido);
                if (entregaAsignada && entregaAsignada.idPedido !== null && entregaAsignada.idPedido !== undefined && entregaAsignada.idPedido !== "") {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td style="display: none;">${flotaIdPedido}</td>
                        <td>${placa}</td>
                        <td>-</td> <td style="display: none;">0</td> <td>-</td>
                    `;
                    tableBody.appendChild(row);
                    placasProcesadas.add(placa);
                    tablaLlenada = true;
                }
            }
        });
    }

    return tablaLlenada;
}

function displayRouteFromPlanificacionTable() {
    console.log("displayRouteFromPlanificacionTable() ejecutándose...");
    const tableBody = document.getElementById("planificacionTableBody");
    const firstRow = tableBody.querySelector("tr"); // Obtener la primera fila

    if (firstRow) {
        const placa = firstRow.querySelector("td:nth-child(2)").textContent; // Obtener la placa del camión
        const camion = flotaData.find(camion => camion.placa === placa); // Buscar el camión en flotaData

        if (camion && camion.idPedido) { // Ahora usamos idPedido directamente de flotaData
            let ruta = []; // Inicializar ruta fuera del bloque if
            // Agregar el depósito de partida
            ruta.push({ lat: camion.latitud, lng: camion.longitud });
            console.log("Ruta inicial:", ruta);

            // Agregar los pedidos asignados, ordenados por proximidad
            const pedidosAsignados = entregasData.filter(pedido => pedido.idPedido === camion.idPedido);
            pedidosAsignados.sort((a, b) => {
                const distanciaA = calculateDistance(camion.latitud, camion.longitud, a.latitud, a.longitud);
                const distanciaB = calculateDistance(camion.latitud, camion.longitud, b.latitud, b.longitud);
                return distanciaA - distanciaB;
            });
            pedidosAsignados.forEach(pedido => {
                ruta.push({ lat: pedido.latitud, lng: pedido.longitud });
                console.log("Pedido agregado:", pedido);
            });

            // Agregar el depósito de llegada (el más cercano diferente al de partida)
            if (ruta.length > 0) { // Solo si hay alguna ruta generada
                const ultimoPedido = ruta[ruta.length - 1]; // Obtener el último punto de la ruta
                const depositosDisponibles = [
                    { direccion: "Polígono Industrial Los Gavilanes, Getafe", latitud: 40.3012, longitud: -3.7381 },
                    { direccion: "Polígono Industrial Villaverde, Madrid", latitud: 40.3425, longitud: -3.7123 },
                    { direccion: "Calle de Alcalá, 242, Madrid", latitud: 40.4328, longitud: -3.6624 },
                    { direccion: "Paseo de la Castellana, 278, Madrid", latitud: 40.4658, longitud: -3.6891 },
                    { direccion: "Avenida de América, 2, Madrid", latitud: 40.4429, longitud: -3.6685 },
                    { direccion: "Carretera de Toledo, km 12, Leganés", latitud: 40.3345, longitud: -3.7642 },
                    { direccion: "Avenida de la Constitución, 100, Fuenlabrada", latitud: 40.2861, longitud: -3.7937 },
                    { direccion: "C. de Ofelia Nieto, 64, Tetuán, Madrid", latitud: 40.4658, longitud: -3.6891 },
                    { direccion: "C. de Francos Rodríguez, 110, Moncloa - Aravaca, Madrid", latitud: 40.4429, longitud: -3.6685 },
                    { direccion: "C. de Ginzo de Limia, S.N, Fuencarral-El Pardo, Madrid", latitud: 40.3345, longitud: -3.7642 },
                    { direccion: "Av del Cardenal Herrera Oria, 290, Fuencarral-El Pardo, Madrid", latitud: 40.2861, longitud: -3.7937 },
                    { direccion: "C. de Ríos Rosas, 1, Chamberí, Madrid", latitud: 40.4328, longitud: -3.6624 }
                    // ... (puedes agregar más depósitos si es necesario) ...
                ].filter(deposito => !ruta.some(punto => Math.abs(punto.lat - deposito.latitud) < 1e-6 && Math.abs(punto.lng - deposito.longitud) < 1e-6));

                let depositoLlegada = null;
                if (depositosDisponibles.length > 0 && ultimoPedido) {
                    depositoLlegada = depositosDisponibles.reduce((depositoMasCercano, depositoActual) => {
                        const distanciaActual = calculateDistance(ultimoPedido.lat, ultimoPedido.lng, depositoActual.latitud, depositoActual.longitud);
                        const distanciaCercano = calculateDistance(ultimoPedido.lat, ultimoPedido.lng, depositoMasCercano.latitud, depositoMasCercano.longitud);
                        return distanciaActual < distanciaCercano ? depositoActual : depositoMasCercano;
                    }, depositosDisponibles[0]); // Inicializar con el primer depósito disponible
                    ruta.push({ lat: depositoLlegada.latitud, lng: depositoLlegada.longitud });
                    console.log("Depósito de llegada agregado:", depositoLlegada);
                }
                console.log("ruta final:", ruta);
                // Mostrar la ruta en el mapa
                displayRoute(ruta);
            }
        }
    }
}

// Función para mostrar mensajes en el chat con estilo
function showMessageInChat(messageText, readAloud = false) {
    const message = document.createElement("div");
    message.classList.add("chat-message"); // Agregar clase para estilo
    message.textContent = messageText;
    document.getElementById("voiceChatMessages").appendChild(message);

    // Aplicar el tema al mensaje
    if (document.body.classList.contains("dark-mode")) {
        message.classList.add("dark-mode");
    }

    // Leer el mensaje en voz alta si readAloud es true
    if (readAloud) {
        speak(messageText);
    }
}

// Función para leer texto en voz alta
function speak(text) {
    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Establecer el idioma a español
    // Apagar el micrófono antes de leer el texto
    if (isRecording) {
        recognition.stop();
    }
    speechSynthesis.speak(utterance);
}

// Event listener para el botón del micrófono
document.getElementById("startButton").addEventListener("click", () => {
    if (isRecording) {
        recognition.stop();
    } else {
        initSpeechRecognition();
        recognition.start();
    }
});

// Función maestra para generar datos aleatorios y llenar las tablas (AHORA SOLO LIMPIA)
function generateRandomData() {
    clearTables();
    showMessageInChat("Tablas limpiadas. La información se cargará al realizar una planificación.", true);
}

// Función para limpiar las tablas
function clearTables() {
    const flotaTableBody = document.getElementById("flotaTable");
    const entregasTableBody = document.getElementById("entregasTable");
    flotaTableBody.innerHTML = "";
    entregasTableBody.innerHTML = "";
    flotaData = [];
    entregasData = [];
}

// Función para llenar la tabla "Flota" con datos (ahora solo se usa con la respuesta del API)
function fillFlotaTable() {
    const tableBody = document.getElementById("flotaTable");
    tableBody.innerHTML = ""; // Limpiar la tabla

    if (flotaData && flotaData.length > 0) { // Verificar si hay datos
        flotaData.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.placa}</td>
                <td>${item.direccion}</td>
                <td style="display: none;">${item.idPedido}</td>
                <td style="display: none;">${item.latitud}</td>
                <td style="display: none;">${item.longitud}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// Función para llenar la tabla "Entregas Pendientes" con datos (ahora solo se usa con la respuesta del API)
function fillEntregasTable() {
    const tableBody = document.getElementById("entregasTable");
    tableBody.innerHTML = ""; // Limpiar la tabla

    if (entregasData && entregasData.length > 0) { // Verificar si hay datos
        entregasData.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="display: none;">${item.idPedido}</td>
                <td>${item.marca}</td>
                <td style="display: none;">${item.latitud}</td>
                <td style="display: none;">${item.longitud}</td>
                <td>${item.direccion}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}
// Función para aplicar el tema oscuro
function applyDarkMode() {
    document.body.classList.add("dark-mode");
    const chatMessages = document.querySelectorAll(".chat-message");
    chatMessages.forEach(message => {
        message.classList.add("dark-mode");
    });
    // Aplicar estilo oscuro a las tablas si es necesario
    const tables = document.querySelectorAll("table");
    tables.forEach(table => {
        table.classList.add("dark-mode-table");
    });
}

// Función para aplicar el tema claro
function applyLightMode() {
    document.body.classList.remove("dark-mode");
    const chatMessages = document.querySelectorAll(".chat-message");
    chatMessages.forEach(message => {
        message.classList.remove("dark-mode");
    });
    // Remover estilo oscuro de las tablas
    const tables = document.querySelectorAll("table");
    tables.forEach(table => {
        table.classList.remove("dark-mode-table");
    });
}


// Comprobar el tema almacenado al cargar la página
window.addEventListener("load", () => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
        applyDarkMode();
    }
});

// Inicializar el mapa al cargar la página
window.onload = initMap;