# One image for app and worker (same code tree, BAUVORLAGE §3).
FROM node:22-alpine
RUN apk add --no-cache tzdata
ENV TZ=Europe/Berlin
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
