FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Pass the production backend address for VITE build
ARG VITE_API_URL=https://group-h-cinema-system-git-group-h-rio-cinme-app.2.rahtiapp.fi
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Runtime phase: use the light weight `serve` to host the static files in `dist`
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
