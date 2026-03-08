const imageUpload = document.getElementById('image-upload');
const canvas = document.getElementById('meme-canvas');
const ctx = canvas.getContext('2d');
const textBlocksContainer = document.getElementById('text-blocks-container');
const addTextBtn = document.getElementById('add-text-btn');
const downloadBtn = document.getElementById('download-btn');
const placeholder = document.getElementById('placeholder-text');

let uploadedImage = null;
let textBlocks = [];
let nextBlockId = 1;

// Initialize first text block
function init() {
    addTextBlock('WHEN THE CODE WORKS', 50, 10);
    renderMeme();
}

function addTextBlock(defaultText = '', defX = 50, defY = 50) {
    const id = nextBlockId++;
    const isFirst = textBlocks.length === 0;
    
    const block = {
        id,
        text: defaultText,
        x: defX,
        y: defY,
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 3,
        fontSize: 10,
        active: isFirst
    };
    
    if(isFirst) {
        textBlocks.forEach(b => b.active = false);
        block.active = true;
    }

    textBlocks.push(block);
    renderBlocksUI();
    renderMeme();
}

function deleteTextBlock(id) {
    textBlocks = textBlocks.filter(b => b.id !== id);
    if(textBlocks.length > 0 && !textBlocks.some(b => b.active)) {
        textBlocks[0].active = true;
    }
    renderBlocksUI();
    renderMeme();
}

function setActiveBlock(id) {
    textBlocks.forEach(b => b.active = (b.id === id));
    renderBlocksUI();
}

function renderBlocksUI() {
    textBlocksContainer.innerHTML = '';
    
    textBlocks.forEach((block, index) => {
        const div = document.createElement('div');
        div.className = `text-block ${block.active ? 'active' : ''}`;
        
        div.innerHTML = `
            <div class="text-block-header">
                <label>
                    <input type="radio" name="active_block" value="${block.id}" ${block.active ? 'checked' : ''}>
                    Text ${index + 1}
                </label>
                <button class="delete-btn" onclick="deleteTextBlock(${block.id})">🗑️</button>
            </div>
            <input type="text" value="${block.text}" placeholder="Enter text..." oninput="updateBlockStyle(${block.id}, 'text', this.value)">
            <div class="sliders">
                <label>X (%) <input type="range" min="0" max="100" value="${block.x}" oninput="updateBlockStyle(${block.id}, 'x', this.value)"></label>
                <label>Y (%) <input type="range" min="0" max="100" value="${block.y}" oninput="updateBlockStyle(${block.id}, 'y', this.value)"></label>
            </div>
            <div class="advanced-styling" style="margin-top: 10px;">
                <details>
                    <summary>🎨 Advanced Styling</summary>
                    <div class="style-controls">
                        <label>Color <input type="color" value="${block.color}" oninput="updateBlockStyle(${block.id}, 'color', this.value)"></label>
                        <label>Outline Outline <input type="color" value="${block.strokeColor}" oninput="updateBlockStyle(${block.id}, 'strokeColor', this.value)"></label>
                        <label>Outline Thickness <input type="range" min="0" max="10" value="${block.strokeWidth}" oninput="updateBlockStyle(${block.id}, 'strokeWidth', this.value)"></label>
                        <label>Font Size (%) <input type="range" min="5" max="30" value="${block.fontSize}" oninput="updateBlockStyle(${block.id}, 'fontSize', this.value)"></label>
                    </div>
                </details>
            </div>
        `;
        
        const radio = div.querySelector('input[type="radio"]');
        radio.addEventListener('change', () => setActiveBlock(block.id));
        
        textBlocksContainer.appendChild(div);
    });
}

window.updateBlockStyle = (id, property, val) => {
    const b = textBlocks.find(x => x.id === id);
    if(b) {
        if (['x', 'y', 'strokeWidth', 'fontSize'].includes(property)) {
            b[property] = parseInt(val);
        } else {
            b[property] = val;
        }
    }
    renderMeme();
};

window.deleteTextBlock = deleteTextBlock;

addTextBtn.addEventListener('click', () => addTextBlock('', 50, 50));

// Image Upload
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                uploadedImage = img;
                canvas.style.display = 'block';
                placeholder.style.display = 'none';
                downloadBtn.disabled = false;
                renderMeme();
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Canvas Click to place
canvas.addEventListener('click', function(e) {
    const activeBlock = textBlocks.find(b => b.active);
    if (!activeBlock || !uploadedImage) return;

    // Calculate click coordinates relative to the canvas internal resolution
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    activeBlock.x = Math.round((clickX / canvas.width) * 100);
    activeBlock.y = Math.round((clickY / canvas.height) * 100);
    
    renderBlocksUI(); // update sliders
    renderMeme();
});

// Render logic

function renderMeme() {
    if (!uploadedImage) return;

    // Set canvas dimensions to match image
    canvas.width = uploadedImage.width;
    canvas.height = uploadedImage.height;

    // Draw background image
    ctx.drawImage(uploadedImage, 0, 0);

    // Draw texts
    textBlocks.forEach(block => {
        if(!block.text) return;
        
        const text = block.text.toUpperCase();
        
        // Block specific settings
        const fontSizePct = parseInt(block.fontSize || 10);
        const fontSize = Math.floor(canvas.height * (fontSizePct / 100));
        ctx.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;
        ctx.fillStyle = block.color || '#ffffff';
        ctx.strokeStyle = block.strokeColor || '#000000';
        ctx.lineWidth = parseInt(block.strokeWidth || 3);
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Measure text for accurate centering
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        
        // Center text on target X coordinate
        const targetX = (block.x / 100) * canvas.width;
        
        // Boundaries to prevent cutting off text
        const safeX = Math.max(textWidth / 2 + 10, Math.min(targetX, canvas.width - textWidth / 2 - 10));
        const y = (block.y / 100) * canvas.height;

        // Draw outline then fill
        if (ctx.lineWidth > 0) {
            ctx.strokeText(text, safeX, y);
        }
        ctx.fillText(text, safeX, y);
    });
}

// API Call to generated Meme image
downloadBtn.addEventListener('click', async () => {
    if(!uploadedImage) return;
    
    // Create form data payload to send to our Flask/Vercel server
    const formData = new FormData();
    const fileInput = document.getElementById('image-upload');
    if (fileInput.files.length === 0) return;
    
    formData.append('image', fileInput.files[0]);
    formData.append('text_blocks', JSON.stringify(textBlocks));

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Preparing...';
        
        // Define endpoint properly in both local development and Vercel environments
        const backendEndpoint = window.location.hostname === 'localhost' ? 'http://localhost:5000/api/generate' : '/api/generate';
        
        const response = await fetch(backendEndpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to generate meme');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'emergent_vibe_meme.png';
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
        alert('There was an issue generating your meme. Please try again.');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '🚀 Download Meme';
    }
});

// Start
init();
