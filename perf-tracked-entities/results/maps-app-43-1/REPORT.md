# Tracked entity layer: API benchmark

Server: https://dev.im.dhis2.org/maps-app-43-1 (2.43.1), 2026-10-05T16:21:30.856Z. Median of 3 runs, all org units below the root.

| Dataset | Request | Rows | Size | Median time | Error |
| --- | --- | --- | --- | --- | --- |
| 1k | Tracker API (old loader) | 1000 | 0.1 MB | 0.91 s |  |
| 1k | Analytics (new loader) | 1000 | 0.1 MB | 0.23 s |  |
| 10k | Tracker API (old loader) | 10000 | 1.0 MB | 7.17 s |  |
| 10k | Analytics (new loader) | 10000 | 0.5 MB | 0.65 s |  |
| 50k | Tracker API (old loader) | 50000 | 4.9 MB | 34.55 s |  |
| 50k | Analytics (new loader) | 50000 | 2.6 MB | 2.50 s |  |
| 100k | Tracker API (old loader) | 50000 | 4.9 MB | 32.98 s |  |
| 100k | Analytics (new loader) | 50000 | 2.6 MB | 2.26 s |  |
| poly-10k | Tracker API (old loader) | 10000 | 2.3 MB | 7.70 s |  |
| poly-10k | Analytics (new loader) | 10000 | 1.7 MB | 1.14 s |  |
