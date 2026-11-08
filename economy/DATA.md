# Economy snapshot

The control room reads a committed snapshot. It does not call Yahoo, FRED, Treasury, BLS, or the New York Fed from the browser.

## What the page does

Opening the Economy layer, including reopening it while the frame is still loaded, asks that frame to fetch `economy/data/latest.json` with a cache-busting query and `cache: "no-store"`. The request times out after 8 seconds. Overlapping checks share one request, and a second request inside 2 seconds is skipped.

- A newer `fetchedAt` replaces the painted snapshot.
- The same or an older `fetchedAt` leaves the current paint in place.
- A network failure or timeout keeps the embedded `latest.js` copy.
- The frame address does not change on each open, so the check cannot reload the page in a loop.
- The parent sends `{ type: "ecr-check-freshness", v: 1 }` only to its own origin. The frame ignores every other sender and origin.

`fetchedAt` is when the snapshot file was assembled. The date on each tile is that series' observation date. `LAST KNOWN` means this run did not get a new observation and kept the previous dated print.

CoinGecko is the one optional browser request, and it only overlays the Bitcoin and Ethereum quotes already in the snapshot. If it fails, those tiles stay on the snapshot. That overlay is not a refresh of the rest of the board.

## What the data workflow does

`scripts/fetch-economy-data.mjs` is the provider pull. GitHub Actions runs it on weekday schedules and on manual `workflow_dispatch` (`.github/workflows/update-economy-data.yml`). The action commits `economy/data/latest.json`, `latest.js`, and `meta.json` only after the checks pass. It needs permission to write repository contents. A scheduled run can be delayed or skipped, and this workflow cannot push if branch protection rejects the Actions token. Until it runs on `main`, the page can only see the snapshot this branch contains.

There is no browser endpoint that writes to the repository.

## Sources and the 2-year yield

`twoy` stays the DGS2 2-year constant-maturity yield. The script does not read Yahoo `^UST2Y`.

1. FRED `fredgraph.csv` is tried first. `FRED_API_KEY` is optional and is used only on the server if the CSV fails; the page never sees the key.
2. If FRED does not answer, the script uses the U.S. Treasury daily par yield curve for the 2-year, 10-year, and 3-month yields, BLS for unemployment and CPI, and the New York Fed's daily effective funds rate averaged by completed month. Those rows name the agency that answered. They are not labeled as FRED.
3. Anything still missing keeps its previous observation date, or is marked unavailable when no previous print exists. A run with too few fresh series does not rewrite the files.

The 2s10s spread is the 10-year yield minus the 2-year yield on the same calendar date after both are in percent. Yahoo `^TNX` is divided by 10 only when its sample median is in the old yield-times-10 range. A same-month but different-day pair is not used. FRED `T10Y2Y` replaces the subtraction if both exist and disagree by more than 0.05 percentage points.

## Local refresh

```bash
node scripts/fetch-economy-data.mjs
node scripts/economy-data.test.mjs
```
