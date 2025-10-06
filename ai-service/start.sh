#!/bin/bash

# AI Background Removal Service Startup Script

echo "Starting AI Background Removal Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if model exists
if [ ! -f "models/rmbg-1.4.onnx" ]; then
    echo "Warning: RMBG-1.4 model not found at models/rmbg-1.4.onnx"
    echo "Please download the model from: https://huggingface.co/briaai/RMBG-1.4"
    echo "Service will use fallback method until model is available."
fi

# Start the service
echo "Starting FastAPI service on port 8001..."
python src/main.py
