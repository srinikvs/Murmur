# murmur-ci

The Jenkins job `murmur-ci` does not exist yet. These tests are in the repo so that job can run them from a git checkout. Do not deploy from this job (`DEPLOY=false`). Do not rsync `node_modules/` or `tests/`.

Style matches Playadda `*-ci`: Node tests plus Playwright Chromium against the local page. `BASE_URL` can point at a host such as `https://playaddatest.duckdns.org/murmur/` when that mount has these hooks.

```bash
npm install
npx playwright install --with-deps chromium
npm test
npm run test:e2e
```

Set `CI=1` on the agent. Default server is `http://127.0.0.1:4174/`.

| id | Layer | Coverage |
|---|---|---|
| M1 | unit + e2e | One mode at a time: Cursors, Koya fish, Diwali rockets |
| M2 | unit | Koya count never exceeds 20; cozy toward a moving pointer; disperse after the pointer is still for 2 seconds |
| M3 | unit | Rockets never exceed 20; burst at a screen edge and on pointer contact |
