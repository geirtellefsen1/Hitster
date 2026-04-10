FROM node:22-alpine

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Build client
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server
COPY server/ ./server/

# Serve built client via Express in production
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
