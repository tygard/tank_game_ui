FROM node:20-alpine AS frontend

WORKDIR /frontend/

# Install frontend build dependencies
COPY frontend/package*.json /frontend/
RUN npm ci

# Build frontend
COPY frontend/ /frontend/
RUN npm run build

FROM openjdk:21-jdk-bookworm AS engine
WORKDIR /build/

RUN apt-get update && \
    apt-get install -y --no-install-recommends maven git && \
    rm -rf /var/lib/apt/lists/*

# Build tank game engine to be included with the default image
RUN git clone https://github.com/TrevorBrunette/tankgame.git
WORKDIR /build/tankgame/
RUN mvn package

FROM node:20-alpine

WORKDIR /app/

# Install java for the entine
RUN apk --no-cache --update add openjdk21-jre-headless

# Install backend dependencies
COPY backend/package*.json /app/
RUN npm ci

# Copy everything over to the final image
COPY backend/ /app/
COPY --from=frontend /frontend/build/ /app/www/
COPY --from=engine /build/tankgame/target/*.jar /app/
COPY example /app/example

CMD ["/usr/local/bin/node", "/app/src/index.mjs"]
