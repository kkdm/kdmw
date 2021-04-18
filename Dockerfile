FROM node:alpine3.10 AS builder

COPY . /build
WORKDIR /build

RUN npm install && \
    npm run build
    
FROM nginx:1.18

COPY --from=builder /build/build/ /usr/share/nginx/html/
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

