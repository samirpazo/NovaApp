FROM docker.io/library/node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG EXPO_PUBLIC_API_URL=https://api.novateam.tech
ARG EXPO_PUBLIC_PASSWORD_PEPPER=bc847308a05efc5916ab62e806665f402290da4c56f46aeb
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_PASSWORD_PEPPER=$EXPO_PUBLIC_PASSWORD_PEPPER
RUN npx expo export -p web

FROM docker.io/library/nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

