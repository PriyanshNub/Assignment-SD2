from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont
import io
import json
import os
import urllib.request

app = FastAPI()

FONT_PATH = "/tmp/Roboto-Black.ttf"

def get_font(size):
    if not os.path.exists(FONT_PATH):
        try:
            url = "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Black.ttf"
            urllib.request.urlretrieve(url, FONT_PATH)
        except Exception:
            pass
    try:
        return ImageFont.truetype(FONT_PATH, int(size))
    except Exception:
        return ImageFont.load_default()

@app.post("/api/generate")
async def generate_meme(
    image: UploadFile = File(...),
    texts: str = Form(...)  # Expected JSON string: [{"text": "Hello", "x": 100, "y": 100, "size": 40, "color": "#FFFFFF"}]
):
    try:
        img_bytes = await image.read()
        # Ensure RGBA for drawing, then composite to RGB if JPEG is needed
        img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        draw = ImageDraw.Draw(img)
        
        text_data = json.loads(texts)
        
        for item in text_data:
            text = item.get("text", "")
            if not text:
                continue
            
            x = int(float(item.get("x", 0)))
            y = int(float(item.get("y", 0)))
            size = int(float(item.get("size", 40)))
            color = item.get("color", "#FFFFFF")
            
            font = get_font(size)
            
            stroke_width = max(1, size // 15)
            stroke_color = "black"
            
            draw.text((x, y), text, font=font, fill=color, stroke_width=stroke_width, stroke_fill=stroke_color)

        # Convert back to RGB for JPEG format output
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
            
        out_io = io.BytesIO()
        img.save(out_io, format="JPEG", quality=95)
        out_io.seek(0)

        return Response(content=out_io.getvalue(), media_type="image/jpeg")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
