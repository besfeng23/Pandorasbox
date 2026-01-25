#!/bin/bash
echo "Checking GPU visibility for vLLM..."

# Check if nvidia-smi is available
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA Driver found:"
    nvidia-smi
else
    echo "Error: nvidia-smi not found. GPU drivers might not be installed."
    exit 1
fi

# Check Docker GPU support
echo "Checking Docker GPU Runtime..."
if docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi &> /dev/null; then
    echo "Docker GPU runtime confirmed."
else
    echo "Error: Docker cannot access GPU. Install nvidia-container-toolkit."
    exit 1
fi

