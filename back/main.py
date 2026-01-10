from io import BytesIO
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageDraw, ImageFont

app = FastAPI(title="Simple Image Processing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev server
        "http://127.0.0.1:3000",      # альтернативный адрес
        "http://localhost:8000",      # сам бэкенд (для Swagger)
        "http://127.0.0.1:8000",      # альтернативный адрес бэкенда
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Разрешить все HTTP методы
    allow_headers=["*"],              # Разрешить все заголовки
)

def process_image(img: Image.Image) -> Image.Image:
    """
    Симулируем обработку:
    - чуть увеличиваем контраст и резкость
    - рисуем полупрозрачный штамп с временем
    """
    # Приводим к RGB (на случай PNG с альфой / палитрой)
    img = img.convert("RGB")

    # "обработка"
    img = ImageEnhance.Contrast(img).enhance(1.15)
    img = ImageEnhance.Sharpness(img).enhance(1.2)

    # Штамп
    draw = ImageDraw.Draw(img)
    text = f"processed {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"

    # Pillow может не иметь системных шрифтов — используем дефолтный
    font = ImageFont.load_default()

    padding = 8
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    x = img.width - text_w - padding * 2
    y = img.height - text_h - padding * 2

    # Подложка
    draw.rectangle(
        [x, y, img.width, img.height],
        fill=(0, 0, 0),
    )
    # Текст
    draw.text((x + padding, y + padding), text, fill=(255, 255, 255), font=font)

    return img


@app.post("/process", summary="Upload an image and get processed image back")
async def process(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    try:
        raw = await file.read()
        img = Image.open(BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    out_img = process_image(img)

    buf = BytesIO()
    out_img.save(buf, format="JPEG", quality=90)
    result_bytes = buf.getvalue()

    return Response(
        content=result_bytes,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": 'inline; filename="processed.jpg"'
        },
    )