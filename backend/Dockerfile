FROM python:3.11-slim

# تثبيت ffmpeg و الأدوات الأساسية
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# إعداد مجلد العمل
WORKDIR /app

# نسخ وتثبيت المكتبات
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# نسخ الكود
COPY . .

# Railway بيمرر الـ PORT في متغير بيئة
ENV PORT=8080
EXPOSE 8080

# تشغيل السيرفر
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
