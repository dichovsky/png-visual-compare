FROM node:22-slim

WORKDIR /usr/pkg/
COPY --chown=node:node . .

USER node

RUN npm ci
CMD ["npm", "run", "test"]
