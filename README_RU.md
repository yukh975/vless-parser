🌐 [English](README.md) | **Русский**

---

# Xray config generator v1.0.2

[![Version](https://img.shields.io/badge/release-v1.0.2-blue)](https://github.com/yukh975/xray-confgen/releases)
[![PHP](https://img.shields.io/badge/PHP-8.1%2B-777bb4)](https://www.php.net)
[![Nginx](https://img.shields.io/badge/web-Nginx%20%2B%20PHP--FPM-009639)](https://nginx.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE.md)

**Веб-инструмент для генерации `config.json` для [xray-core](https://github.com/XTLS/Xray-core) из VLESS-ссылки.**

Позволяет вставить VLESS-ссылку, задать параметры SOCKS5 inbound и настроить правила маршрутизации — и получить готовый `config.json`, который можно скачать или скопировать.

---

## Поддерживаемые транспорты

- TCP + Reality
- TCP + TLS
- XHTTP (SplitHTTP) + Reality / TLS
- WebSocket + TLS
- gRPC + TLS / Reality
- HTTP/2 + TLS

---

## Функционал

- Автоматическое определение типа транспорта и безопасности из VLESS URI
- SOCKS5 inbound с настраиваемым IP и портом (по умолчанию `10808`)
- Секция маршрутизации с динамическими правилами
- Выбор баз геоданных (`geosite.dat`, `geoip.dat` и пользовательские)
- Загрузка категорий прямо из `.dat` файлов (protobuf-парсер на PHP)
- Поиск по категориям с возможностью добавить кастомное значение
- Сохранение состояния формы в `localStorage`
- Скачивание и копирование результата

---

## Требования

- Nginx + PHP-FPM (PHP 8.1+)
- `.dat` файлы геобаз в директории `db/`

---

## Установка

```bash
git clone https://github.com/yukh975/xray-confgen.git
cd xray-confgen
```

Директория `db/` с файлами геобаз включена в репозиторий:

```
xray-confgen/
└── db/
    ├── geosite.dat
    ├── geoip.dat
    ├── geosite_RU.dat
    └── geoip_RU.dat
```

Все файлы `.dat`, находящиеся в директории `db/`, определяются и используются автоматически.

Настрой nginx:

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

Если путь к `db/` отличается — измени константу `GEO_DIR` в файлах `api/tags.php` и `api/databases.php`.

---

## Структура проекта

```
xray-confgen/
├── index.html              # Веб-интерфейс
├── assets/
│   ├── app.js              # Логика фронтенда
│   └── style.css           # Стили
├── api/
│   ├── parse.php           # Парсинг VLESS URI + генерация config.json
│   ├── tags.php            # Чтение категорий из .dat файлов
│   └── databases.php       # Список доступных баз геоданных
└── db/
    └── *.dat               # Файлы геобаз
```

---

## API

### `POST /api/parse.php`

Генерирует `config.json`.

**Тело запроса:**
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

Возвращает список категорий из указанного `.dat` файла.

### `GET /api/databases.php`

Возвращает список доступных `.dat` файлов из директории `db/`.

---

## Автор

Юрий Хачатурян (при поддержке [Claude.AI](https://claude.ai)), 2026.

---

🌐 [English](README.md) | **Русский**
