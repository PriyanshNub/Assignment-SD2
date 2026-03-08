const imageInput = document.getElementById('imageInput');
const memeImage = document.getElementById('memeImage');
const canvasContainer = document.getElementById('canvasContainer');
const addTextBtn = document.getElementById('addTextBtn');
const downloadBtn = document.getElementById('downloadBtn');

const textControls = document.getElementById('textControls');
const textInput = document.getElementById('textInput');
const textSize = document.getElementById('textSize');
const textColor = document.getElementById('textColor');
const deleteTextBtn = document.getElementById('deleteTextBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

let textLayers = [];
let selectedLayer = null;
let currentFile = null;

// Image Upload
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        memeImage.src = event.target.result;
        memeImage.style.display = 'block';
        addTextBtn.disabled = false;
        downloadBtn.disabled = false;
        
        // Clear old text layers
        textLayers.forEach(layer => layer.element.remove());
        textLayers = [];
        selectedLayer = null;
        textControls.style.display = 'none';
    };
    reader.readAsDataURL(file);
});

// Add Text Layer
addTextBtn.addEventListener('click', () => {
    const layer = {
        id: Date.now(),
        text: 'Meme Text',
        x: 50,
        y: 50,
        size: 40,
        color: '#ffffff',
        element: document.createElement('div')
    };
    
    layer.element.className = 'text-layer';
    layer.element.innerText = layer.text;
    updateLayerStyle(layer);
    
    // Dragging logic
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    layer.element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = layer.x;
        initialY = layer.y;
        selectLayer(layer);
        
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        layer.x = initialX + dx;
        layer.y = initialY + dy;
        
        updateLayerStyle(layer);
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Touch support (mobile)
    layer.element.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialX = layer.x;
        initialY = layer.y;
        selectLayer(layer);
        e.stopPropagation();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        layer.x = initialX + dx;
        layer.y = initialY + dy;
        updateLayerStyle(layer);
    }, {passive: false});
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    canvasContainer.appendChild(layer.element);
    textLayers.push(layer);
    selectLayer(layer);
});

// Deselect on clicking anywhere else in the container
canvasContainer.addEventListener('mousedown', (e) => {
    // We handle pointer-events:none on memeImage, so e.target will be canvasContainer
    if (e.target === canvasContainer) {
        selectLayer(null);
    }
});

function selectLayer(layer) {
    if (selectedLayer) {
        selectedLayer.element.classList.remove('selected');
    }
    selectedLayer = layer;
    
    if (layer) {
        layer.element.classList.add('selected');
        textControls.style.display = 'flex';
        textInput.value = layer.text;
        textSize.value = layer.size;
        textColor.value = layer.color;
    } else {
        textControls.style.display = 'none';
    }
}

function updateLayerStyle(layer) {
    layer.element.style.left = `${layer.x}px`;
    layer.element.style.top = `${layer.y}px`;
    layer.element.style.fontSize = `${layer.size}px`;
    layer.element.style.color = layer.color;
    layer.element.innerText = layer.text;
}

textInput.addEventListener('input', (e) => {
    if (selectedLayer) {
        selectedLayer.text = e.target.value;
        updateLayerStyle(selectedLayer);
    }
});

textSize.addEventListener('input', (e) => {
    if (selectedLayer) {
        selectedLayer.size = parseInt(e.target.value);
        updateLayerStyle(selectedLayer);
    }
});

textColor.addEventListener('input', (e) => {
    if (selectedLayer) {
        selectedLayer.color = e.target.value;
        updateLayerStyle(selectedLayer);
    }
});

deleteTextBtn.addEventListener('click', () => {
    if (selectedLayer) {
        selectedLayer.element.remove();
        textLayers = textLayers.filter(l => l.id !== selectedLayer.id);
        selectLayer(null);
    }
});

downloadBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    // Deselect to hide selection border
    selectLayer(null);
    
    loadingOverlay.style.display = 'flex';
    
    // Calculate scaling to translate coords
    const imageRect = memeImage.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    
    const imgLeftInContainer = imageRect.left - containerRect.left;
    const imgTopInContainer = imageRect.top - containerRect.top;
    
    const scaleX = memeImage.naturalWidth / imageRect.width;
    const scaleY = memeImage.naturalHeight / imageRect.height;
    
    const mappedTexts = textLayers.map(layer => {
        const xOnImage = layer.x - imgLeftInContainer;
        const yOnImage = layer.y - imgTopInContainer;
        
        return {
            text: layer.text,
            x: xOnImage * scaleX,
            y: yOnImage * scaleY,
            size: layer.size * scaleX,
            color: layer.color
        };
    });
    
    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('texts', JSON.stringify(mappedTexts));
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `meme-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert('Failed to generate meme. Try again later.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});
