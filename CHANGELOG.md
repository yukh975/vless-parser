🌐 **English** | [Русский](CHANGELOG_RU.md)

---

# Changelog

## v1.0.2 — 2026-03-20

### UI
- Password field reveal button now uses SVG icons (open / crossed-out eye) that toggle on click

---

## v1.0.1 — 2026-03-20

### UI
- Inbound IP and port fields moved to the same row
- VLESS link textarea auto-resizes to fit content
- EN / RU language switcher added (default: English)
- Version number displayed in page footer
- Hint text unified: "SOCKS5 address" / "SOCKS5 port"
- Named section titles added: Inbound, VLESS, Databases, Routing, Logging

### Features
- BitTorrent protocol blocking option added
- Optional SOCKS5 authentication (username / password)
- Default outbound selector (proxy / direct, default: proxy)
- Domain strategy selector (IPIfNonMatch / IPOnDemand / AsIs, default: IPIfNonMatch)
- Logging section: enable toggle, log directory, log level (debug / info / warning / error / none)
- UI language stored in `localStorage`

### Databases
- Iran geo databases added: `geoip_IR.dat`, `geosite_IR.dat`

### Code
- All comments and error messages translated to English
- Russian UI translations moved to a dedicated `assets/translations.js` file

---

## v1.0.0 — 2026-03-19

Initial release.

### Features
- VLESS URI parsing with auto-detection of transport and security type
- Supported transports: TCP, XHTTP (SplitHTTP), WebSocket, gRPC, HTTP/2
- Supported security: Reality, TLS
- SOCKS5 inbound with configurable IP and port
- Dynamic routing rules with geo database selector
- Categories loaded directly from `.dat` files via PHP protobuf parser
- Multi-select picker with search and custom value input
- Checked items shown first (alphabetical), then unchecked (alphabetical)
- Form state persistence via `localStorage`
- Download and copy result buttons

### Databases
- Bundled: `geosite.dat`, `geoip.dat`, `geosite_RU.dat`, `geoip_RU.dat`
- Auto-detected from `db/` directory at runtime

### Security
- Server-side IP validation via `FILTER_VALIDATE_IP`
- Filename whitelist for `.dat` files
- XSS prevention: all user data rendered via `textContent` / DOM methods

---

🌐 **English** | [Русский](CHANGELOG_RU.md)
