FROM node:18

WORKDIR /usr/pkg/
COPY . .

RUN npm ci

CMD npm run docker:test
