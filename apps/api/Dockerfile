# Use Node 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"] 