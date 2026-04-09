# Backend Docker image for the vulnerable ecommerce API service.
# Use a lightweight Node.js 20 base image.
FROM node:20-alpine
# Set the working directory inside the container.
WORKDIR /app
# Copy package manifests first for dependency installation.
COPY package*.json ./
# Install backend dependencies.
RUN npm install
# Copy the full backend source code into the container.
COPY . .
# Document the backend API port used by the app.
EXPOSE 5000
# Start the backend server using the package start script.
CMD ["npm", "start"]