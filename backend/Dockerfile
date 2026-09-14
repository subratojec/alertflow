FROM golang:alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o alertflow-server ./cmd/server
EXPOSE 8080
CMD ["./alertflow-server"]
