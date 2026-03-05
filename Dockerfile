FROM node:22-slim AS test

WORKDIR /usr/pkg/
COPY --chown=node:node . .

USER node

RUN npm ci
CMD ["npm", "run", "test"]
