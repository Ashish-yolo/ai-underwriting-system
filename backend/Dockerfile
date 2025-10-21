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

# Start application directly with ts-node (skip type checking)
CMD ["npx", "ts-node", "--transpile-only", "src/server.ts"]
