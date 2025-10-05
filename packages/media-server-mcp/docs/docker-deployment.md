# Docker Deployment Guide

This guide provides comprehensive instructions for deploying media-server-mcp using Docker containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Manual Docker Deployment](#manual-docker-deployment)
- [Configuration](#configuration)
- [Health Monitoring](#health-monitoring)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Performance Tuning](#performance-tuning)
- [Backup and Recovery](#backup-and-recovery)

## Prerequisites

- Docker Engine 20.10+ installed and running
- Docker Compose (optional, for orchestration)
- At least one service configured (Radarr, Sonarr, TMDB, or Plex)
- Basic understanding of Docker concepts

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/wyattjoh/media-server-mcp.git
cd media-server-mcp
```

### 2. Create Environment Configuration

Create a `.env` file with your service configurations:

```bash
# Copy example configuration
cp .env.example .env

# Edit with your settings
nano .env
```

Example `.env` file:

```bash
# Radarr Configuration (optional)
RADARR_URL=http://localhost:7878
RADARR_API_KEY=your-radarr-api-key

# Sonarr Configuration (optional)
SONARR_URL=http://localhost:8989
SONARR_API_KEY=your-sonarr-api-key

# TMDB Configuration (optional)
TMDB_API_KEY=your-tmdb-api-key

# Plex Configuration (optional)
PLEX_URL=http://localhost:32400
PLEX_API_KEY=your-plex-api-key

# Authentication (required for SSE mode)
MCP_AUTH_TOKEN=your-secure-auth-token

# Tool Configuration (optional)
TOOL_PROFILE=default
DEBUG_MODE=false
```

### 3. Start with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f media-server-mcp

# Check status
docker-compose ps
```

### 4. Verify Deployment

```bash
# Check container health
docker-compose exec media-server-mcp curl -s http://localhost:3000/health

# View container logs
docker-compose logs media-server-mcp

# Check volume mounts
docker-compose exec media-server-mcp ls -la /app/logs
```

## Docker Compose Deployment

### docker-compose.yml Configuration

The included `docker-compose.yml` provides a complete deployment configuration:

```yaml
version: '3.8'

services:
  media-server-mcp:
    build: .
    container_name: media-server-mcp
    restart: unless-stopped
    environment:
      - RADARR_URL=${RADARR_URL}
      - RADARR_API_KEY=${RADARR_API_KEY}
      - SONARR_URL=${SONARR_URL}
      - SONARR_API_KEY=${SONARR_API_KEY}
      - TMDB_API_KEY=${TMDB_API_KEY}
      - PLEX_URL=${PLEX_URL}
      - PLEX_API_KEY=${PLEX_API_KEY}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
      - TOOL_PROFILE=${TOOL_PROFILE:-default}
      - DEBUG_MODE=${DEBUG_MODE:-false}
    ports:
      - "3000:3000"  # SSE mode only
    volumes:
      - media-server-mcp-logs:/app/logs
      - media-server-mcp-config:/app/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  media-server-mcp-logs:
    driver: local
  media-server-mcp-config:
    driver: local
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Start with build
docker-compose up -d --build

# View logs
docker-compose logs -f media-server-mcp

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart services
docker-compose restart media-server-mcp

# Scale (if needed)
docker-compose up -d --scale media-server-mcp=2
```

## Manual Docker Deployment

### 1. Build the Image

```bash
# Build from current directory
docker build -t media-server-mcp:latest .

# Build with specific tag
docker build -t media-server-mcp:v1.0.0 .

# Build with build arguments
docker build --build-arg DENO_VERSION=1.40.0 -t media-server-mcp:latest .
```

### 2. Run the Container

#### STDIO Mode (Default)

```bash
docker run -d \
  --name media-server-mcp \
  --env-file .env \
  -v media-server-mcp-logs:/app/logs \
  -v media-server-mcp-config:/app/config \
  media-server-mcp:latest
```

#### SSE Mode

```bash
docker run -d \
  --name media-server-mcp \
  --env-file .env \
  -p 3000:3000 \
  -v media-server-mcp-logs:/app/logs \
  -v media-server-mcp-config:/app/config \
  media-server-mcp:latest --sse
```

#### Custom Configuration

```bash
docker run -d \
  --name media-server-mcp \
  -e RADARR_URL=http://radarr.local:7878 \
  -e RADARR_API_KEY=your-api-key \
  -e TMDB_API_KEY=your-tmdb-key \
  -e MCP_AUTH_TOKEN=your-auth-token \
  -p 3000:3000 \
  -v media-server-mcp-logs:/app/logs \
  -v media-server-mcp-config:/app/config \
  media-server-mcp:latest --sse
```

### 3. Container Management

```bash
# View container status
docker ps

# View container logs
docker logs media-server-mcp

# Follow logs in real-time
docker logs -f media-server-mcp

# Execute commands in container
docker exec -it media-server-mcp sh

# Stop container
docker stop media-server-mcp

# Remove container
docker rm media-server-mcp

# Restart container
docker restart media-server-mcp
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RADARR_URL` | No | - | Radarr service URL |
| `RADARR_API_KEY` | No | - | Radarr API key |
| `SONARR_URL` | No | - | Sonarr service URL |
| `SONARR_API_KEY` | No | - | Sonarr API key |
| `TMDB_API_KEY` | No | - | TMDB API key |
| `PLEX_URL` | No | - | Plex service URL |
| `PLEX_API_KEY` | No | - | Plex API key |
| `MCP_AUTH_TOKEN` | SSE mode | - | Authentication token |
| `TOOL_PROFILE` | No | `default` | Tool configuration profile |
| `DEBUG_MODE` | No | `false` | Enable debug logging |

### Volume Mounts

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `media-server-mcp-logs` | `/app/logs` | Application logs |
| `media-server-mcp-config` | `/app/config` | Configuration files |

### Port Mappings

| Container Port | Host Port | Protocol | Purpose |
|----------------|-----------|----------|---------|
| 3000 | 3000 | TCP | SSE transport mode |

### Tool Profiles

- `default` - Essential discovery and add functionality (18 tools)
- `curator` - Discovery, add, and basic library management (29 tools)
- `maintainer` - Curator tools plus system maintenance (39 tools)
- `power-user` - All functionality except advanced search (63 tools)
- `full` - All available tools (70 tools)

## Health Monitoring

### Health Check Endpoint

```bash
# Check health status
curl http://localhost:3000/health

# Response example
{
  "serverStatus": "healthy",
  "serviceConnections": [
    {
      "service": "radarr",
      "status": "connected",
      "lastCheck": "2024-12-19T10:30:00Z",
      "responseTime": "150ms"
    }
  ],
  "lastCheck": "2024-12-19T10:30:00Z",
  "uptime": "PT2H30M",
  "version": "1.0.0",
  "transportMode": "sse"
}
```

### Container Health Check

```bash
# View container health status
docker inspect media-server-mcp --format='{{.State.Health.Status}}'

# View health check logs
docker inspect media-server-mcp --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# Check health check configuration
docker inspect media-server-mcp --format='{{json .Config.Healthcheck}}'
```

### Monitoring Integration

#### Prometheus Metrics

```bash
# Add to docker-compose.yml for Prometheus monitoring
services:
  media-server-mcp:
    # ... existing configuration ...
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=3000"
      - "prometheus.io/path=/metrics"
```

#### Log Monitoring

```bash
# Configure log driver for external monitoring
services:
  media-server-mcp:
    # ... existing configuration ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check container logs
docker logs media-server-mcp

# Check environment variables
docker exec media-server-mcp env | grep -E "(RADARR|SONARR|TMDB|PLEX)"

# Verify image exists
docker images media-server-mcp

# Check for port conflicts
netstat -tlnp | grep 3000
```

#### Service Connection Failures

```bash
# Test service connectivity from container
docker exec media-server-mcp curl -s http://localhost:3000/status

# Check network connectivity
docker exec media-server-mcp ping -c 3 radarr.local

# Verify API keys
docker exec media-server-mcp env | grep API_KEY
```

#### Volume Mount Issues

```bash
# Verify volume mounts
docker inspect media-server-mcp --format='{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}}){{"\n"}}{{end}}'

# Check volume contents
docker exec media-server-mcp ls -la /app/logs
docker exec media-server-mcp ls -la /app/config

# Create volumes manually if needed
docker volume create media-server-mcp-logs
docker volume create media-server-mcp-config
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Set debug mode in environment
export DEBUG_MODE=true

# Restart container
docker-compose restart media-server-mcp

# View debug logs
docker-compose logs -f media-server-mcp
```

### Performance Issues

```bash
# Check container resource usage
docker stats media-server-mcp

# View container processes
docker exec media-server-mcp ps aux

# Check memory usage
docker exec media-server-mcp cat /proc/meminfo
```

## Security Considerations

### Non-Root User

The container runs as a non-root user for security:

```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S deno -u 1001

# Switch to non-root user
USER deno
```

### Read-Only Filesystem

The container uses a read-only filesystem except for mounted volumes:

```dockerfile
# Set read-only filesystem
VOLUME ["/app/logs", "/app/config"]
```

### Network Isolation

The container uses bridge networking for isolation:

```bash
# Use custom network for additional isolation
docker network create media-server-network
docker run --network media-server-network media-server-mcp:latest
```

### Secret Management

For production deployments, use Docker secrets:

```bash
# Create secrets
echo "your-api-key" | docker secret create radarr_api_key -
echo "your-auth-token" | docker secret create mcp_auth_token -

# Use secrets in docker-compose.yml
services:
  media-server-mcp:
    secrets:
      - radarr_api_key
      - mcp_auth_token
    environment:
      - RADARR_API_KEY_FILE=/run/secrets/radarr_api_key
```

## Performance Tuning

### Resource Limits

```yaml
# Add to docker-compose.yml
services:
  media-server-mcp:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Log Rotation

```yaml
# Add to docker-compose.yml
services:
  media-server-mcp:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Volume Optimization

```bash
# Use tmpfs for temporary data
docker run -d \
  --tmpfs /tmp:noexec,nosuid,size=100m \
  media-server-mcp:latest
```

## Backup and Recovery

### Volume Backup

```bash
# Backup volumes
docker run --rm -v media-server-mcp-logs:/data -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .
docker run --rm -v media-server-mcp-config:/data -v $(pwd):/backup alpine tar czf /backup/config-backup.tar.gz -C /data .

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker run --rm -v media-server-mcp-logs:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/logs.tar.gz -C /data .
docker run --rm -v media-server-mcp-config:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/config.tar.gz -C /data .
```

### Volume Restore

```bash
# Restore volumes
docker run --rm -v media-server-mcp-logs:/data -v $(pwd):/backup alpine tar xzf /backup/logs-backup.tar.gz -C /data
docker run --rm -v media-server-mcp-config:/data -v $(pwd):/backup alpine tar xzf /backup/config-backup.tar.gz -C /data
```

### Configuration Backup

```bash
# Backup environment configuration
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Backup docker-compose configuration
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
```

## Advanced Configuration

### Custom Networks

```bash
# Create custom network
docker network create media-server-network

# Update docker-compose.yml
services:
  media-server-mcp:
    networks:
      - media-server-network

networks:
  media-server-network:
    driver: bridge
```

### Multi-Stage Builds

```dockerfile
# Multi-stage build for smaller image
FROM denoland/deno:1.40-alpine AS builder
WORKDIR /app
COPY . .
RUN deno cache src/index.ts

FROM denoland/deno:1.40-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["deno", "run", "--allow-all", "src/index.ts"]
```

### Health Check Customization

```yaml
# Custom health check
services:
  media-server-mcp:
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Support

For additional help:

- Check the [troubleshooting section](#troubleshooting)
- Review container logs: `docker logs media-server-mcp`
- Enable debug mode: `DEBUG_MODE=true`
- Check health status: `curl http://localhost:3000/health`

## License

MIT
