async function uploadFiles() {
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const loader = document.getElementById("loader");
  const responseBox = document.getElementById("response");

  if (!fileInput.files.length) {
    alert("Selecciona al menos un archivo (imagen o video)");
    return;
  }

  // Validar peso total (50MB)
  const totalSize = Array.from(fileInput.files).reduce((acc, f) => acc + f.size, 0);
  if (totalSize > 50 * 1024 * 1024) {
    alert("El total de los archivos no puede superar 50 MB");
    return;
  }

  // Mostrar loader
  loader.style.display = "block";
  uploadBtn.disabled = true;
  responseBox.textContent = "Subiendo tus recuerdos... 💕";

  const url = "https://script.google.com/macros/s/AKfycbzT_S7kaeExAxLS2yAXSWRDuA3bf5dXo4S4J9FYl7JTnYI0uG_XeF97iOpDoe5iuU1l/exec"; // Cambia por tu Apps Script desplegado
  let results = [];

  for (const file of fileInput.files) {
    const base64Data = await toBase64(file);
    const payload = {
      fileName: file.name,
      mimeType: file.type,
      fileData: base64Data
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      results.push(data);
    } catch (err) {
      results.push({ success: false, error: err.message, file: file.name });
    }
  }

  // Restaurar UI
  loader.style.display = "none";
  uploadBtn.disabled = false;
  responseBox.textContent = JSON.stringify(results, null, 2);
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* -----------------------------
   Drag & Drop area
----------------------------- */
const dropArea = document.getElementById("dropArea");
const fileInputElem = document.getElementById("fileInput");

// Click en dropArea abre selector
dropArea.addEventListener("click", () => fileInputElem.click());

// Manejar drag & drop
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("hover");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("hover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("hover");
  const files = e.dataTransfer.files;
  if (files.length) {
    fileInputElem.files = files; // Actualiza el input
    // Espera a que el usuario haga click en "Subir recuerdos"
  }
});
