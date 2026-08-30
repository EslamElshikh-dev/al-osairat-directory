# Global search and directory ticker

## Header search
- Header search opens a lightweight global-search popover instead of navigating immediately to `/directory`.
- Search covers current directory listings plus categories, villages, core pages and blog articles.
- Directory listing relevance reuses the existing canonical directory search and its fallback search logic.
- Search is debounced and aborts stale requests.
- Keyboard support: Escape closes, Arrow Up/Down moves through quick results, Enter opens the selected result or the full directory search.
- Mobile uses a fixed popover sized to the viewport.

## Directory result strip
- The old standalone category-pill block is removed.
- Category navigation now sits inside the same strip as the result count and visible range.
- Categories move continuously from left to right in a seamless duplicated track.
- Hover/focus pauses the ticker and slightly enlarges the focused category.
- Reduced-motion users get a horizontally scrollable static category row instead.
