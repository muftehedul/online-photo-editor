class PhotoEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'brush';
        this.color = '#000000';
        this.brushSize = 5;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.layers = [{ id: 0, canvas: this.createCanvas(), visible: true, name: 'Layer 1' }];
        this.currentLayer = 0;
        this.history = [];
        this.historyStep = -1;
        this.originalImage = null;
        this.zoom = 1;
        this.tabs = [{ id: 0, name: 'Canvas 1', layers: null, history: null, historyStep: -1 }];
        this.currentTab = 0;
        this.cropSelection = null;
        this.isDraggingCrop = false;
        
        this.init();
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        return canvas;
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        document.querySelectorAll('.tool, .tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.tool.active')?.classList.remove('active');
                document.querySelector('.tool-btn.active')?.classList.remove('active');
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
            });
        });

        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.color = e.target.value;
        });

        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = e.target.value;
            document.getElementById('sizeLabel').textContent = e.target.value + 'px';
        });

        document.getElementById('imageUpload').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                console.log('File selected:', e.target.files[0].name);
                this.loadImage(e.target.files[0]);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') this.undo();
            if (e.ctrlKey && e.key === 'y') this.redo();
            const toolMap = { b: 'brush', e: 'eraser', r: 'rect', c: 'circle', l: 'line', t: 'text', f: 'fill' };
            if (toolMap[e.key]) {
                this.currentTool = toolMap[e.key];
                document.querySelector('.tool.active')?.classList.remove('active');
                document.querySelector(`[data-tool="${toolMap[e.key]}"]`)?.classList.add('active');
            }
        });

        this.updateLayersList();
        this.saveState();
        this.setupTabs();
        this.updateHistoryList();
        this.loadFromLocalStorage();
    }

    saveToLocalStorage() {
        try {
            // Simply save the main visible canvas
            const canvasData = this.canvas.toDataURL('image/png');
            
            const state = {
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                canvasImage: canvasData,
                currentLayer: this.currentLayer,
                zoom: this.zoom,
                color: this.color,
                brushSize: this.brushSize,
                currentTool: this.currentTool,
                history: this.history.slice(-10), // Save last 10 history items
                historyStep: this.historyStep
            };
            
            localStorage.setItem('photoEditorState', JSON.stringify(state));
            console.log('✓ Saved! Canvas:', this.canvas.width, 'x', this.canvas.height, 'History items:', this.history.length);
        } catch (e) {
            console.error('✗ Save failed:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('photoEditorState');
            console.log('Checking localStorage... Found:', saved ? 'YES' : 'NO');
            
            if (!saved) {
                console.log('No saved state');
                return;
            }

            console.log('Loading saved state...');
            const state = JSON.parse(saved);
            console.log('State data length:', state.canvasImage ? state.canvasImage.length : 0);
            
            // Restore canvas size
            this.canvas.width = state.canvasWidth || 800;
            this.canvas.height = state.canvasHeight || 600;
            
            // Load the saved image
            if (state.canvasImage && state.canvasImage.length > 20000) {
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                    console.log('✓ Canvas restored!');
                    
                    // Also update layer canvas
                    this.layers[0].canvas.width = this.canvas.width;
                    this.layers[0].canvas.height = this.canvas.height;
                    const layerCtx = this.layers[0].canvas.getContext('2d');
                    layerCtx.drawImage(img, 0, 0);
                };
                img.onerror = () => {
                    console.error('Failed to load saved image');
                };
                img.src = state.canvasImage;
            } else {
                console.log('No valid image data to restore (data too small)');
            }

            // Restore settings
            this.currentLayer = state.currentLayer || 0;
            this.zoom = state.zoom || 1;
            this.color = state.color || '#000000';
            this.brushSize = state.brushSize || 5;
            this.currentTool = state.currentTool || 'brush';
            
            // Restore history
            if (state.history && state.history.length > 0) {
                this.history = state.history;
                this.historyStep = state.historyStep || this.history.length - 1;
                console.log('✓ Restored', this.history.length, 'history items');
            }

            document.getElementById('colorPicker').value = this.color;
            document.getElementById('brushSize').value = this.brushSize;
            document.getElementById('sizeLabel').textContent = this.brushSize + 'px';

            setTimeout(() => {
                this.applyZoom();
                this.updateLayersList();
                this.updateHistoryList();
                
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.tool === this.currentTool) {
                        btn.classList.add('active');
                    }
                });
            }, 100);
        } catch (e) {
            console.error('✗ Load failed:', e);
        }
    }

    setupTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = parseInt(e.target.dataset.tab);
                this.switchTab(tabId);
            });
        });
    }

    addTab() {
        const newId = this.tabs.length;
        this.saveTabState();
        
        this.tabs.push({
            id: newId,
            name: `Canvas ${newId + 1}`,
            layers: null,
            history: null,
            historyStep: -1
        });
        
        this.layers = [{ id: 0, canvas: this.createCanvas(), visible: true, name: 'Layer 1' }];
        this.currentLayer = 0;
        this.history = [];
        this.historyStep = -1;
        this.originalImage = null;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderLayers();
        this.updateLayersList();
        this.updateTabsList();
        this.switchTab(newId);
    }

    switchTab(tabId) {
        this.saveTabState();
        this.currentTab = tabId;
        
        const tab = this.tabs[tabId];
        if (tab.layers) {
            this.layers = tab.layers;
            this.history = tab.history;
            this.historyStep = tab.historyStep;
        } else {
            this.layers = [{ id: 0, canvas: this.createCanvas(), visible: true, name: 'Layer 1' }];
            this.history = [];
            this.historyStep = -1;
        }
        
        this.currentLayer = 0;
        this.renderLayers();
        this.updateLayersList();
        this.updateTabsList();
    }

    saveTabState() {
        const tab = this.tabs[this.currentTab];
        tab.layers = this.layers;
        tab.history = this.history;
        tab.historyStep = this.historyStep;
    }

    updateTabsList() {
        const tabsContainer = document.querySelector('.tabs');
        const addBtn = document.createElement('button');
        addBtn.className = 'add-tab';
        addBtn.textContent = '+';
        addBtn.onclick = () => this.addTab();
        
        tabsContainer.innerHTML = '';
        
        this.tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.id === this.currentTab ? 'active' : ''}`;
            tabEl.dataset.tab = tab.id;
            tabEl.textContent = tab.name;
            tabEl.onclick = () => this.switchTab(tab.id);
            tabsContainer.appendChild(tabEl);
        });
        
        tabsContainer.appendChild(addBtn);
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 3);
        this.applyZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.1);
        this.applyZoom();
    }

    resetZoom() {
        this.zoom = 1;
        this.applyZoom();
    }

    applyZoom() {
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / this.zoom,
            y: (e.clientY - rect.top) / this.zoom
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;

        if (this.currentTool === 'crop' && this.cropSelection) {
            const sel = this.cropSelection;
            if (pos.x >= sel.x && pos.x <= sel.x + sel.width && 
                pos.y >= sel.y && pos.y <= sel.y + sel.height) {
                this.isDraggingCrop = true;
                this.cropDragStartX = pos.x - sel.x;
                this.cropDragStartY = pos.y - sel.y;
                return;
            }
        }

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.drawPoint(pos.x, pos.y);
        } else if (this.currentTool === 'fill') {
            this.floodFill(pos.x, pos.y);
            this.isDrawing = false;
        } else if (this.currentTool === 'text') {
            const text = prompt('Enter text:');
            if (text) this.drawText(text, pos.x, pos.y);
            this.isDrawing = false;
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getMousePos(e);
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');

        if (this.currentTool === 'crop' && this.isDraggingCrop) {
            this.cropSelection.x = pos.x - this.cropDragStartX;
            this.cropSelection.y = pos.y - this.cropDragStartY;
            this.drawCropOverlay();
            return;
        }

        if (this.currentTool === 'brush') {
            layerCtx.strokeStyle = this.color;
            layerCtx.lineWidth = this.brushSize;
            layerCtx.lineCap = 'round';
            layerCtx.beginPath();
            layerCtx.moveTo(this.startX, this.startY);
            layerCtx.lineTo(pos.x, pos.y);
            layerCtx.stroke();
            this.startX = pos.x;
            this.startY = pos.y;
            this.renderLayers();
        } else if (this.currentTool === 'eraser') {
            layerCtx.globalCompositeOperation = 'destination-out';
            layerCtx.beginPath();
            layerCtx.arc(pos.x, pos.y, this.brushSize, 0, Math.PI * 2);
            layerCtx.fill();
            layerCtx.globalCompositeOperation = 'source-over';
            this.renderLayers();
        } else if (this.currentTool === 'crop') {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.cropSelection = {
                x: this.startX,
                y: this.startY,
                width: width,
                height: height
            };
            this.drawCropOverlay();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.isDraggingCrop = false;

        const pos = { x: this.startX, y: this.startY };
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');

        if (this.currentTool === 'crop') {
            if (this.cropSelection && Math.abs(this.cropSelection.width) > 10 && Math.abs(this.cropSelection.height) > 10) {
                this.showCropControls();
            }
            return;
        }

        if (this.currentTool === 'rect') {
            const width = event.clientX - this.canvas.getBoundingClientRect().left - this.startX * this.zoom;
            const height = event.clientY - this.canvas.getBoundingClientRect().top - this.startY * this.zoom;
            layerCtx.strokeStyle = this.color;
            layerCtx.lineWidth = this.brushSize;
            layerCtx.strokeRect(this.startX, this.startY, width / this.zoom, height / this.zoom);
        } else if (this.currentTool === 'circle') {
            const endX = (event.clientX - this.canvas.getBoundingClientRect().left) / this.zoom;
            const endY = (event.clientY - this.canvas.getBoundingClientRect().top) / this.zoom;
            const radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
            layerCtx.strokeStyle = this.color;
            layerCtx.lineWidth = this.brushSize;
            layerCtx.beginPath();
            layerCtx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
            layerCtx.stroke();
        } else if (this.currentTool === 'line') {
            const endX = (event.clientX - this.canvas.getBoundingClientRect().left) / this.zoom;
            const endY = (event.clientY - this.canvas.getBoundingClientRect().top) / this.zoom;
            layerCtx.strokeStyle = this.color;
            layerCtx.lineWidth = this.brushSize;
            layerCtx.beginPath();
            layerCtx.moveTo(this.startX, this.startY);
            layerCtx.lineTo(endX, endY);
            layerCtx.stroke();
        }

        this.renderLayers();
        this.saveState();
        this.saveToLocalStorage();
    }

    drawCropOverlay() {
        this.renderLayers();
        const sel = this.cropSelection;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.clearRect(sel.x, sel.y, sel.width, sel.height);
        this.renderLayers();
        
        this.ctx.strokeStyle = '#0078d4';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
        this.ctx.setLineDash([]);
    }

    showCropControls() {
        document.getElementById('cropControls').style.display = 'flex';
        this.drawCropOverlay();
    }

    applyCropSelection() {
        const sel = this.cropSelection;
        const left = Math.min(sel.x, sel.x + sel.width);
        const top = Math.min(sel.y, sel.y + sel.height);
        const width = Math.abs(sel.width);
        const height = Math.abs(sel.height);

        this.layers.forEach(layer => {
            const oldCanvas = layer.canvas;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(oldCanvas, left, top, width, height, 0, 0, width, height);
            layer.canvas = tempCanvas;
        });

        this.canvas.width = width;
        this.canvas.height = height;
        this.cancelCrop();
        this.renderLayers();
        this.saveState();
    }

    cancelCrop() {
        this.cropSelection = null;
        document.getElementById('cropControls').style.display = 'none';
        this.renderLayers();
    }

    drawPoint(x, y) {
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        layerCtx.fillStyle = this.color;
        layerCtx.beginPath();
        layerCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        layerCtx.fill();
        this.renderLayers();
    }

    drawText(text, x, y) {
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        layerCtx.font = `${this.brushSize * 4}px Arial`;
        layerCtx.fillStyle = this.color;
        layerCtx.fillText(text, x, y);
        this.renderLayers();
        this.saveState();
    }

    floodFill(x, y) {
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        const imageData = layerCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const targetColor = this.getPixel(imageData, x, y);
        const fillColor = this.hexToRgb(this.color);
        
        if (this.colorsMatch(targetColor, fillColor)) return;
        
        const stack = [[x, y]];
        while (stack.length) {
            const [cx, cy] = stack.pop();
            if (cx < 0 || cx >= this.canvas.width || cy < 0 || cy >= this.canvas.height) continue;
            
            const currentColor = this.getPixel(imageData, cx, cy);
            if (!this.colorsMatch(currentColor, targetColor)) continue;
            
            this.setPixel(imageData, cx, cy, fillColor);
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        
        layerCtx.putImageData(imageData, 0, 0);
        this.renderLayers();
        this.saveState();
    }

    getPixel(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return [imageData.data[index], imageData.data[index + 1], imageData.data[index + 2], imageData.data[index + 3]];
    }

    setPixel(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color[0];
        imageData.data[index + 1] = color[1];
        imageData.data[index + 2] = color[2];
        imageData.data[index + 3] = 255;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255] : null;
    }

    colorsMatch(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }

    renderLayers() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.layers.forEach(layer => {
            if (layer.visible && layer.canvas) {
                this.ctx.drawImage(layer.canvas, 0, 0);
            }
        });
    }

    addLayer() {
        const newLayer = {
            id: this.layers.length,
            canvas: this.createCanvas(),
            visible: true,
            name: `Layer ${this.layers.length + 1}`
        };
        this.layers.push(newLayer);
        this.currentLayer = this.layers.length - 1;
        this.updateLayersList();
        this.saveState();
    }

    updateLayersList() {
        const list = document.getElementById('layersList');
        list.innerHTML = '';
        this.layers.slice().reverse().forEach((layer, index) => {
            const actualIndex = this.layers.length - 1 - index;
            const div = document.createElement('div');
            div.className = `layer-item ${actualIndex === this.currentLayer ? 'active' : ''}`;
            div.innerHTML = `
                <span>${layer.name}</span>
                <button onclick="editor.deleteLayer(${actualIndex})">×</button>
            `;
            div.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    this.currentLayer = actualIndex;
                    this.updateLayersList();
                }
            };
            list.appendChild(div);
        });
    }

    deleteLayer(index) {
        if (this.layers.length === 1) return alert('Cannot delete the last layer');
        this.layers.splice(index, 1);
        this.currentLayer = Math.min(this.currentLayer, this.layers.length - 1);
        this.updateLayersList();
        this.renderLayers();
        this.saveState();
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 1200;
                const maxHeight = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                // Resize canvas
                this.canvas.width = width;
                this.canvas.height = height;
                
                // Draw directly to main canvas
                this.ctx.drawImage(img, 0, 0, width, height);
                console.log('Image drawn to main canvas');
                
                // Also update layer canvas
                this.layers.forEach(layer => {
                    layer.canvas.width = width;
                    layer.canvas.height = height;
                });
                const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
                layerCtx.drawImage(img, 0, 0, width, height);
                
                // Save original for filters
                this.saveOriginalImage();
                
                // Save to localStorage after a short delay
                setTimeout(() => {
                    this.saveState();
                    this.saveToLocalStorage();
                }, 200);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    saveOriginalImage() {
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        this.originalImage = layerCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    applyFilters() {
        if (!this.originalImage) {
            this.saveOriginalImage();
        }
        
        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        const originalData = new ImageData(
            new Uint8ClampedArray(this.originalImage.data),
            this.originalImage.width,
            this.originalImage.height
        );
        
        const data = originalData.data;
        const brightness = parseInt(document.getElementById('brightness').value);
        const contrast = parseInt(document.getElementById('contrast').value);
        const saturation = parseInt(document.getElementById('saturation').value);

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i + 1], b = data[i + 2];

            r += brightness;
            g += brightness;
            b += brightness;

            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            const satFactor = saturation / 100;
            r = gray + (r - gray) * (1 + satFactor);
            g = gray + (g - gray) * (1 + satFactor);
            b = gray + (b - gray) * (1 + satFactor);

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        layerCtx.putImageData(originalData, 0, 0);
        
        const blur = parseInt(document.getElementById('blur').value);
        if (blur > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.filter = `blur(${blur}px)`;
            tempCtx.drawImage(this.layers[this.currentLayer].canvas, 0, 0);
            layerCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            layerCtx.drawImage(tempCanvas, 0, 0);
        }

        this.renderLayers();
    }

    resetFilters() {
        document.getElementById('brightness').value = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('saturation').value = 0;
        document.getElementById('blur').value = 0;
        
        if (this.originalImage) {
            const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
            layerCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            layerCtx.putImageData(this.originalImage, 0, 0);
            this.renderLayers();
        }
    }

    commitFilters() {
        this.saveOriginalImage();
        this.saveState();
    }

    applyPresetFilter(filterName) {
        if (!this.originalImage) {
            this.saveOriginalImage();
        }

        const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
        const imageData = layerCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
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
        }

        layerCtx.putImageData(imageData, 0, 0);
        this.renderLayers();
    }

    clearCanvas() {
        if (confirm('Clear current layer?')) {
            const layerCtx = this.layers[this.currentLayer].canvas.getContext('2d');
            layerCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.renderLayers();
            this.saveState();
        }
    }

    saveState() {
        this.historyStep++;
        this.history = this.history.slice(0, this.historyStep);
        this.history.push({
            data: this.layers.map(layer => layer.canvas.toDataURL()),
            action: this.getLastAction()
        });
        if (this.history.length > 50) this.history.shift();
        this.updateHistoryList();
        
        // Save to localStorage after state change
        setTimeout(() => this.saveToLocalStorage(), 100);
    }

    getLastAction() {
        const actions = {
            brush: 'Brush Stroke',
            eraser: 'Erase',
            rect: 'Rectangle',
            circle: 'Circle',
            line: 'Line',
            text: 'Text',
            fill: 'Fill',
            select: 'Selection',
            crop: 'Crop',
            transform: 'Transform',
            'history-brush': 'History Brush'
        };
        return actions[this.currentTool] || 'Action';
    }

    updateHistoryList() {
        const list = document.getElementById('historyList');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = `history-item ${index === this.historyStep ? 'active' : ''}`;
            item.textContent = `${index + 1}. ${state.action || 'State'}`;
            item.onclick = () => {
                console.log('Jumping to history state', index);
                this.goToHistoryState(index);
            };
            list.appendChild(item);
        });
        
        list.scrollTop = list.scrollHeight;
    }

    goToHistoryState(index) {
        if (index < 0 || index >= this.history.length) return;
        
        this.historyStep = index;
        this.restoreState(this.history[index].data);
        this.updateHistoryList();
        
        // Save after restoring
        setTimeout(() => this.saveToLocalStorage(), 200);
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep].data);
            this.updateHistoryList();
            setTimeout(() => this.saveToLocalStorage(), 200);
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep].data);
            this.updateHistoryList();
            setTimeout(() => this.saveToLocalStorage(), 200);
        }
    }

    restoreState(state) {
        state.forEach((dataUrl, index) => {
            if (this.layers[index]) {
                const img = new Image();
                img.onload = () => {
                    const layerCtx = this.layers[index].canvas.getContext('2d');
                    layerCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    layerCtx.drawImage(img, 0, 0);
                    this.renderLayers();
                };
                img.src = dataUrl;
            }
        });
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'photo-editor-export.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    testDraw() {
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(50, 50, 200, 200);
        console.log('Drew red square');
        
        // Also draw to layer
        const layerCtx = this.layers[0].canvas.getContext('2d');
        layerCtx.fillStyle = 'red';
        layerCtx.fillRect(50, 50, 200, 200);
        
        setTimeout(() => {
            this.saveToLocalStorage();
            console.log('Saved after drawing');
        }, 200);
    }
}

const editor = new PhotoEditor();


// Extended methods for advanced filters
PhotoEditor.prototype.applyFilters = function() {
    applyAdvancedFilters(this);
};

PhotoEditor.prototype.applyPresetFilter = function(filterName) {
    applyPresetFilters(this, filterName);
};

PhotoEditor.prototype.autoEnhance = function() {
    autoEnhance(this);
};

PhotoEditor.prototype.autoContrast = function() {
    autoContrast(this);
};

PhotoEditor.prototype.autoColor = function() {
    autoColor(this);
};
