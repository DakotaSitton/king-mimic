FROM oven/bun:1.3.14

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY game.js content-cards.js server.js ./
COPY engine ./engine
COPY public ./public

EXPOSE 3000
CMD ["bun", "run", "server.js"]
