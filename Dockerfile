FROM node:20-alpine AS frontend

WORKDIR /frontend/

COPY frontend/package*.json /frontend/
RUN npm ci

COPY frontend/ /frontend/
RUN npm run build

RUN ls -la /frontend/build/
