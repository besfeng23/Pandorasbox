FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies and reinstall only production
RUN npm prune --production

# Expose port
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]

