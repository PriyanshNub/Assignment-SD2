from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
import io
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/generate', methods=['POST'])
def generate_meme():
    try:
        # Check if an image is provided
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        file = request.files['image']
        
        # Get data from request
        try:
            text_blocks = json.loads(request.form.get('text_blocks', '[]'))
        except json.JSONDecodeError:
            text_blocks = []

        # Open image
        image = Image.open(file.stream).convert("RGBA")
        img_w, img_h = image.size
        draw = ImageDraw.Draw(image)
        
        # Draw blocks
        for block in text_blocks:
            text = block.get('text', '').upper()
            if not text:
                continue
            
            # Extract block-specific styles
            font_size_pct = int(block.get('fontSize', 10))
            text_color = block.get('color', '#FFFFFF')
            stroke_color = block.get('strokeColor', '#000000')
            stroke_width = int(block.get('strokeWidth', 3))
            
            font_size = int(img_h * (font_size_pct / 100.0))
            
            # Load font for this specific size
            try:
                import os
                font_path = os.path.join(os.path.dirname(__file__), "Anton-Regular.ttf")
                font = ImageFont.truetype(font_path, font_size)
            except OSError:
                try:
                    # Windows fallback
                    font = ImageFont.truetype("arialbd.ttf", font_size)
                except OSError:
                    font = ImageFont.load_default()

            target_x = (block.get('x', 50) / 100.0) * img_w
            y = (block.get('y', 50) / 100.0) * img_h
            
            try:
                # Pillow anchor="ma" means middle-top alignment
                if stroke_width > 0:
                    draw.text((target_x, y), text, font=font, fill=text_color, 
                              stroke_width=stroke_width, stroke_fill=stroke_color, anchor="ma")
                else:
                    draw.text((target_x, y), text, font=font, fill=text_color, anchor="ma")
            except TypeError:
                # Old Pillow fallback
                try:
                    bbox = font.getbbox(text)
                    text_w = bbox[2] - bbox[0]
                except AttributeError:
                    text_w = int(draw.textlength(text, font=font)) if hasattr(draw, 'textlength') else 100
                
                adjusted_x = target_x - (text_w / 2)
                
                if stroke_width > 0:
                    for adj_x in [-stroke_width, 0, stroke_width]:
                        for adj_y in [-stroke_width, 0, stroke_width]:
                            draw.text((adjusted_x + adj_x, y + adj_y), text, font=font, fill=stroke_color)
                
                draw.text((adjusted_x, y), text, font=font, fill=text_color)

        # Convert back to image
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name='meme.png')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return "Meme Generator API is running!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
