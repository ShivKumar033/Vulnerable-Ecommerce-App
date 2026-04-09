# Frontend Docker image for the vulnerable ecommerce web client.
# Use a lightweight Node.js 20 base image.
FROM node:20-alpine
# Set the working directory inside the container.
WORKDIR /app
# Copy package manifests first for dependency installation.
COPY package*.json ./
# Install frontend dependencies.
RUN npm install
# Copy the full frontend source code into the container.
COPY . .
# Document the Vite development server port.
EXPOSE 5173
# Start Vite dev server on all interfaces for container access.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]