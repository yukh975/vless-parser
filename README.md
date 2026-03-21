🌐 **English** | [Русский](README_RU.md)

---

# Xray config generator v1.0.3

[![Version](https://img.shields.io/badge/release-v1.0.3-blue)](https://github.com/yukh975/xray-confgen/releases)
[![PHP](https://img.shields.io/badge/PHP-8.1%2B-777bb4)](https://www.php.net)
[![Nginx](https://img.shields.io/badge/web-Nginx%20%2B%20PHP--FPM-009639)](https://nginx.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE.md)

**A web tool for generating `config.json` for [xray-core](https://github.com/XTLS/Xray-core) from a VLESS link.**

Paste a VLESS link, configure the SOCKS5 inbound parameters and routing rules — and get a ready-to-use `config.json` to download or copy.

---

## Demo

Current development version is available at **https://yukh.net/xray-confgen/**

---

## Usage

For a basic setup, just paste your **VLESS URL** into the corresponding field and click **«Generate config.json»**. That's it — the file is ready to use with xray-core.

However, we recommend taking a few extra minutes to fine-tune the client configuration. The sections below cover the available options.

**How Routing and DNS depend on each other:**
- Without **Routing** — all traffic is sent through the proxy with no filtering. The client cannot distinguish between local, foreign, or unwanted traffic.
- Without **DNS** — xray-core uses the system DNS resolver. DNS queries are made outside the tunnel and may be visible to your ISP (DNS leak). Routing rules that rely on domain resolution (strategies `IPIfNonMatch` / `IPOnDemand`) will use the system resolver, which may produce incorrect results.
- **Routing without DNS** — works, but domain-based routing depends on the system resolver. Risk of DNS leaks.
- **DNS without Routing** — xray-core uses the configured resolvers, but all traffic still goes through the proxy. DNS leak prevention works; traffic splitting does not.
- **Both enabled** — full control: traffic is split by rules, and DNS queries are handled by the configured resolvers. This is the recommended setup.

### Inbound

The **inbound** is the local SOCKS5 proxy that xray-core opens on your device. Applications (browser, system) connect to it, and xray-core forwards their traffic through the VLESS tunnel.

**IP address** defines which network interface xray-core listens on:
- `127.0.0.1` — recommended for personal devices (desktops, laptops, phones). Only the device itself can connect to the proxy; it is not accessible from the local network.
- `0.0.0.0` — listens on all available IP addresses on the device. Other devices on the same network can use this proxy. Use with caution.

**Port** is the local port the SOCKS5 proxy listens on. The default `10808` works in most cases; change it if there is a conflict with another application.

### VLESS URL

The VLESS URL encodes all the parameters needed to connect to the remote server. The following formats are supported:

- **TCP** — plain TCP transport, with or without TLS/Reality:
  `vless://uuid@host:port?security=reality&flow=xtls-rprx-vision&pbk=...&sid=...&fp=chrome#name`
- **WebSocket (WS)** — WebSocket transport, typically with TLS:
  `vless://uuid@host:port?security=tls&type=ws&path=/ws&host=example.com#name`
- **XHTTP / SplitHTTP** — HTTP-based multiplexed transport:
  `vless://uuid@host:port?security=tls&type=xhttp&path=/&mode=auto#name`
- **gRPC** — gRPC transport with optional multi-mode:
  `vless://uuid@host:port?security=tls&type=grpc&serviceName=myservice#name`
- **HTTP/2 (h2)** — HTTP/2 transport with TLS:
  `vless://uuid@host:port?security=tls&type=h2&path=/&host=example.com#name`

Supported security types: `none`, `tls`, `reality`. The fragment after `#` is used as a human-readable name for the connection and is stored in the config as a comment.

### Databases

This section lists the geo databases available on the server. They are used when configuring routing rules and DNS rules to match traffic by country, region, or category.

### Routing

Routing determines how xray-core handles each connection — whether to send it through the proxy, route it directly, or block it entirely. If the section is disabled, all traffic goes through the proxy without any filtering.

**Default outbound** is the action applied to traffic that does not match any rule:
- `proxy` — send unmatched traffic through the VLESS tunnel (recommended when you want most traffic proxied).
- `direct` — send unmatched traffic directly without the tunnel (recommended when you only want specific traffic proxied).

**Domain strategy** controls how xray-core resolves domain names before applying routing rules:
- `IPIfNonMatch` — try domain-based rules first; if no rule matches, resolve the domain to an IP and check IP-based rules. Recommended for most setups.
- `IPOnDemand` — always resolve the domain to an IP before routing. More precise, but causes an extra DNS lookup for every connection.
- `AsIs` — route by domain name only, never resolve to IP. Fastest, but IP-based rules will not apply to domain traffic.

**Routing rules** are evaluated top to bottom — the first matching rule wins. Each rule consists of:
- **Database** — the geo database to match against (`geosite.dat` for domains and categories, `geoip.dat` for IP addresses and subnets). Custom databases from the Databases section are also available.
- **Tags** — one or more categories from the selected database (e.g. `ru`, `private`, `category-ads-all`). Click the field to open the picker, search by name, or type a custom value.
- **Action** — what to do with matching traffic: `proxy`, `direct`, or `block`.

A typical setup: route local and Russian traffic directly, block ads, and proxy everything else. Add rules in that order and set the default outbound to `proxy`.

### DNS

This section lets you configure a custom DNS resolver for xray-core. When disabled, the system DNS is used. Configuring DNS is recommended to avoid leaks and to direct different domains to different resolvers.

**Fallback DNS** — the resolver used when no DNS rule matches the queried domain. Choose one of the presets (Google, Cloudflare, Yandex) or enter a custom address.

**Query strategy** — controls which IP versions xray-core requests from DNS:
- `UseIPv4` — request only A records (IPv4). Recommended for most setups.
- `UseIPv6` — request only AAAA records (IPv6).
- `UseIP` — request both A and AAAA records.
- `ForceIPv4` / `ForceIPv6` / `ForceIP` — same as above, but also override the result even if the server returns the opposite record type.
- `useSystem` — delegate all DNS resolution to the operating system.

**Domain strategy** — controls how xray-core resolves domains when applying DNS rules, using the same logic as the routing domain strategy (`IPIfNonMatch`, `IPOnDemand`, `AsIs`).

**DNS servers** — the list of resolvers xray-core will use. Each server can be:
- A **preset** — Google DoH, Cloudflare DoH, Yandex DoH (all use IP addresses to avoid bootstrap dependency), or their plain DNS counterparts.
- A **custom** server — enter a name (used as a label in rules) and an address: a plain IP (`8.8.8.8`) or a DoH URL (`https://1.1.1.1/dns-query`).

**DNS rules** work the same way as routing rules, but instead of an action they point to one of the configured DNS servers. Each rule consists of a database, one or more tags, and the target server. For example, you can send all `ru` domains to Yandex DNS and resolve everything else via Cloudflare DoH.

### Logging

When enabled, xray-core writes access and error events to a log file. This is useful for diagnosing connection issues.

**Log directory** — the path to the folder where the log file (`xray-core.log`) will be created. The directory must be created manually on the client machine before starting xray-core — it will not be created automatically. Leave the field empty to output logs to stdout/stderr instead of a file.

**Log level** — controls the verbosity of the log:
- `debug` — maximum detail, including internal xray-core events. Use only for troubleshooting.
- `info` — general information about connections and server activity.
- `warning` — only potentially problematic events. Recommended for normal use.
- `error` — only critical errors that prevent xray-core from functioning correctly.
- `none` — logging disabled entirely.

---

## Requirements

- Nginx + PHP-FPM (PHP 8.1+)
- `.dat` geo database files in the `db/` directory

---

## Installation

```bash
git clone https://github.com/yukh975/xray-confgen.git
cd xray-confgen
```

The `db/` directory with geo database files is included in the repository:

```
xray-confgen/
└── db/
    ├── geosite.dat
    ├── geoip.dat
    ├── geosite_RU.dat
    └── geoip_RU.dat
```

All `.dat` files present in the `db/` directory are detected and used automatically.

Configure nginx:

```nginx
server {
    listen 443 ssl;
    server_name your.domain.com;

    ssl_certificate     /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/certificate.key;

    root  /path/to/xray-confgen;
    index index.html;

    location /api/ {
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

If your `db/` path differs — update the `GEO_DIR` constant in `api/tags.php` and `api/databases.php`.

---

## Project structure

```
xray-confgen/
├── index.html              # Web interface
├── assets/
│   ├── app.js              # Frontend logic
│   ├── translations.js     # UI translations (EN / RU)
│   └── style.css           # Styles
├── api/
│   ├── parse.php           # VLESS URI parsing + config.json generation
│   ├── tags.php            # Reading categories from .dat files
│   └── databases.php       # List of available geo databases
└── db/
    └── *.dat               # Geo database files
```

---

## API

### `POST /api/parse.php`

Generates `config.json`.

**Request body:**
```json
{
  "inbound_ip": "0.0.0.0",
  "inbound_port": 10808,
  "vless_link": "vless://uuid@host:port?...",
  "routing_rules": [
    { "rule_type": "ip",     "db": "geoip.dat",   "values": ["private"], "action": "direct" },
    { "rule_type": "domain", "db": "geosite.dat",  "values": ["ru"],      "action": "direct" }
  ]
}
```

### `GET /api/tags.php?db=geosite.dat`

Returns the list of categories from the specified `.dat` file.

### `GET /api/databases.php`

Returns the list of available `.dat` files from the `db/` directory.

---

## Author

Yuriy Khachaturian (powered by [Claude.AI](https://claude.ai)), 2026.

---

🌐 **English** | [Русский](README_RU.md)
