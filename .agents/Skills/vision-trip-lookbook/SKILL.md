---
name: vision-trip-lookbook
description: 'Decomposes travel inspiration screenshots and lookbooks into clickable Liquid Glass bounding-box hotspots mapped to bookable flight, stay, dining, and experience bundles with a -10% bundle discount and Fit Accuracy Score.'
license: MIT
---

# Screenshot-to-Trip & Vision Fit Assessment

## Protocol Flow
1. Accept screenshot URL, base64 payload, or curated inspiration scene (`POST /api/v1/vision-trip/decompose-screenshot`).
2. Emit 2–5 normalized bounding boxes `(x, y, w, h)` mapped to bookable travel components and calculate `-10%` Complete-the-Trip bundle pricing in `₪` / `$`.
3. Compute personalized Fit Accuracy Score (`fit_accuracy_pct` 0–100%) via `POST /api/v1/vision-trip/fit-assessment`.
