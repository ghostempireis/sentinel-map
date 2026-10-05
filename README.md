# Sentinel live-map viewer

Read-only browser viewer for expiring Sentinel phone-recovery links. Deployed with GitHub Pages.

- Requires a valid session ID and independent 256-bit read token in the URL fragment.
- Tokens are not sent to GitHub Pages or map tile providers. Requests to the relay use an Authorization header.
- No device write keys, SMS codes, coordinates or location history are stored in this repository.
- Map updates are polled every 10 seconds. Phone uploads target 30-second intervals.
- Expired sessions clear the displayed location. Anyone holding an unexpired complete link can view that session.

Uses Leaflet 1.9.4 (BSD-2-Clause) and OpenStreetMap tiles with attribution.
