FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi==0.119.0 uvicorn==0.37.0 'huggingface-hub>=1,<3'
COPY protocol.py receipt_server.py receipt.html ./
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user
ENV HOME=/home/user
CMD ["uvicorn","receipt_server:app","--host","0.0.0.0","--port","7860","--workers","1"]
