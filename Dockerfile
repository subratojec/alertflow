# Stage 1: Build the Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build the Go backend and embed frontend
FROM golang:alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
# Copy frontend build output into the Go embed directory
RUN rm -rf cmd/server/ui && mkdir -p cmd/server/ui
COPY --from=frontend-builder /app/dist ./cmd/server/ui/
RUN CGO_ENABLED=0 GOOS=linux go build -o alertflow-server ./cmd/server/main.go

# Stage 3: Runner
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=backend-builder /app/alertflow-server .
EXPOSE 8080
CMD ["./alertflow-server"]
