const TRANSLATIONS = {
    en: {
        subtitle:               'Generate <code>config.json</code> for xray-core from a VLESS link',
        inbound_ip_label:       'IP address',
        inbound_ip_hint:        'SOCKS5 address',
        inbound_port_label:     'Port',
        inbound_port_hint:      'SOCKS5 port',
        vless_link_label:       'VLESS URL',
        vless_link_hint:        'Full VLESS link including parameters and name',
        socks5_auth_label:      'Enable SOCKS5 authentication',
        socks5_user_label:      'Username',
        socks5_pass_label:      'Password',
        db_section_label:       'Available databases',
        routing_label:          'Routing rules',
        routing_enabled_label:  'Configure routing',
        default_outbound_label: 'Default outbound',
        domain_strategy_label:  'Domain strategy',
        add_rule_btn:           '+ Add rule',
        routing_hint:           'Rules are applied top to bottom',
        block_bittorrent_label: 'Block BitTorrent protocol',
        submit_btn:             'Generate config.json',
        clear_btn:              'Clear',
        copy_btn:               'Copy',
        download_btn:           'Download',
        copy_success:           '✓ Copied',
        picker_empty:           'Select...',
        picker_selected:        n => `${n} selected`,
        picker_search:          'Search or enter custom value...',
        picker_add:             v => `➕ Add «${v}»`,
        picker_loading:         'Loading...',
        dns_enabled_label:         'Configure DNS',
        dns_query_strategy_label:  'Query strategy',
        dns_domain_strategy_label: 'Domain strategy',
        dns_servers_label:         'DNS servers',
        dns_rules_label:        'DNS rules',
        dns_preset_google_doh:      'Google DoH',
        dns_preset_cloudflare_doh:  'Cloudflare DoH',
        dns_preset_yandex_doh:      'Yandex DoH',
        dns_preset_google_dns:      'Google DNS',
        dns_preset_cloudflare_dns:  'Cloudflare DNS',
        dns_preset_yandex_dns:      'Yandex DNS',
        dns_preset_custom:          'Custom...',
        add_dns_server_btn:     '+ Add server',
        add_dns_rule_btn:       '+ Add rule',
        dns_fallback_label:     'Fallback DNS server',
        dns_fallback_hint:      'Used when no rules match (e.g. 8.8.8.8)',
        log_enabled_label:      'Enable logging',
        log_dir_label:          'Log directory',
        log_dir_hint:           'Directory must exist on the client machine · log file: xray-core.log\nLeave empty to log to stdout/stderr',
        log_level_label:        'Log level',
        help_title:             'Help',
        help_content:           `
<p>For a basic setup, just paste your <strong>VLESS URL</strong> into the corresponding field and click <strong>«Generate config.json»</strong>. That's it — the file is ready to use with xray-core.</p>
<p>However, we recommend taking a few extra minutes to fine-tune the client configuration. The sections below cover the available options.</p>

<h3>Inbound</h3>
<p>The <strong>inbound</strong> is the local SOCKS5 proxy that xray-core opens on your device. Applications (browser, system) connect to it, and xray-core forwards their traffic through the VLESS tunnel.</p>
<p><strong>IP address</strong> defines which network interface xray-core listens on:</p>
<ul>
  <li><code>127.0.0.1</code> — recommended for personal devices (desktops, laptops, phones). Only the device itself can connect to the proxy; it is not accessible from the local network.</li>
  <li><code>0.0.0.0</code> — listens on all available IP addresses on the device. Other devices on the same network can use this proxy. Use with caution.</li>
</ul>
<p><strong>Port</strong> is the local port the SOCKS5 proxy listens on. The default <code>10808</code> works in most cases; change it if there is a conflict with another application.</p>

<h3>VLESS URL</h3>
<p>The VLESS URL encodes all the parameters needed to connect to the remote server. The following formats are supported:</p>
<ul>
  <li><strong>TCP</strong> — plain TCP transport, with or without TLS/Reality:<br><code>vless://uuid@host:port?security=reality&amp;flow=xtls-rprx-vision&amp;pbk=...&amp;sid=...&amp;fp=chrome#name</code></li>
  <li><strong>WebSocket (WS)</strong> — WebSocket transport, typically with TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=ws&amp;path=/ws&amp;host=example.com#name</code></li>
  <li><strong>XHTTP / SplitHTTP</strong> — HTTP-based multiplexed transport:<br><code>vless://uuid@host:port?security=tls&amp;type=xhttp&amp;path=/&amp;mode=auto#name</code></li>
  <li><strong>gRPC</strong> — gRPC transport with optional multi-mode:<br><code>vless://uuid@host:port?security=tls&amp;type=grpc&amp;serviceName=myservice#name</code></li>
  <li><strong>HTTP/2 (h2)</strong> — HTTP/2 transport with TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=h2&amp;path=/&amp;host=example.com#name</code></li>
</ul>
<p>Supported security types: <code>none</code>, <code>tls</code>, <code>reality</code>. The fragment after <code>#</code> is used as a human-readable name for the connection and is stored in the config as a comment.</p>

<h3>Databases</h3>
<p>This section lists the geo databases available on the server. They are used when configuring routing rules and DNS rules to match traffic by country, region, or category.</p>

<h3>Routing</h3>
<p>Routing determines how xray-core handles each connection — whether to send it through the proxy, route it directly, or block it entirely. If the section is disabled, all traffic goes through the proxy without any filtering.</p>

<p><strong>Default outbound</strong> is the action applied to traffic that does not match any rule:</p>
<ul>
  <li><code>proxy</code> — send unmatched traffic through the VLESS tunnel (recommended when you want most traffic proxied).</li>
  <li><code>direct</code> — send unmatched traffic directly without the tunnel (recommended when you only want specific traffic proxied).</li>
</ul>

<p><strong>Domain strategy</strong> controls how xray-core resolves domain names before applying routing rules:</p>
<ul>
  <li><code>IPIfNonMatch</code> — try domain-based rules first; if no rule matches, resolve the domain to an IP and check IP-based rules. Recommended for most setups.</li>
  <li><code>IPOnDemand</code> — always resolve the domain to an IP before routing. More precise, but causes an extra DNS lookup for every connection.</li>
  <li><code>AsIs</code> — route by domain name only, never resolve to IP. Fastest, but IP-based rules will not apply to domain traffic.</li>
</ul>

<p><strong>Routing rules</strong> are evaluated top to bottom — the first matching rule wins. Each rule consists of:</p>
<ul>
  <li><strong>Database</strong> — the geo database to match against (<code>geosite.dat</code> for domains and categories, <code>geoip.dat</code> for IP addresses and subnets). Custom databases from the Databases section are also available.</li>
  <li><strong>Tags</strong> — one or more categories from the selected database (e.g. <code>ru</code>, <code>private</code>, <code>category-ads-all</code>). Click the field to open the picker, search by name, or type a custom value.</li>
  <li><strong>Action</strong> — what to do with matching traffic: <code>proxy</code>, <code>direct</code>, or <code>block</code>.</li>
</ul>
<p>A typical setup: route local and Russian traffic directly, block ads, and proxy everything else. Add rules in that order and set the default outbound to <code>proxy</code>.</p>
`,
        remove_title:           'Remove',
        err_vless_prefix:       'VLESS URI must start with vless://',
        err_server:             'Could not connect to server: ',
        err_server_status:      'Server error: ',
    },
    ru: {
        subtitle:               'Генерация <code>config.json</code> для xray-core из VLESS URL',
        inbound_ip_label:       'IP-адрес',
        inbound_ip_hint:        'Адрес SOCKS5',
        inbound_port_label:     'Порт',
        inbound_port_hint:      'Порт SOCKS5',
        vless_link_label:       'VLESS URL',
        vless_link_hint:        'VLESS URL',
        socks5_auth_label:      'Включить авторизацию SOCKS5',
        socks5_user_label:      'Имя пользователя',
        socks5_pass_label:      'Пароль',
        db_section_label:       'Доступные базы данных',
        routing_label:          'Правила маршрутизации',
        routing_enabled_label:  'Настроить маршрутизацию',
        default_outbound_label: 'Маршрут по умолчанию',
        domain_strategy_label:  'Стратегия доменов',
        add_rule_btn:           '+ Добавить правило',
        routing_hint:           'Правила применяются сверху вниз',
        block_bittorrent_label: 'Блокировать протокол BitTorrent',
        submit_btn:             'Сгенерировать config.json',
        clear_btn:              'Очистить',
        copy_btn:               'Копировать',
        download_btn:           'Скачать',
        copy_success:           '✓ Скопировано',
        picker_empty:           'Выбрать...',
        picker_selected:        n => `${n} выбрано`,
        picker_search:          'Поиск или своё значение...',
        picker_add:             v => `➕ Добавить «${v}»`,
        picker_loading:         'Загрузка...',
        dns_enabled_label:         'Настроить DNS',
        dns_query_strategy_label:  'Стратегия запросов',
        dns_domain_strategy_label: 'Стратегия доменов',
        dns_servers_label:         'DNS-серверы',
        dns_rules_label:        'DNS-правила',
        dns_preset_google_doh:      'Google DoH',
        dns_preset_cloudflare_doh:  'Cloudflare DoH',
        dns_preset_yandex_doh:      'Yandex DoH',
        dns_preset_google_dns:      'Google DNS',
        dns_preset_cloudflare_dns:  'Cloudflare DNS',
        dns_preset_yandex_dns:      'Yandex DNS',
        dns_preset_custom:          'Свой...',
        add_dns_server_btn:     '+ Добавить сервер',
        add_dns_rule_btn:       '+ Добавить правило',
        dns_fallback_label:     'Резервный DNS-сервер',
        dns_fallback_hint:      'Используется, если ни одно правило не совпало (например, 8.8.8.8)',
        log_enabled_label:      'Включить журналирование',
        log_dir_label:          'Каталог журналов',
        log_dir_hint:           'Каталог должен существовать на клиентской машине · файл журнала: xray-core.log\nОставьте пустым для вывода в stdout/stderr',
        log_level_label:        'Уровень журналирования',
        help_title:             'Справка',
        help_content:           `
<p>Для базовой настройки достаточно вставить <strong>VLESS URL</strong> в соответствующее поле и нажать <strong>«Сгенерировать config.json»</strong>. Файл сразу готов к использованию с xray-core.</p>
<p>Тем не менее мы рекомендуем уделить несколько минут более тонкой настройке клиента. Доступные параметры описаны ниже.</p>

<h3>Inbound</h3>
<p><strong>Inbound</strong> — это локальный SOCKS5-прокси, который xray-core открывает на вашем устройстве. Приложения (браузер, система) подключаются к нему, а xray-core пересылает их трафик через VLESS-туннель.</p>
<p><strong>IP-адрес</strong> определяет, на каком сетевом интерфейсе xray-core будет принимать подключения:</p>
<ul>
  <li><code>127.0.0.1</code> — рекомендуется для личных устройств (компьютеры, ноутбуки, телефоны). Подключиться к прокси может только само устройство; из локальной сети он недоступен.</li>
  <li><code>0.0.0.0</code> — прослушивает все доступные IP-адреса на устройстве. Другие устройства в той же сети смогут использовать этот прокси. Используйте осторожно.</li>
</ul>
<p><strong>Порт</strong> — локальный порт, на котором слушает SOCKS5-прокси. Значение по умолчанию <code>10808</code> подходит в большинстве случаев; измените его при конфликте с другим приложением.</p>

<h3>VLESS URL</h3>
<p>VLESS URL содержит все параметры для подключения к удалённому серверу. Поддерживаются следующие форматы:</p>
<ul>
  <li><strong>TCP</strong> — TCP-транспорт с TLS или Reality:<br><code>vless://uuid@host:port?security=reality&amp;flow=xtls-rprx-vision&amp;pbk=...&amp;sid=...&amp;fp=chrome#name</code></li>
  <li><strong>WebSocket (WS)</strong> — WebSocket-транспорт, как правило с TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=ws&amp;path=/ws&amp;host=example.com#name</code></li>
  <li><strong>XHTTP / SplitHTTP</strong> — мультиплексированный HTTP-транспорт:<br><code>vless://uuid@host:port?security=tls&amp;type=xhttp&amp;path=/&amp;mode=auto#name</code></li>
  <li><strong>gRPC</strong> — gRPC-транспорт с опциональным multi-режимом:<br><code>vless://uuid@host:port?security=tls&amp;type=grpc&amp;serviceName=myservice#name</code></li>
  <li><strong>HTTP/2 (h2)</strong> — HTTP/2-транспорт с TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=h2&amp;path=/&amp;host=example.com#name</code></li>
</ul>
<p>Поддерживаемые типы безопасности: <code>none</code>, <code>tls</code>, <code>reality</code>. Фрагмент после <code>#</code> используется как читаемое имя подключения и сохраняется в конфиге в виде комментария.</p>

<h3>Databases</h3>
<p>В этом разделе отображается список геобаз данных, доступных на сервере. Они используются при настройке правил маршрутизации и DNS для сопоставления трафика по стране, региону или категории.</p>

<h3>Routing</h3>
<p>Маршрутизация определяет, как xray-core обрабатывает каждое соединение — отправить через прокси, пустить напрямую или заблокировать. Если раздел отключён, весь трафик идёт через прокси без фильтрации.</p>

<p><strong>Маршрут по умолчанию</strong> — действие для трафика, который не попал ни под одно правило:</p>
<ul>
  <li><code>proxy</code> — пустить несовпавший трафик через VLESS-туннель (рекомендуется, если большинство трафика должно проксироваться).</li>
  <li><code>direct</code> — пустить несовпавший трафик напрямую без туннеля (рекомендуется, если через прокси нужен только отдельный трафик).</li>
</ul>

<p><strong>Стратегия доменов</strong> определяет, как xray-core обрабатывает доменные имена перед применением правил маршрутизации:</p>
<ul>
  <li><code>IPIfNonMatch</code> — сначала проверяются правила по домену; если ни одно не совпало, домен резолвится в IP и проверяются IP-правила. Рекомендуется для большинства случаев.</li>
  <li><code>IPOnDemand</code> — домен всегда резолвится в IP перед маршрутизацией. Более точно, но требует дополнительного DNS-запроса для каждого соединения.</li>
  <li><code>AsIs</code> — маршрутизация только по доменному имени, без резолвинга. Быстрее всего, но IP-правила не применяются к доменному трафику.</li>
</ul>

<p><strong>Правила маршрутизации</strong> проверяются сверху вниз — срабатывает первое совпавшее правило. Каждое правило состоит из:</p>
<ul>
  <li><strong>База данных</strong> — геобаза для сопоставления (<code>geosite.dat</code> — домены и категории, <code>geoip.dat</code> — IP-адреса и подсети). Доступны также кастомные базы из раздела Databases.</li>
  <li><strong>Теги</strong> — одна или несколько категорий из выбранной базы (например, <code>ru</code>, <code>private</code>, <code>category-ads-all</code>). Нажмите на поле, чтобы открыть список, воспользуйтесь поиском или введите своё значение.</li>
  <li><strong>Действие</strong> — что делать с совпавшим трафиком: <code>proxy</code>, <code>direct</code> или <code>block</code>.</li>
</ul>
<p>Типичная настройка: локальный и российский трафик — напрямую, рекламу — блокировать, остальное — через прокси. Добавьте правила в таком порядке и установите маршрут по умолчанию <code>proxy</code>.</p>
`,
        remove_title:           'Удалить',
        err_vless_prefix:       'VLESS URI должен начинаться с vless://',
        err_server:             'Не удалось связаться с сервером: ',
        err_server_status:      'Ошибка сервера: ',
    },
};
