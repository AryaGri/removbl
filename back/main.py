import os
from io import BytesIO

import numpy as np
from PIL import Image

import torch
import torchvision.transforms.v2 as T
from torchvision.transforms import InterpolationMode

import segmentation_models_pytorch as smp

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware


CKPT_PATH = os.environ.get("CKPT_PATH", "best_unet_resnet34.pt")
IMG_SIZE = int(os.environ.get("IMG_SIZE", "320"))

app = FastAPI(title="Background Removal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[Info] device = {device}")

img_tf = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE), interpolation=InterpolationMode.BILINEAR),
    T.ToImage(),
    T.ToDtype(torch.float32, scale=True),
])

model = None


def load_model() -> torch.nn.Module:
    if not os.path.exists(CKPT_PATH):
        raise FileNotFoundError(f"Checkpoint not found: {CKPT_PATH}")

    m = smp.Unet(
        encoder_name="resnet34",
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
    ).to(device)

    ckpt = torch.load(CKPT_PATH, map_location=device)
    if isinstance(ckpt, dict) and "model_state" in ckpt:
        m.load_state_dict(ckpt["model_state"])
    else:
        m.load_state_dict(ckpt)

    m.eval()
    return m


@torch.no_grad()
def predict_alpha_u8(img_rgb: Image.Image) -> np.ndarray:
    x = img_tf(img_rgb).unsqueeze(0).to(device)
    logits = model(x)
    prob = torch.sigmoid(logits)[0, 0].detach().cpu().numpy()

    alpha_small = (prob * 255.0).clip(0, 255).astype(np.uint8)
    alpha = np.array(
        Image.fromarray(alpha_small, mode="L").resize(img_rgb.size, resample=Image.BILINEAR)
    )
    return alpha


def make_cutout_png(img_rgb: Image.Image, alpha_u8: np.ndarray) -> bytes:
    rgba = img_rgb.convert("RGB").copy()
    rgba.putalpha(Image.fromarray(alpha_u8, mode="L"))
    buf = BytesIO()
    rgba.save(buf, format="PNG")
    return buf.getvalue()


@app.on_event("startup")
def _startup():
    global model
    model = load_model()
    print("[Info] model loaded")


@app.get("/health")
def health():
    return {"status": "ok", "device": str(device), "img_size": IMG_SIZE}


@app.post("/process")
async def process(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    try:
        raw = await file.read()
        img = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    try:
        alpha = predict_alpha_u8(img)
        out_png = make_cutout_png(img, alpha)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    return Response(
        content=out_png,
        media_type="image/png",
        headers={"Content-Disposition": 'inline; filename="cutout.png"'},
    )
