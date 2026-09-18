FROM python:3.10-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application dynamically listening on PORT env var
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
