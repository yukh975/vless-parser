🌐 **English** | [Русский](CHANGELOG_RU.md)

---

# Changelog

## v1.0.3 — unreleased

### UI
- Favicon added: dark background, thin blue X with 8 ray dots (16×32×48 px)
- SVG logo added to the left of the page title
- "Source code on GitHub" link added to the footer

### Docs
- README rewritten: Features section replaced with full usage guide (from the help modal)
- Demo link added: https://yukh.net/xray-confgen/
- SVG logo added to README titles
- Geo database download links added to the Installation section

---

## v1.0.2 — 2026-03-21

### UI
- Password reveal button uses SVG icons (open / crossed-out eye) that toggle on click
- Named section titles: Inbound, VLESS, Databases, Routing, Logging
- Uniform vertical spacing between all form sections
- Field labels simplified: removed redundant "Inbound" from IP and port labels
- Field labels horizontally aligned with input fields
- Hint texts simplified
- Page title and H1 updated to "Xray config generator"
- Project renamed from "vless-parser" to "xray-confgen" (Xray config generator)
- Routing section is now collapsible (hidden by default); all optional sections collapsed on first load
- Result `config.json` is displayed in a centered modal popup (same style as error dialog) with backdrop and close button
- Result config modal closes only via the ✕ button; backdrop click and Escape do not close it
- Escape key closes the Help and error modals
- Value picker dropdown: added clear-all ✕ button (shown only when items are selected)
- DNS, Routing, Logging sections now have a consistent toggle-to-expand pattern
- Help button (?) added next to language switcher; opens a modal with usage guide and language switcher

### Features
- **DNS section** added:
  - Enable toggle with collapsible block
  - DNS servers list: presets (Google DoH, Cloudflare DoH, Yandex DoH, Google DNS, Cloudflare DNS, Yandex DNS) or custom with name + address fields
  - DNS rules: assign geo-database tags to specific DNS servers (same picker as routing)
  - Fallback DNS server, query strategy (UseIP / UseIPv4 / UseIPv6 / ForceIP / ForceIPv4 / ForceIPv6 / useSystem), domain strategy (AsIs / IPIfNonMatch / IPOnDemand)
  - All DoH presets use IP addresses to avoid bootstrap DNS dependency
- **Routing section**: routing config is only emitted when the section is enabled
- Custom DNS server row includes a Name field used as label in rule selectors

### Bug fixes
- DNS rule server selector displayed literal translation key instead of server label
- Value picker in DNS rule rows always used the initial database instead of the current selection
- Picker dropdown was clipped by the Logging section below (`overflow: hidden` → `overflow: visible`)

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
