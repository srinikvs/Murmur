# Murmur

Reynolds boids murmuration: separation, alignment, cohesion, plus cursor scatter.

Open `index.html` in a browser. No build step, no dependencies.

## Controls

| Input | Action |
| --- | --- |
| Sliders | Separation, alignment, cohesion, avoid, flock size, speed |
| Scatter | Burst the flock away from the last pointer position |
| Pause | Freeze motion (Space) |
| Reset | Respawn the flock (R) |
| Pointer | Hold or move near birds to push them away |
| S | Trigger scatter |

Settings persist in `localStorage` under `murmur.params`.

## Git

```bash
cd murmur
git init
git add .
git commit -m "Initial commit: Murmur flocking simulation"
```

## Specs

- 120V-free. Canvas 2D, requestAnimationFrame, variable dt cap
- Toroidal wrap
- Uniform-grid neighbor queries
- Heading-tinted triangles + motion trails
