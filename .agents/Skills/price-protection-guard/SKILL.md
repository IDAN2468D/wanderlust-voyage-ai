---
name: price-protection-guard
description: 'Protects confirmed travel bookings for 14 days (Standard) or 30 days (VIP Platinum) by scanning live fare and hotel price drops and issuing automatic ILS (₪) Travel Wallet credits.'
license: MIT
---

# Post-Booking Price Drop Guard

## Protocol Flow
1. Automatically register confirmed bookings (`POST /api/v1/price-guard/register`) with a 14-day or 30-day protection window.
2. Scan current live market prices (`POST /api/v1/price-guard/scan-drops`).
3. Whenever `current_price_ils < paid_amount_ils`, compute `price_delta_ils` and credit the Wanderlust Travel Wallet automatically.
