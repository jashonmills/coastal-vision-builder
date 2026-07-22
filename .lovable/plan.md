Update the location heading on the Beacon on Broadway page so it no longer says "steps from the Prom" and instead emphasizes the downtown historic district location with accurate "blocks from the Prom" wording.

## Current wording

`src/i18n/locales/en.json` line 834:

```
"title": "Downtown Seaside, steps from the Prom"
```

## Proposed options

Pick one and I'll apply it:

**A. Direct & accurate**

> Downtown Historic District, blocks from the Prom

**B. Descriptive**

> In the heart of Seaside's downtown historic district — blocks from the Prom

**C. Short & polished**

> Historic downtown Seaside, just blocks from the Prom

**D. Street-level**

> On Broadway in Seaside's downtown historic district, blocks from the beach

## Implementation

1. Update `beacon.visit.title` in `src/i18n/locales/en.json` with the chosen wording.
2. Optionally adjust the `beacon.visit.body` copy to mention the historic district if it helps the page read consistently.
3. Run `bun run build:dev` to verify no issues.

Which option do you prefer, or would you like me to combine/tweak any of them?

**A. Direct & accurate**

> Downtown Historic District, blocks from the Prom