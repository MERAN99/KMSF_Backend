# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Create uploads directory (for multer)
RUN mkdir -p uploads

# Expose the port Fly.io will use
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
