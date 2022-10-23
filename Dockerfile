FROM node:16-alpine AS builder
WORKDIR /usr/project_dir
COPY "package.json" "package-lock.json" ./
RUN npm ci
COPY "tsconfig.json" ".eslintrc" ".npmrc" ./
COPY "/src" "/src"
RUN npm run package

FROM alpine:latest
RUN addgroup -S poddy_group \
    && adduser -S poddy -G poddy_group -h /app -s SHELL
USER poddy
WORKDIR /app
COPY --from=builder /usr/project_dir/build/poddy ./bin/
CMD ["./bin/poddy", "subscribe"]