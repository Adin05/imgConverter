const { ipcRenderer } = require('electron');
const fs = require('fs');

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const previewImg = document.getElementById('preview-img');
const filenameDisplay = document.getElementById('filename-display');
const modeSelect = document.getElementById('mode-select');

// Options Panels
const optionsResize = document.getElementById('options-resize');
const optionsPassport = document.getElementById('options-passport');

// Inputs
const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const keepAspect = document.getElementById('keep-aspect');
const formatSelect = document.getElementById('format-select');
const resizeBgColor = document.getElementById('resize-bg-color');
const passportSize = document.getElementById('passport-size');
const bgColor = document.getElementById('bg-color');

// Buttons
const processBtn = document.getElementById('process-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Canvas
const canvas = document.getElementById('processing-canvas');
const ctx = canvas.getContext('2d');

let currentFile = null;
let currentImage = new Image();
let originalWidth = 0;
let originalHeight = 0;

// Passport sizes mapped to 300 DPI
const PASSPORT_SIZES = {
    '2x3': { w: 236, h: 354 },
    '3x4': { w: 354, h: 472 },
    '4x6': { w: 472, h: 709 }
};

// Event Listeners for Upload
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', function() {
    if (this.files.length) handleFile(this.files[0]);
});

// Cancel and restart
cancelBtn.addEventListener('click', () => {
    currentFile = null;
    dropZone.classList.remove('hidden');
    previewSection.classList.add('hidden');
    fileInput.value = '';
});

// Mode switching
modeSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    optionsResize.classList.add('hidden');
    optionsPassport.classList.add('hidden');

    if (mode === 'resize') optionsResize.classList.remove('hidden');
    else if (mode === 'passport') optionsPassport.classList.remove('hidden');
});

// Aspect ratio logic for custom resizing
inputWidth.addEventListener('input', () => {
    if (keepAspect.checked && originalWidth > 0 && inputWidth.value) {
        const ratio = originalHeight / originalWidth;
        inputHeight.value = Math.round(inputWidth.value * ratio);
    }
});

inputHeight.addEventListener('input', () => {
    if (keepAspect.checked && originalHeight > 0 && inputHeight.value) {
        const ratio = originalWidth / originalHeight;
        inputWidth.value = Math.round(inputHeight.value * ratio);
    }
});

function handleFile(file) {
    if (!file.type.match('image.*')) {
        alert('Tolong unggah file gambar yang valid!');
        return;
    }
    
    currentFile = file;
    filenameDisplay.textContent = file.name;
    
    modeSelect.value = 'resize';
    modeSelect.dispatchEvent(new Event('change'));

    // Set Default Output Format
    let defaultFormat = 'png';
    if (file.type === 'image/jpeg') defaultFormat = 'jpg';
    if (file.type === 'image/webp') defaultFormat = 'webp';
    formatSelect.value = defaultFormat;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        currentImage.src = e.target.result;
        currentImage.onload = () => {
            originalWidth = currentImage.width;
            originalHeight = currentImage.height;
            inputWidth.value = originalWidth;
            inputHeight.value = originalHeight;
        }
    }
    reader.readAsDataURL(file);

    dropZone.classList.add('hidden');
    previewSection.classList.remove('hidden');
}

// Processing Logic
processBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    processBtn.disabled = true;
    processBtn.innerText = "Processing...";

    const mode = modeSelect.value;
    
    try {
        await handleImageRendering(mode);
    } catch (err) {
        alert("Terjadi kesalahan sistem: " + err.message);
    } finally {
        processBtn.disabled = false;
        processBtn.innerText = "Proses & Simpan";
    }
});

async function handleImageRendering(mode) {
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    let exportFormat = formatSelect.value;
    let fillBackground = false;
    let bgFillColor = resizeBgColor ? resizeBgColor.value : '#ffffff';
    let mimeType = 'image/png';
    let exportExt = 'png';

    if (mode === 'resize') {
        targetWidth = parseInt(inputWidth.value) || originalWidth;
        targetHeight = parseInt(inputHeight.value) || originalHeight;
        
        switch (exportFormat) {
            case 'jpg':
                mimeType = 'image/jpeg';
                exportExt = 'jpg';
                fillBackground = true;
                break;
            case 'webp':
                mimeType = 'image/webp';
                exportExt = 'webp';
                break;
            case 'ico':
                mimeType = 'image/png'; // draw to png temp buffer first for ico script
                exportExt = 'ico';
                break;
            case 'png':
            default:
                mimeType = 'image/png';
                exportExt = 'png';
                break;
        }
    } else if (mode === 'passport') {
        const size = PASSPORT_SIZES[passportSize.value];
        targetWidth = size.w;
        targetHeight = size.h;
        fillBackground = true;
        bgFillColor = bgColor.value;
        mimeType = 'image/jpeg'; // Pas foto rata-rata jpeg
        exportExt = 'jpg';
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (fillBackground) {
        ctx.fillStyle = bgFillColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else {
        ctx.clearRect(0, 0, targetWidth, targetHeight);
    }

    // Processing mode specific drawings
    if (mode === 'passport') {
        // Crop and Center Image (Cover)
        const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
        const w = originalWidth * scale;
        const h = originalHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        ctx.drawImage(currentImage, x, y, w, h);
    } else {
        // Normal Resize (Stretch to fit exact dimensions specified)
        ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);
    }

    // Export Data
    const dataUrl = canvas.toDataURL(mimeType, 1.0);
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const fileNameNoExt = currentFile.name.split('.').slice(0, -1).join('.');
    let defaultSuffix = (mode === 'passport') ? '_pasfoto' : '_converted';
    
    // Save behavior via IPC to Node.js backend
    if (exportExt === 'ico') {
        await ipcRenderer.invoke('save-ico', {
            buffer: buffer,
            defaultPath: `${fileNameNoExt}.ico`
        });
    } else {
        await ipcRenderer.invoke('save-file', {
            buffer: buffer,
            defaultPath: `${fileNameNoExt}${defaultSuffix}.${exportExt}`
        });
    }
}
