FROM node:22-slim

WORKDIR /usr/pkg/
COPY --chown=node:node . .

RUN npm ci

USER node

CMD ["npm", "run", "test"]
