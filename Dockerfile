# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend-react/package*.json ./
RUN npm install
COPY frontend-react/ ./
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.12-slim
WORKDIR /code

# Copy Python requirements and install
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the backend code and everything else
COPY . /code

# Copy the built React frontend from Stage 1 into /code/frontend-dist
COPY --from=frontend-builder /app/frontend/dist /code/frontend-dist

# Expose port for Hugging Face Spaces
ENV PORT=7860
EXPOSE 7860

# Command to run uvicorn on Hugging Face Space's default port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
