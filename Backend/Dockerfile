FROM node:18-slim

# Install system dependencies required by tfjs-node + canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the source code
COPY . .

# Expose API port (make sure this matches the port in server.js, probably 8080)
EXPOSE 8080

# Start backend using npm start
CMD ["npm", "start"]
