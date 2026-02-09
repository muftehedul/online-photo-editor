// Advanced filter and adjustment functions

function applyAdvancedFilters(editor) {
    if (!editor.originalImage) {
        editor.saveOriginalImage();
    }
    
    const layerCtx = editor.layers[editor.currentLayer].canvas.getContext('2d');
    const originalData = new ImageData(
        new Uint8ClampedArray(editor.originalImage.data),
        editor.originalImage.width,
        editor.originalImage.height
    );
    
    const data = originalData.data;
    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);
    const saturation = parseInt(document.getElementById('saturation').value);
    const exposure = parseInt(document.getElementById('exposure').value);
    const highlights = parseInt(document.getElementById('highlights').value);
    const shadows = parseInt(document.getElementById('shadows').value);
    const vibrance = parseInt(document.getElementById('vibrance').value);
    const temperature = parseInt(document.getElementById('temperature').value);
    const tint = parseInt(document.getElementById('tint').value);
    const sharpness = parseInt(document.getElementById('sharpness').value);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        const expFactor = 1 + (exposure / 100);
        r *= expFactor;
        g *= expFactor;
        b *= expFactor;

        r += brightness;
        g += brightness;
        b += brightness;

        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 128) {
            const highlightFactor = 1 + (highlights / 200);
            r = 128 + (r - 128) * highlightFactor;
            g = 128 + (g - 128) * highlightFactor;
            b = 128 + (b - 128) * highlightFactor;
        } else {
            const shadowFactor = 1 + (shadows / 200);
            r = 128 - (128 - r) * shadowFactor;
            g = 128 - (128 - g) * shadowFactor;
            b = 128 - (128 - b) * shadowFactor;
        }

        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        const satFactor = saturation / 100;
        r = gray + (r - gray) * (1 + satFactor);
        g = gray + (g - gray) * (1 + satFactor);
        b = gray + (b - gray) * (1 + satFactor);

        const maxRGB = Math.max(r, g, b);
        const minRGB = Math.min(r, g, b);
        const currentSat = maxRGB - minRGB;
        if (currentSat < 128) {
            const vibFactor = vibrance / 200;
            r = gray + (r - gray) * (1 + vibFactor);
            g = gray + (g - gray) * (1 + vibFactor);
            b = gray + (b - gray) * (1 + vibFactor);
        }

        r += temperature * 0.5;
        b -= temperature * 0.5;
        g += tint * 0.5;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    if (sharpness > 0) {
        applySharpen(originalData, sharpness / 100);
    }

    layerCtx.putImageData(originalData, 0, 0);
    
    const blur = parseInt(document.getElementById('blur').value);
    if (blur > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = editor.canvas.width;
        tempCanvas.height = editor.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = `blur(${blur}px)`;
        tempCtx.drawImage(editor.layers[editor.currentLayer].canvas, 0, 0);
        layerCtx.clearRect(0, 0, editor.canvas.width, editor.canvas.height);
        layerCtx.drawImage(tempCanvas, 0, 0);
    }

    const vignette = parseInt(document.getElementById('vignette').value);
    if (vignette > 0) {
        applyVignette(layerCtx, editor.canvas.width, editor.canvas.height, vignette / 100);
    }

    editor.renderLayers();
}

function applySharpen(imageData, amount) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];
    
    const copy = new Uint8ClampedArray(data);
    
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                        sum += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                data[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, sum));
            }
        }
    }
}

function applyVignette(ctx, w, h, amount) {
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, `rgba(0,0,0,0)`);
    gradient.addColorStop(1, `rgba(0,0,0,${amount})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}

function applyPresetFilters(editor, filterName) {
    if (!editor.originalImage) {
        editor.saveOriginalImage();
    }

    const layerCtx = editor.layers[editor.currentLayer].canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, editor.canvas.width, editor.canvas.height);
    const data = imageData.data;

    switch(filterName) {
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i + 1] = data[i + 2] = avg;
            }
            break;

        case 'sepia':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
            break;

        case 'invert':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;

        case 'vintage':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = Math.min(255, r * 0.9 + 30);
                data[i + 1] = Math.min(255, g * 0.85 + 20);
                data[i + 2] = Math.min(255, b * 0.7);
            }
            break;

        case 'cold':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, data[i] - 20);
                data[i + 2] = Math.min(255, data[i + 2] + 30);
            }
            break;

        case 'warm':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] + 30);
                data[i + 1] = Math.min(255, data[i + 1] + 10);
                data[i + 2] = Math.max(0, data[i + 2] - 20);
            }
            break;

        case 'dramatic':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const factor = 1.5;
                data[i] = Math.min(255, (r - 128) * factor + 128);
                data[i + 1] = Math.min(255, (g - 128) * factor + 128);
                data[i + 2] = Math.min(255, (b - 128) * factor + 128);
            }
            break;

        case 'vivid':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = Math.min(255, gray + (r - gray) * 1.5);
                data[i + 1] = Math.min(255, gray + (g - gray) * 1.5);
                data[i + 2] = Math.min(255, gray + (b - gray) * 1.5);
            }
            break;

        case 'noir':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const factor = 1.3;
                const val = Math.min(255, (avg - 128) * factor + 128);
                data[i] = data[i + 1] = data[i + 2] = val;
            }
            break;

        case 'sunset':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.2 + 40);
                data[i + 1] = Math.min(255, data[i + 1] * 0.9 + 20);
                data[i + 2] = Math.max(0, data[i + 2] * 0.7 - 30);
            }
            break;

        case 'ocean':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, data[i] * 0.7 - 20);
                data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 10);
                data[i + 2] = Math.min(255, data[i + 2] * 1.3 + 30);
            }
            break;

        case 'cyberpunk':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.2 + 30);
                data[i + 1] = Math.max(0, data[i + 1] * 0.8);
                data[i + 2] = Math.min(255, data[i + 2] * 1.4 + 40);
            }
            break;
        
        case 'hdr':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const factor = lum < 128 ? 1.3 : 0.8;
                data[i] = Math.min(255, r * factor);
                data[i + 1] = Math.min(255, g * factor);
                data[i + 2] = Math.min(255, b * factor);
                const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = Math.min(255, gray + (data[i] - gray) * 1.4);
                data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * 1.4);
                data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * 1.4);
            }
            break;
        
        case 'polaroid':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.1 + 20);
                data[i + 1] = Math.min(255, data[i + 1] * 1.05 + 15);
                data[i + 2] = Math.min(255, data[i + 2] * 0.95 + 10);
                const factor = 1.2;
                data[i] = Math.min(255, (data[i] - 128) * factor + 128);
                data[i + 1] = Math.min(255, (data[i + 1] - 128) * factor + 128);
                data[i + 2] = Math.min(255, (data[i + 2] - 128) * factor + 128);
            }
            break;
        
        case 'crossprocess':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.3);
                data[i + 1] = Math.min(255, data[i + 1] * 0.9);
                data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 20);
            }
            break;
        
        case 'lomo':
            for (let i = 0; i < data.length; i += 4) {
                const factor = 1.5;
                data[i] = Math.min(255, (data[i] - 128) * factor + 128);
                data[i + 1] = Math.min(255, (data[i + 1] - 128) * factor + 128);
                data[i + 2] = Math.min(255, (data[i + 2] - 128) * factor + 128);
                const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = Math.min(255, gray + (data[i] - gray) * 1.6);
                data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * 1.6);
                data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * 1.6);
            }
            break;
        
        case 'technicolor':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.4 - 20);
                data[i + 1] = Math.min(255, data[i + 1] * 1.2);
                data[i + 2] = Math.min(255, data[i + 2] * 1.3 - 10);
            }
            break;
        
        case 'moonlight':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = Math.max(0, avg * 0.8 - 20);
                data[i + 1] = Math.max(0, avg * 0.9 - 10);
                data[i + 2] = Math.min(255, avg * 1.2 + 30);
            }
            break;
        
        case 'retro':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 0.95 + 40);
                data[i + 1] = Math.min(255, data[i + 1] * 0.85 + 30);
                data[i + 2] = Math.min(255, data[i + 2] * 0.75 + 20);
            }
            break;
        
        case 'softfocus':
            for (let i = 0; i < data.length; i += 4) {
                const factor = 0.8;
                data[i] = Math.min(255, (data[i] - 128) * factor + 128 + 20);
                data[i + 1] = Math.min(255, (data[i + 1] - 128) * factor + 128 + 20);
                data[i + 2] = Math.min(255, (data[i + 2] - 128) * factor + 128 + 20);
            }
            break;
    }

    layerCtx.putImageData(imageData, 0, 0);
    editor.renderLayers();
}

function autoEnhance(editor) {
    if (!editor.originalImage) return;
    
    const layerCtx = editor.layers[editor.currentLayer].canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, editor.canvas.width, editor.canvas.height);
    const data = imageData.data;
    
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        minR = Math.min(minR, data[i]);
        maxR = Math.max(maxR, data[i]);
        minG = Math.min(minG, data[i + 1]);
        maxG = Math.max(maxG, data[i + 1]);
        minB = Math.min(minB, data[i + 2]);
        maxB = Math.max(maxB, data[i + 2]);
    }
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - minR) / (maxR - minR)) * 255;
        data[i + 1] = ((data[i + 1] - minG) / (maxG - minG)) * 255;
        data[i + 2] = ((data[i + 2] - minB) / (maxB - minB)) * 255;
    }
    
    layerCtx.putImageData(imageData, 0, 0);
    editor.renderLayers();
    editor.saveOriginalImage();
}

function autoContrast(editor) {
    if (!editor.originalImage) return;
    
    const layerCtx = editor.layers[editor.currentLayer].canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, editor.canvas.width, editor.canvas.height);
    const data = imageData.data;
    
    let min = 255, max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        min = Math.min(min, lum);
        max = Math.max(max, lum);
    }
    
    const range = max - min;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - min) / range) * 255;
        data[i + 1] = ((data[i + 1] - min) / range) * 255;
        data[i + 2] = ((data[i + 2] - min) / range) * 255;
    }
    
    layerCtx.putImageData(imageData, 0, 0);
    editor.renderLayers();
    editor.saveOriginalImage();
}

function autoColor(editor) {
    if (!editor.originalImage) return;
    
    const layerCtx = editor.layers[editor.currentLayer].canvas.getContext('2d');
    const imageData = layerCtx.getImageData(0, 0, editor.canvas.width, editor.canvas.height);
    const data = imageData.data;
    
    let avgR = 0, avgG = 0, avgB = 0;
    const pixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
        avgR += data[i];
        avgG += data[i + 1];
        avgB += data[i + 2];
    }
    
    avgR /= pixels;
    avgG /= pixels;
    avgB /= pixels;
    
    const avgGray = (avgR + avgG + avgB) / 3;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * (avgGray / avgR));
        data[i + 1] = Math.min(255, data[i + 1] * (avgGray / avgG));
        data[i + 2] = Math.min(255, data[i + 2] * (avgGray / avgB));
    }
    
    layerCtx.putImageData(imageData, 0, 0);
    editor.renderLayers();
    editor.saveOriginalImage();
}
