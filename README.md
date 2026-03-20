🌐 **English** | [Русский](README_RU.md)

---

# VLESS → xray-core config generator

[![Version](https://img.shields.io/badge/release-v1.0.0-blue)](https://github.com/yukh975/vless-parser/releases)
[![PHP](https://img.shields.io/badge/PHP-8.1%2B-777bb4)](https://www.php.net)
[![Nginx](https://img.shields.io/badge/web-Nginx%20%2B%20PHP--FPM-009639)](https://nginx.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE.md)

**A web tool for generating `config.json` for [xray-core](https://github.com/XTLS/Xray-core) from a VLESS link.**

Paste a VLESS link, configure the SOCKS5 inbound parameters and routing rules — and get a ready-to-use `config.json` to download or copy.

---

## Supported transports

- TCP + Reality
- TCP + TLS
- XHTTP (SplitHTTP) + Reality / TLS
- WebSocket + TLS
- gRPC + TLS / Reality
- HTTP/2 + TLS

---

## Features

- Auto-detection of transport type and security from VLESS URI
- SOCKS5 inbound with configurable IP and port (default `10808`)
- Routing section with dynamic rules
- Geo database selector (`geosite.dat`, `geoip.dat` and custom files)
- Categories loaded directly from `.dat` files (PHP protobuf parser)
- Category search with ability to add custom values
- Form state persistence via `localStorage`
- Download and copy result

---

## Requirements

- Nginx + PHP-FPM (PHP 8.1+)
- `.dat` geo database files in the `db/` directory

---

## Installation

```bash
git clone https://github.com/yukh975/vless-parser.git
cd vless-parser
```

The `db/` directory with geo database files is included in the repository:

```
vless-parser/
└── db/
    ├── geosite.dat
    ├── geoip.dat
    └── geosite_RU.dat   # optional
```

Configure nginx:

```nginx
server {
    listen 80;
    root /path/to/vless-parser;
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
vless-parser/
├── index.html              # Web interface
├── assets/
│   ├── app.js              # Frontend logic
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

## License

[MIT](LICENSE.md)

---

## Author

Yuriy Khachaturian (powered by [Claude.AI](https://claude.ai)), 2026.

---

🌐 **English** | [Русский](README_RU.md)
