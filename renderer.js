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

const printGridCheck = document.getElementById('print-grid-check');
const paperSizeContainer = document.getElementById('paper-size-container');
const paperSizeSelect = document.getElementById('paper-size');
const printQty = document.getElementById('print-qty');

// Buttons
const processBtn = document.getElementById('process-btn');
const printBtn = document.getElementById('print-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Canvas
const canvas = document.getElementById('processing-canvas');
const ctx = canvas.getContext('2d');

let currentFile = null;
let currentImage = new Image();
let originalWidth = 0;
let originalHeight = 0;

// Passport & Paper Sizes mapped to 300 DPI
const PASSPORT_SIZES = {
    '2x3': { w: 236, h: 354 },
    '3x4': { w: 354, h: 472 },
    '4x6': { w: 472, h: 709 }
};

const PAPER_SIZES = {
    'A4': { w: 2480, h: 3508 },    // 210 x 297 mm
    '4R': { w: 1205, h: 1795 },    // 102 x 152 mm
    'Letter': { w: 2550, h: 3300 } // 216 x 279 mm
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

function updatePrintButtonVisibility() {
    if (modeSelect.value === 'passport' && printGridCheck.checked) {
        printBtn.classList.remove('hidden');
    } else {
        printBtn.classList.add('hidden');
    }
}

// Event Listener for Print Grid
printGridCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
        paperSizeContainer.classList.remove('hidden');
    } else {
        paperSizeContainer.classList.add('hidden');
    }
    updatePrintButtonVisibility();
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

    updatePrintButtonVisibility();
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
    modeSelect.dispatchEvent(new Event('change')); // This safely updates print button visibility as well

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

// Processing Logic separated by Action Type
processBtn.addEventListener('click', async () => {
    await runProcessing('save');
});

printBtn.addEventListener('click', async () => {
    await runProcessing('print');
});

async function runProcessing(actionType) {
    if (!currentFile) return;

    const mode = modeSelect.value;
    
    // Validate print compatibility
    if (actionType === 'print' && mode === 'resize' && formatSelect.value === 'ico') {
        alert("Pilihan target convert ICO (Windows Icon) tidak didukung untuk dicetak langsung. Silakan ubah target format ke JPG/PNG atau Cetak ke File.");
        return;
    }

    const btn = (actionType === 'save') ? processBtn : printBtn;
    const tempText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        await handleImageRendering(mode, actionType);
    } catch (err) {
        alert("Terjadi kesalahan sistem: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = tempText;
    }
}

async function handleImageRendering(mode, actionType) {
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    let exportFormat = formatSelect.value;
    let fillBackground = false;
    let bgFillColor = resizeBgColor ? resizeBgColor.value : '#ffffff';
    let mimeType = 'image/png';
    let exportExt = 'png';

    const isGrid = (mode === 'passport' && printGridCheck.checked);
    const paperSpec = isGrid ? PAPER_SIZES[paperSizeSelect.value] : null;

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
                mimeType = 'image/png';
                exportExt = 'ico';
                targetWidth = 256;
                targetHeight = 256;
                break;
            case 'png':
            default:
                mimeType = 'image/png';
                exportExt = 'png';
                break;
        }
    } else if (mode === 'passport') {
        const size = PASSPORT_SIZES[passportSize.value];
        targetWidth = size.w; // Single photo width
        targetHeight = size.h; // Single photo height
        fillBackground = true;
        bgFillColor = bgColor.value;
        mimeType = 'image/jpeg';
        exportExt = 'jpg';
    }

    let finalCanvasWidth = isGrid ? paperSpec.w : (mode === 'resize' && exportExt === 'ico' ? 256 : targetWidth);
    let finalCanvasHeight = isGrid ? paperSpec.h : (mode === 'resize' && exportExt === 'ico' ? 256 : targetHeight);

    canvas.width = finalCanvasWidth;
    canvas.height = finalCanvasHeight;

    if (fillBackground && !isGrid) {
        ctx.fillStyle = bgFillColor;
        ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);
    } else if (!isGrid) {
        ctx.clearRect(0, 0, finalCanvasWidth, finalCanvasHeight);
    }

    // Render logic
    if (isGrid) {
        // We are rendering a paper grid
        ctx.fillStyle = '#ffffff'; // White paper base
        ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

        // Prepare single passport photo layout via an offscreen canvas
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = targetWidth;
        offscreenCanvas.height = targetHeight;
        const offCtx = offscreenCanvas.getContext('2d');
        
        offCtx.fillStyle = bgFillColor;
        offCtx.fillRect(0, 0, targetWidth, targetHeight);
        
        const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
        const w = originalWidth * scale;
        const h = originalHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        offCtx.drawImage(currentImage, x, y, w, h);

        // Draw dotted helper border for cut marks (light grey) on offscreen canvas
        offCtx.strokeStyle = '#cccccc';
        offCtx.lineWidth = 4;
        offCtx.setLineDash([10, 10]);
        offCtx.strokeRect(0, 0, targetWidth, targetHeight);

        // Grid calculation
        const margin = 80; // Safety margin from edges of paper
        const gap = 24; // ~2mm gap between photos
        
        let cols = Math.floor((finalCanvasWidth - margin * 2 + gap) / (targetWidth + gap));
        let rows = Math.floor((finalCanvasHeight - margin * 2 + gap) / (targetHeight + gap));

        let limitQty = parseInt(printQty.value);
        if (isNaN(limitQty) || limitQty <= 0) {
            limitQty = rows * cols; // Fit maximum
        } else if (limitQty > rows * cols) {
            limitQty = rows * cols; // Cap at max available
        }
        
        let actualCols = limitQty < cols ? limitQty : cols;
        let actualRows = Math.ceil(limitQty / actualCols); 

        // Posisikan mulai dari pojok kiri atas secara default
        const startX = margin;
        const startY = margin;

        let printedCount = 0;

        outerLoop: for (let r = 0; r < rows; r++) {
            for (let c = 0; c < actualCols; c++) {
                if (printedCount >= limitQty) break outerLoop;

                let dx = startX + c * (targetWidth + gap);
                let dy = startY + r * (targetHeight + gap);
                ctx.drawImage(offscreenCanvas, dx, dy);
                
                printedCount++;
            }
        }
    } else if (mode === 'passport') {
        const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
        const w = originalWidth * scale;
        const h = originalHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        ctx.drawImage(currentImage, x, y, w, h);
    } else if (exportExt === 'ico') {
        const scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
        const w = originalWidth * scale;
        const h = originalHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        ctx.drawImage(currentImage, x, y, w, h);
    } else {
        ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);
    }

    // Capture standard base URL from canvas logic
    const dataUrl = canvas.toDataURL(mimeType, 1.0);

    // ACTION: DIRECT PRINT VIA HIDDEN IFRAME
    if (actionType === 'print') {
        let iframe = document.getElementById('print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-iframe';
            iframe.style.visibility = 'hidden';
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            document.body.appendChild(iframe);
        }
        
        const doc = iframe.contentWindow.document;
        doc.open();
        // The sizing max-width: 100vw ensures the paper strictly bounds to Chromium's print layout.
        doc.write(`
            <html>
                <head>
                    <style>
                        @page { margin: 0; size: auto; }
                        body { margin: 0; padding: 0; background: #fff; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; overflow: hidden; }
                        img { max-width: 100%; max-height: 100%; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" onload="setTimeout(() => window.print(), 350);">
                </body>
            </html>
        `);
        doc.close();
        return; // Break execution so it doesn't save to file natively
    }

    // ACTION: SAVE LOCALLY
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const fileNameNoExt = currentFile.name.split('.').slice(0, -1).join('.');
    
    // Choose appropriate suffix based on user choice
    let defaultSuffix = '_converted';
    if (mode === 'passport') {
        defaultSuffix = isGrid ? `_Grid_Layout_${paperSizeSelect.value}` : '_pasfoto';
    }
    
    try {
        if (exportExt === 'ico') {
            const result = await ipcRenderer.invoke('save-ico', {
                buffer: buffer,
                defaultPath: `${fileNameNoExt}.ico`
            });
            
            if (result && !result.success && !result.canceled) {
                alert(`[Gagal Konversi ICO]\n\nError Asli dari Node.js:\n${result.error}`);
            }
        } else {
            const result = await ipcRenderer.invoke('save-file', {
                buffer: buffer,
                defaultPath: `${fileNameNoExt}${defaultSuffix}.${exportExt}`
            });
            
            if (result && !result.success && !result.canceled) {
                alert(`[Gagal Menyimpan File]\n\nError: ${result.error}`);
            }
        }
    } catch (err) {
        alert("Kesalahan IPC Layer: " + err.message);
    }
}
