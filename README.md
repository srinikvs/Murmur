# Murmur

Reynolds cursors, Koya fish, and Diwali rockets. One mode at a time.

Open `index.html` in a browser. No build step for the page.

## Modes

| Mode | Behavior |
| --- | --- |
| Cursors | Current flock. Separation, alignment, cohesion. Pointer scatters them. |
| Koya fish | At most 20. Cozy toward a moving pointer. Disperse after the pointer is still for 2 seconds. |
| Diwali rockets | At most 20. Burst with a colored glow at a screen edge, or when the pointer touches one. |

Checking one mode turns the others off. Settings persist in `localStorage` under `murmur.params`.

Playadda keeps its hamburger and game cards. The same modes belong in that drawer; this repo is the standalone page and the `murmur-ci` test source. See [TESTING.md](TESTING.md).

## murmur-ci

```bash
npm install
npx playwright install --with-deps chromium
npm test
npm run test:e2e
```

Do not deploy from CI.
