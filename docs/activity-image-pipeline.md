# Incremental activity image rendering

The activity-card renderer keeps the deployed files under `public/images/activities`, but its reusable build cache lives under:

```
.next/cache/activity-images/
```

Vercel restores the Next.js build cache between normal deployments. The prebuild script therefore computes a fingerprint for each listing from:

- listing ID
- output path
- title and village
- source path and source kind
- exact source image bytes
- the renderer source itself

If all of those inputs are unchanged and the cached WebP exists, the build copies the cached image into `public/images/activities` instead of running Sharp again.

If any visual input changes, only that listing is re-rendered and its cache entry is replaced.

## Build behavior

The build log prints one summary line:

```
Activity images: 391 total · 389 reused · 2 rendered · 1.24s
```

The first deployment after introducing this cache intentionally renders the full set once to seed the cache. Normal later deployments should reuse nearly all images.

Changed images are rendered with bounded concurrency. The default is four workers and can be lowered with:

```
ACTIVITY_IMAGE_RENDER_CONCURRENCY=2
```

No runtime storage, paid image service, or external cache is required.
