FROM node:20-alpine AS frontend

WORKDIR /frontend/

# Install frontend build dependencies
COPY frontend/package*.json /frontend/
RUN npm ci

# Build frontend
COPY frontend/ /frontend/
RUN npm run build

FROM docker.io/openjdk:21-jdk-bookworm AS engine
WORKDIR /build/

RUN apt-get update && \
    apt-get install -y --no-install-recommends maven git && \
    rm -rf /var/lib/apt/lists/*

# Pin the included tank game engine to the last compatible version
ARG ENGINE_VERSION=477c781d69a902eb19ce20303823b3d6a321b6d1

# Build tank game engine to be included with the default image
RUN --mount=type=cache,target=/root/.m2 \
    git clone https://github.com/TrevorBrunette/tankgame.git && \
    cd tankgame && \
    git checkout "${ENGINE_VERSION}" && \
    # Disable debug mode \
    sed -i 's/public static final boolean DEBUG = true;/public static final boolean DEBUG = false;/' src/main/java/pro/trevor/tankgame/Main.java && \
    mvn package && \
    cd target && \
    # Rename the executable to include the git hash for easy debugging \
    mv $(echo TankGame-*.jar) "$(basename $(echo TankGame-*.jar) .jar)-$(git rev-parse HEAD)".jar

FROM node:20-alpine

WORKDIR /app/

# Install java for the entine
RUN apk --no-cache --update add openjdk21-jre-headless

# Install backend dependencies
COPY backend/package*.json /app/
RUN npm ci

ARG BUILD_INFO
ENV BUILD_INFO=${BUILD_INFO}

# Copy everything over to the final image
COPY backend/ /app/
COPY --from=frontend /frontend/build/ /app/www/
COPY --from=engine /build/tankgame/target/TankGame-*.jar /app/

# Place some sample data in /data so users can try out the app
COPY example /data

ENV TANK_GAMES_FOLDER=/data

CMD ["/usr/local/bin/npm", "start"]
