FROM node:24-slim AS test

WORKDIR /usr/pkg/
COPY --chown=node:node . .

# Install Playwright browsers to a world-readable path (not /root/.cache)
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/share/playwright

# Install npm dependencies and Playwright's Chromium with its system deps (requires root),
# then transfer ownership of the workdir so the node user can write to it (e.g. build output)
RUN npm ci && npx playwright install --with-deps chromium && chown -R node:node /usr/pkg

USER node

# Run unit tests then e2e tests.
# Use `npx playwright test` directly to skip the pretest:e2e hook
# (Playwright + Chromium are already installed above as root).
CMD ["sh", "-c", "npm run test:unit && npx playwright test"]
