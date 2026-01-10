FROM pytorch/pytorch:2.9.1-cuda12.6-cudnn9-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .

# (Опционально) базовые пакеты, которые часто нужны для сборки/установки зависимостей
# RUN apt-get update && apt-get install -y --no-install-recommends \
#       ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

# PyTorch CPU wheels из официального репозитория PyTorch
# При необходимости можно пиновать версии: torch==X.Y.Z torchvision==... torchaudio==...
RUN python -m pip install --upgrade pip && \
    python -m pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
