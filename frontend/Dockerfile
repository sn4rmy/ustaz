FROM node:22-alpine AS build

WORKDIR /app

# Dependencies before the code: this layer is reused while only the code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite writes these into the built JavaScript, so they are set at build time.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_MOCK_API=none
ENV VITE_API_URL=$VITE_API_URL VITE_MOCK_API=$VITE_MOCK_API
RUN npm run build

# Only the built files go into the final image, without Node and node_modules.
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
