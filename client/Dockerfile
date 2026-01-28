# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure devDependencies are installed even if production flags are set
ENV NPM_CONFIG_PRODUCTION=false

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy certificates (must exist - run generate-ssl-cert.sh first)
COPY certs/server.crt /etc/nginx/ssl/server.crt
COPY certs/server.key /etc/nginx/ssl/server.key

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
