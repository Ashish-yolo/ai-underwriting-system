FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application directly with ts-node (no build step needed)
CMD ["npx", "ts-node", "src/server.ts"]
