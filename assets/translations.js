const TRANSLATIONS = {
    en: {
        subtitle:               'Generate <code>config.json</code> for xray-core from a VLESS URI',
        inbound_ip_label:       'IP address',
        inbound_ip_hint:        'SOCKS5 address',
        inbound_port_label:     'Port',
        inbound_port_hint:      'SOCKS5 port',
        vless_link_label:       'VLESS URI',
        vless_link_hint:        'Full VLESS URI including parameters and name',
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
<p>For a basic setup, just paste your <strong>VLESS URI</strong> into the corresponding field and click <strong>«Generate config.json»</strong>. That's it — the file is ready to use with xray-core.</p>
<p>However, we recommend taking a few extra minutes to fine-tune the client configuration. The sections below cover the available options.</p>

<p><strong>How Routing and DNS depend on each other:</strong></p>
<ul>
  <li>Without <strong>Routing</strong> — all traffic is sent through the proxy with no filtering. The client cannot distinguish between local, foreign, or unwanted traffic.</li>
  <li>Without <strong>DNS</strong> — xray-core uses the system DNS resolver. DNS queries are made outside the tunnel and may be visible to your ISP (DNS leak). Routing rules that rely on domain resolution (strategies <code>IPIfNonMatch</code> / <code>IPOnDemand</code>) will use the system resolver, which may produce incorrect results.</li>
  <li><strong>Routing without DNS</strong> — works, but domain-based routing depends on the system resolver. Risk of DNS leaks.</li>
  <li><strong>DNS without Routing</strong> — xray-core uses the configured resolvers, but all traffic still goes through the proxy. DNS leak prevention works; traffic splitting does not.</li>
  <li><strong>Both enabled</strong> — full control: traffic is split by rules, and DNS queries are handled by the configured resolvers. This is the recommended setup.</li>
</ul>

<h3>Inbound</h3>
<p>The <strong>inbound</strong> defines the local proxy that xray-core opens on your device. Applications (browser, system) connect to it, and xray-core forwards their traffic through the VLESS tunnel.</p>
<p><strong>IP address</strong> defines which network interface xray-core listens on:</p>
<ul>
  <li><code>127.0.0.1</code> — recommended for personal devices (desktops, laptops, phones). Only the device itself can connect to the proxy; it is not accessible from the local network.</li>
  <li><code>0.0.0.0</code> — listens on all available IP addresses on the device. Other devices on the same network can use this proxy. Use with caution.</li>
</ul>
<p><strong>Port</strong> is the local port the SOCKS5 proxy listens on. The default <code>10808</code> works in most cases; change it if there is a conflict with another application.</p>
<p><strong>HTTP inbound</strong> — click <em>Add HTTP inbound</em> to add a second local proxy that accepts HTTP CONNECT requests alongside the SOCKS5 inbound. This is useful for applications that support HTTP proxy but not SOCKS5. The default address is <code>127.0.0.1:8080</code>; IP and port can be changed. Click ✕ to remove the HTTP inbound.</p>

<h3>VLESS</h3>
<p>This section holds one or more VLESS URIs — one per outbound connection. Each entry has an optional <strong>Name</strong> field and the <strong>VLESS URI</strong> itself. The name becomes the outbound tag used in routing rules; if left empty, tags are assigned automatically: <code>proxy</code> for the first entry, <code>proxy2</code>, <code>proxy3</code>, … for subsequent ones.</p>
<p>Click <strong>+ Add VLESS</strong> to add another server. Click ✕ to remove an entry. The following URI formats are supported:</p>
<ul>
  <li><strong>TCP</strong> — plain TCP transport, with or without TLS/Reality:<br><code>vless://uuid@host:port?security=reality&amp;flow=xtls-rprx-vision&amp;pbk=...&amp;sid=...&amp;fp=chrome#name</code></li>
  <li><strong>WebSocket (WS)</strong> — WebSocket transport, typically with TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=ws&amp;path=/ws&amp;host=example.com#name</code></li>
  <li><strong>XHTTP / SplitHTTP</strong> — HTTP-based multiplexed transport:<br><code>vless://uuid@host:port?security=tls&amp;type=xhttp&amp;path=/&amp;mode=auto#name</code></li>
  <li><strong>gRPC</strong> — gRPC transport with optional multi-mode:<br><code>vless://uuid@host:port?security=tls&amp;type=grpc&amp;serviceName=myservice#name</code></li>
  <li><strong>HTTP/2 (h2)</strong> — HTTP/2 transport with TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=h2&amp;path=/&amp;host=example.com#name</code></li>
</ul>
<p>Supported security types: <code>none</code>, <code>tls</code>, <code>reality</code>. The fragment after <code>#</code> is used as a human-readable comment in the config.</p>

<h3>Balancer</h3>
<p>When you have multiple VLESS entries, the <strong>Balancer</strong> section lets you distribute traffic across them automatically instead of routing everything to a single server.</p>
<p>Enable the balancer to add a virtual <code>balancer</code> outbound that can be selected as the action for routing rules and as the default outbound. xray-core will route each connection through one of the VLESS servers according to the chosen strategy:</p>
<ul>
  <li><strong>random</strong> — each connection is sent to a randomly selected server. Simple and fair distribution; no latency measurement required.</li>
  <li><strong>leastPing</strong> — each connection is sent to the server with the lowest measured latency. Requires <strong>observatory</strong>, which periodically probes all servers. Set the probe URL and interval as needed.</li>
</ul>
<p>When the balancer is disabled, all routing rules and the default outbound refer to individual server tags directly.</p>

<h3>Databases</h3>
<p>This section lists the geo databases available on the server. They are used when configuring routing rules and DNS rules to match traffic by country, region, or category.</p>

<h3>Sniffing</h3>
<p>Sniffing allows xray-core to inspect the first bytes of inbound traffic and determine the application-layer protocol. The detected protocol can be used for more precise routing (e.g. routing BitTorrent separately from HTTPS) and, if needed, to override the destination address extracted from the protocol handshake.</p>

<p><strong>Enable sniffing</strong> — when disabled, xray-core forwards traffic as-is without protocol detection. Enabled by default.</p>

<p><strong>Detect protocols (destOverride)</strong> — the protocols xray-core will attempt to identify:</p>
<ul>
  <li><code>http</code> — plain HTTP/1.x traffic (port 80 and others).</li>
  <li><code>tls</code> — TLS handshake; xray-core extracts the SNI (server name) from ClientHello for routing. Recommended to keep enabled.</li>
  <li><code>quic</code> — QUIC/HTTP3 traffic.</li>
  <li><code>bittorrent</code> — BitTorrent protocol; required if you want to route or block torrents by protocol.</li>
</ul>

<p><strong>Route only (routeOnly)</strong> — when enabled, the detected protocol is used for routing decisions only. xray-core will <em>not</em> replace the original destination address with the one extracted from the protocol handshake. Useful when you want protocol-aware routing without affecting the destination.</p>

<h3>Routing</h3>
<p>Routing determines how xray-core handles each connection — whether to send it through the proxy, route it directly, or block it entirely. If the section is disabled, all traffic goes through the proxy without any filtering.</p>

<p><strong>Presets</strong> — ready-made rule sets that can be combined. Click <em>Presets</em> to open the list and check one or more:</p>
<ul>
  <li><strong>Russia</strong> — route local and Russian traffic directly, block ads. Sets default outbound to <code>proxy</code>.</li>
  <li><strong>Iran</strong> — route local and Iranian traffic directly (requires <code>geoip_IR.dat</code> / <code>geosite_IR.dat</code>).</li>
  <li><strong>Block ads</strong> — block domains in <code>category-ads-all</code>.</li>
  <li><strong>All through proxy</strong> — enable routing with default outbound <code>proxy</code>, no additional rules.</li>
  <li><strong>Block BitTorrent</strong> — add a protocol-level rule that blocks all BitTorrent traffic.</li>
</ul>
<p>Presets add rules without replacing existing ones. Duplicate rules are skipped. Unchecking a preset removes only the rules it added. Use <em>Clear rules</em> to reset everything at once.</p>

<p><strong>Default outbound</strong> is the action applied to traffic that does not match any rule. The dropdown lists your VLESS server tags (e.g. <code>proxy</code>, <code>proxy2</code>, …), <code>direct</code>, and — if the Balancer is enabled — <code>balancer</code>:</p>
<ul>
  <li>A <strong>VLESS tag</strong> — send unmatched traffic through that specific server.</li>
  <li><code>direct</code> — send unmatched traffic directly without the tunnel (recommended when you only want specific traffic proxied).</li>
  <li><code>balancer</code> — distribute unmatched traffic across all servers according to the balancer strategy (available only when the Balancer section is enabled).</li>
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
  <li><strong>Action</strong> — what to do with matching traffic: a VLESS server tag (e.g. <code>proxy</code>, <code>proxy2</code>), <code>direct</code>, <code>block</code>, or <code>balancer</code> (when the Balancer is enabled).</li>
</ul>
<p>A typical setup: apply the <em>Russia</em> preset and set the default outbound to the first VLESS server tag (<code>proxy</code>).</p>

<h3>DNS</h3>
<p>This section lets you configure a custom DNS resolver for xray-core. When disabled, the system DNS is used. Configuring DNS is recommended to avoid leaks and to direct different domains to different resolvers.</p>

<p><strong>Fallback DNS</strong> — the resolver used when no DNS rule matches the queried domain. Choose one of the presets (Google, Cloudflare, Yandex) or enter a custom address.</p>

<p><strong>Query strategy</strong> — controls which IP versions xray-core requests from DNS:</p>
<ul>
  <li><code>UseIPv4</code> — request only A records (IPv4). Recommended for most setups.</li>
  <li><code>UseIPv6</code> — request only AAAA records (IPv6).</li>
  <li><code>UseIP</code> — request both A and AAAA records.</li>
  <li><code>ForceIPv4</code> / <code>ForceIPv6</code> / <code>ForceIP</code> — same as above, but also override the result even if the server returns the opposite record type.</li>
  <li><code>useSystem</code> — delegate all DNS resolution to the operating system.</li>
</ul>

<p><strong>Domain strategy</strong> — controls how xray-core resolves domains when applying DNS rules, using the same logic as the routing domain strategy (<code>IPIfNonMatch</code>, <code>IPOnDemand</code>, <code>AsIs</code>).</p>

<p><strong>DNS servers</strong> — the list of resolvers xray-core will use. Each server can be:</p>
<ul>
  <li>A <strong>preset</strong> — Google DoH, Cloudflare DoH, Yandex DoH (all use IP addresses to avoid bootstrap dependency), or their plain DNS counterparts.</li>
  <li>A <strong>custom</strong> server — enter a name (used as a label in rules) and an address: a plain IP (<code>8.8.8.8</code>) or a DoH URL (<code>https://1.1.1.1/dns-query</code>).</li>
</ul>
<p>Each preset can appear in the list only once. When you click <em>Add server</em>, the first preset not yet in the list is selected automatically. Changing an existing server to a preset already present shows an error and reverts the selection.</p>

<p><strong>DNS rules</strong> work the same way as routing rules, but instead of an action they point to one of the configured DNS servers. Each rule consists of a database, one or more tags, and the target server. For example, you can send all <code>ru</code> domains to Yandex DNS and resolve everything else via Cloudflare DoH.</p>

<h3>Mux</h3>
<p>Mux (multiplexing) packs multiple logical streams into a single physical TCP connection to the server. Instead of opening a new connection for every request — each with its own TLS handshake — xray-core reuses one connection, reducing latency for short, frequent requests (browser tabs, API calls).</p>
<p>Mux is most effective on high-latency connections where each handshake adds a noticeable delay. For large file transfers or streaming it may hurt performance due to head-of-line blocking — all streams share the same pipe.</p>
<p><strong>⚠ Incompatible with Reality + XTLS flow (<code>xtls-rprx-vision</code>).</strong> If your VLESS URI uses Reality security with <code>flow=xtls-rprx-vision</code>, the Mux setting is silently ignored and no <code>mux</code> block is written to the config.</p>
<p><strong>Concurrency</strong> — the maximum number of concurrent TCP streams multiplexed into one connection. Default: 8.</p>
<p><strong>XUDP concurrency</strong> — the same limit for UDP streams (XUDP protocol). Default: 8.</p>
<p><strong>UDP/443 (QUIC)</strong> — controls how xray-core handles QUIC traffic (UDP port 443):</p>
<ul>
  <li><code>reject</code> — block QUIC; the client falls back to TCP/TLS. Recommended in most cases.</li>
  <li><code>allow</code> — proxy QUIC through the tunnel.</li>
  <li><code>skip</code> — let QUIC pass directly without going through the tunnel.</li>
</ul>

<h3>Import config.json</h3>
<p>The <strong>Import config.json</strong> button lets you load an existing <code>config.json</code> file back into the form. Click the button and select the file — all fields (inbound, VLESS URI, routing rules, DNS configuration, and logging settings) are populated automatically from the file. You can then adjust the configuration and regenerate an updated <code>config.json</code>.</p>
<p>Only files generated by this tool are guaranteed to import correctly. Manually edited configs may import partially if they use structures not produced by the generator.</p>

<h3>Share</h3>
<p>The <strong>Share</strong> button encodes the entire form state — VLESS URI, inbound settings, routing rules, DNS configuration, and logging options — into a URL-safe parameter (<code>?s=…</code>) and copies the link to the clipboard. Opening the link on any device restores the exact configuration. The parameter is removed from the address bar after the state is restored.</p>

<h3>Logging</h3>
<p>When enabled, xray-core writes access and error events to a log file. This is useful for diagnosing connection issues.</p>

<p><strong>Log directory</strong> — the path to the folder where the log file (<code>xray-core.log</code>) will be created. The directory must be created manually on the client machine before starting xray-core — it will not be created automatically. Leave the field empty to output logs to stdout/stderr instead of a file.</p>

<p><strong>Log level</strong> — controls the verbosity of the log:</p>
<ul>
  <li><code>debug</code> — maximum detail, including internal xray-core events. Use only for troubleshooting.</li>
  <li><code>info</code> — general information about connections and server activity.</li>
  <li><code>warning</code> — only potentially problematic events. Recommended for normal use.</li>
  <li><code>error</code> — only critical errors that prevent xray-core from functioning correctly.</li>
  <li><code>none</code> — logging disabled entirely.</li>
</ul>
`,
        remove_title:           'Remove',
        err_vless_prefix:       'VLESS URI must start with vless://',
        err_server:             'Could not connect to server: ',
        err_server_status:      'Server error: ',
        theme_to_light:         'Switch to light theme',
        theme_to_dark:          'Switch to dark theme',
        preset_btn:             'Presets',
        preset_russia:          'Russia',
        preset_iran:            'Iran',
        preset_ads:             'Block ads',
        preset_all_proxy:       'All through proxy',
        preset_bittorrent:      'Block BitTorrent',
        share_btn:              'Share',
        share_copied:           '✓ Link copied',
        clear_rules_btn:        '✕ Clear rules',
        import_btn:             'Import config.json',
        import_error:           'Could not read the file. Make sure it is a valid config.json generated by this tool.',
        dns_server_duplicate:   'This DNS server is already in the list.',
        add_http_inbound_btn:     '+ Add HTTP inbound',
        http_inbound_ip_hint:     'HTTP proxy address',
        http_inbound_port_hint:   'HTTP proxy port',
        mux_enabled_label:              'Enable Mux (multiplexing)',
        mux_concurrency_label:          'Concurrency',
        mux_concurrency_hint:           'Max concurrent TCP streams per connection (recommended: 8)',
        mux_xudp_concurrency_label:     'XUDP concurrency',
        mux_xudp_concurrency_hint:      'Max concurrent UDP streams per connection (recommended: 8)',
        mux_xudp_proxy_udp443_label:    'UDP/443 (QUIC)',
        mux_xudp_proxy_udp443_hint:     'How to handle QUIC traffic: reject — block, allow — proxy, skip — send directly',
        sniffing_enabled_label:       'Enable sniffing',
        sniffing_dest_override_label: 'Detect protocols (destOverride)',
        sniffing_dest_override_hint:  'Protocols xray-core will sniff for on inbound traffic',
        sniffing_route_only_label:    'Route only (routeOnly)',
        sniffing_route_only_hint:     'Use detected protocol for routing only, without overriding the destination address',
        add_vless_btn:                '+ Add VLESS',
        balancer_enabled_label:       'Enable load balancing',
        balancer_strategy_label:      'Strategy',
        balancer_strategy_hint:       'random: distribute connections equally across all servers; leastPing: route to the fastest server (requires observatory)',
        observatory_probe_url_label:      'Probe URL',
        observatory_probe_url_hint:       'URL used to measure connection latency to each server',
        observatory_probe_interval_label: 'Probe interval',
        observatory_probe_interval_hint:  'How often to probe each server (e.g. 10s, 1m)',
        err_no_vless:                 'At least one VLESS URI is required (must start with vless://)',
    },
    ru: {
        subtitle:               'Генератор <code>config.json</code> для xray-core из VLESS URI',
        inbound_ip_label:       'IP-адрес',
        inbound_ip_hint:        'Адрес SOCKS5',
        inbound_port_label:     'Порт',
        inbound_port_hint:      'Порт SOCKS5',
        vless_link_label:       'VLESS URI',
        vless_link_hint:        'VLESS URI',
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
<p>Для базовой настройки достаточно вставить <strong>VLESS URI</strong> в соответствующее поле и нажать <strong>«Сгенерировать config.json»</strong>. Файл сразу готов к использованию с xray-core.</p>
<p>Тем не менее мы рекомендуем уделить несколько минут более тонкой настройке клиента. Доступные параметры описаны ниже.</p>

<p><strong>Как маршрутизация и DNS зависят друг от друга:</strong></p>
<ul>
  <li>Без <strong>маршрутизации</strong> — весь трафик уходит через прокси без какой-либо фильтрации. Клиент не различает локальный, иностранный или нежелательный трафик.</li>
  <li>Без <strong>DNS</strong> — xray-core использует системный DNS-резолвер. DNS-запросы выполняются вне туннеля и могут быть видны провайдеру (утечка DNS). Правила маршрутизации, зависящие от резолвинга доменов (стратегии <code>IPIfNonMatch</code> / <code>IPOnDemand</code>), будут использовать системный резолвер, что может давать некорректные результаты.</li>
  <li><strong>Маршрутизация без DNS</strong> — работает, но доменная маршрутизация зависит от системного резолвера. Есть риск утечки DNS-запросов.</li>
  <li><strong>DNS без маршрутизации</strong> — xray-core использует настроенные резолверы, но весь трафик всё равно идёт через прокси. Защита от утечек DNS работает, разделение трафика — нет.</li>
  <li><strong>Оба включены</strong> — полный контроль: трафик разделяется по правилам, DNS-запросы обрабатываются настроенными резолверами. Это рекомендуемая конфигурация.</li>
</ul>

<h3>Inbound</h3>
<p><strong>Inbound</strong> определяет локальный прокси, который xray-core открывает на вашем устройстве. Приложения (браузер, система) подключаются к нему, а xray-core пересылает их трафик через VLESS-туннель.</p>
<p><strong>IP-адрес</strong> определяет, на каком сетевом интерфейсе xray-core будет принимать подключения:</p>
<ul>
  <li><code>127.0.0.1</code> — рекомендуется для личных устройств (компьютеры, ноутбуки, телефоны). Подключиться к прокси может только само устройство; из локальной сети он недоступен.</li>
  <li><code>0.0.0.0</code> — прослушивает все доступные IP-адреса на устройстве. Другие устройства в той же сети смогут использовать этот прокси. Используйте осторожно.</li>
</ul>
<p><strong>Порт</strong> — локальный порт, на котором слушает SOCKS5-прокси. Значение по умолчанию <code>10808</code> подходит в большинстве случаев; измените его при конфликте с другим приложением.</p>
<p><strong>HTTP inbound</strong> — нажмите <em>Добавить HTTP inbound</em>, чтобы добавить второй локальный прокси, принимающий запросы HTTP CONNECT, в дополнение к SOCKS5. Это полезно для приложений, которые поддерживают HTTP-прокси, но не поддерживают SOCKS5. Адрес по умолчанию: <code>127.0.0.1:8080</code>; IP и порт настраиваются. Нажмите ✕, чтобы удалить HTTP inbound.</p>

<h3>VLESS</h3>
<p>В этом разделе можно добавить один или несколько VLESS URI — по одному на каждый удалённый сервер. Каждая запись состоит из необязательного поля <strong>Имя</strong> и самого <strong>VLESS URI</strong>. Имя становится тегом outbound, который используется в правилах маршрутизации; если поле оставить пустым, теги назначаются автоматически: <code>proxy</code> для первой записи, <code>proxy2</code>, <code>proxy3</code>, … для последующих.</p>
<p>Нажмите <strong>+ Добавить VLESS</strong>, чтобы добавить ещё один сервер. Нажмите ✕, чтобы удалить запись. Поддерживаются следующие форматы URI:</p>
<ul>
  <li><strong>TCP</strong> — TCP-транспорт с TLS или Reality:<br><code>vless://uuid@host:port?security=reality&amp;flow=xtls-rprx-vision&amp;pbk=...&amp;sid=...&amp;fp=chrome#name</code></li>
  <li><strong>WebSocket (WS)</strong> — WebSocket-транспорт, как правило с TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=ws&amp;path=/ws&amp;host=example.com#name</code></li>
  <li><strong>XHTTP / SplitHTTP</strong> — мультиплексированный HTTP-транспорт:<br><code>vless://uuid@host:port?security=tls&amp;type=xhttp&amp;path=/&amp;mode=auto#name</code></li>
  <li><strong>gRPC</strong> — gRPC-транспорт с опциональным multi-режимом:<br><code>vless://uuid@host:port?security=tls&amp;type=grpc&amp;serviceName=myservice#name</code></li>
  <li><strong>HTTP/2 (h2)</strong> — HTTP/2-транспорт с TLS:<br><code>vless://uuid@host:port?security=tls&amp;type=h2&amp;path=/&amp;host=example.com#name</code></li>
</ul>
<p>Поддерживаемые типы безопасности: <code>none</code>, <code>tls</code>, <code>reality</code>. Фрагмент после <code>#</code> используется как читаемый комментарий в конфиге.</p>

<h3>Balancer</h3>
<p>При наличии нескольких VLESS-записей раздел <strong>Balancer</strong> позволяет автоматически распределять трафик между серверами, не настраивая маршрутизацию вручную.</p>
<p>При включении балансировщика появляется виртуальный outbound <code>balancer</code>, который можно выбрать в правилах маршрутизации и в качестве маршрута по умолчанию. xray-core будет направлять соединения на серверы в соответствии с выбранной стратегией:</p>
<ul>
  <li><strong>random</strong> — каждое соединение направляется на случайно выбранный сервер. Простое и равномерное распределение; измерение задержки не требуется.</li>
  <li><strong>leastPing</strong> — каждое соединение направляется на сервер с наименьшей измеренной задержкой. Требует <strong>observatory</strong>, который периодически проверяет доступность серверов. Настройте URL и интервал проверки при необходимости.</li>
</ul>
<p>При отключённом балансировщике правила маршрутизации и маршрут по умолчанию ссылаются непосредственно на теги отдельных серверов.</p>

<h3>Databases</h3>
<p>В этом разделе отображается список геобаз данных, доступных на сервере. Они используются при настройке правил маршрутизации и DNS для сопоставления трафика по стране, региону или категории.</p>

<h3>Sniffing</h3>
<p>Сниффинг позволяет xray-core анализировать первые байты входящего трафика и определять протокол прикладного уровня. Определённый протокол можно использовать для более точной маршрутизации (например, отдельно обрабатывать BitTorrent и HTTPS), а при необходимости — подменять адрес назначения, извлечённый из рукопожатия протокола.</p>

<p><strong>Включить сниффинг</strong> — при отключении xray-core передаёт трафик как есть, без определения протокола. Включён по умолчанию.</p>

<p><strong>Определять протоколы (destOverride)</strong> — протоколы, которые xray-core будет пытаться идентифицировать:</p>
<ul>
  <li><code>http</code> — обычный HTTP/1.x-трафик (порт 80 и другие).</li>
  <li><code>tls</code> — TLS-рукопожатие; xray-core извлекает SNI (имя сервера) из ClientHello для маршрутизации. Рекомендуется оставить включённым.</li>
  <li><code>quic</code> — трафик QUIC/HTTP3.</li>
  <li><code>bittorrent</code> — протокол BitTorrent; необходим, если вы хотите маршрутизировать или блокировать торренты по протоколу.</li>
</ul>

<p><strong>Только для маршрутизации (routeOnly)</strong> — при включении определённый протокол используется только для принятия решений о маршрутизации. xray-core <em>не будет</em> подменять оригинальный адрес назначения на тот, что извлечён из рукопожатия. Удобно, когда нужна маршрутизация по протоколу без изменения адреса назначения.</p>

<h3>Routing</h3>
<p>Маршрутизация определяет, как xray-core обрабатывает каждое соединение — отправить через прокси, пустить напрямую или заблокировать. Если раздел отключён, весь трафик идёт через прокси без фильтрации.</p>

<p><strong>Пресеты</strong> — готовые наборы правил, которые можно комбинировать. Нажмите <em>Пресеты</em> и отметьте нужные галочками:</p>
<ul>
  <li><strong>Россия</strong> — локальный и российский трафик напрямую, реклама заблокирована. Устанавливает маршрут по умолчанию <code>proxy</code>.</li>
  <li><strong>Иран</strong> — локальный и иранский трафик напрямую (требует <code>geoip_IR.dat</code> / <code>geosite_IR.dat</code>).</li>
  <li><strong>Блокировать рекламу</strong> — блокирует домены из <code>category-ads-all</code>.</li>
  <li><strong>Всё через прокси</strong> — включает маршрутизацию с маршрутом по умолчанию <code>proxy</code>, без добавления правил.</li>
  <li><strong>Блокировать BitTorrent</strong> — добавляет правило блокировки всего BitTorrent-трафика на уровне протокола.</li>
</ul>
<p>Пресеты добавляют правила, не удаляя существующие. Дубликаты пропускаются. При отключении пресета удаляются только добавленные им правила. Кнопка <em>Очистить правила</em> сбрасывает всё сразу.</p>

<p><strong>Маршрут по умолчанию</strong> — действие для трафика, который не попал ни под одно правило. В выпадающем списке отображаются теги VLESS-серверов (например, <code>proxy</code>, <code>proxy2</code>, …), <code>direct</code>, и — если включён Balancer — <code>balancer</code>:</p>
<ul>
  <li><strong>Тег VLESS-сервера</strong> — пустить несовпавший трафик через этот конкретный сервер.</li>
  <li><code>direct</code> — пустить несовпавший трафик напрямую без туннеля (рекомендуется, если через прокси нужен только отдельный трафик).</li>
  <li><code>balancer</code> — распределять несовпавший трафик по всем серверам в соответствии со стратегией балансировщика (доступно только при включённом разделе Balancer).</li>
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
  <li><strong>Действие</strong> — что делать с совпавшим трафиком: тег VLESS-сервера (например, <code>proxy</code>, <code>proxy2</code>), <code>direct</code>, <code>block</code> или <code>balancer</code> (при включённом Balancer).</li>
</ul>
<p>Типичная настройка: применить пресет <em>Россия</em> и установить маршрут по умолчанию в тег первого VLESS-сервера (<code>proxy</code>).</p>

<h3>DNS</h3>
<p>Раздел позволяет настроить собственный DNS-резолвер для xray-core. Если раздел отключён, используется системный DNS. Настройка DNS рекомендуется для предотвращения утечек и для направления разных доменов в разные резолверы.</p>

<p><strong>Резервный DNS</strong> — резолвер, который используется когда ни одно DNS-правило не совпало с запрашиваемым доменом. Выберите один из пресетов (Google, Cloudflare, Yandex) или введите свой адрес.</p>

<p><strong>Стратегия запросов</strong> — определяет, какие типы IP-адресов xray-core запрашивает у DNS:</p>
<ul>
  <li><code>UseIPv4</code> — запрашивать только A-записи (IPv4). Рекомендуется для большинства случаев.</li>
  <li><code>UseIPv6</code> — запрашивать только AAAA-записи (IPv6).</li>
  <li><code>UseIP</code> — запрашивать и A, и AAAA-записи.</li>
  <li><code>ForceIPv4</code> / <code>ForceIPv6</code> / <code>ForceIP</code> — то же, что выше, но результат принудительно приводится к нужному типу, даже если сервер вернул другой.</li>
  <li><code>useSystem</code> — передать все DNS-запросы операционной системе.</li>
</ul>

<p><strong>Стратегия доменов</strong> — определяет, как xray-core резолвит домены при применении DNS-правил, по той же логике, что и стратегия доменов в маршрутизации (<code>IPIfNonMatch</code>, <code>IPOnDemand</code>, <code>AsIs</code>).</p>

<p><strong>DNS-серверы</strong> — список резолверов, которые будет использовать xray-core. Каждый сервер может быть:</p>
<ul>
  <li><strong>Пресетом</strong> — Google DoH, Cloudflare DoH, Yandex DoH (все используют IP-адреса, чтобы не зависеть от начального резолвера) или их обычные DNS-аналоги.</li>
  <li><strong>Кастомным</strong> — укажите имя (используется как метка в правилах) и адрес: обычный IP (<code>8.8.8.8</code>) или DoH URL (<code>https://1.1.1.1/dns-query</code>).</li>
</ul>
<p>Каждый пресет можно добавить только один раз. При нажатии <em>Добавить сервер</em> автоматически выбирается первый незанятый пресет. При попытке вручную выбрать пресет, который уже есть в списке, выводится ошибка и выбор возвращается к предыдущему значению.</p>

<p><strong>Правила DNS</strong> работают так же, как правила маршрутизации, но вместо действия указывают на один из настроенных DNS-серверов. Каждое правило состоит из базы данных, одного или нескольких тегов и целевого сервера. Например, можно отправлять все домены зоны <code>ru</code> на Yandex DNS, а всё остальное резолвить через Cloudflare DoH.</p>

<h3>Mux</h3>
<p>Mux (мультиплексирование) упаковывает несколько логических потоков в одно физическое TCP-соединение с сервером. Вместо того чтобы открывать новое соединение на каждый запрос — с отдельным TLS-рукопожатием — xray-core переиспользует одно соединение, снижая задержку для коротких и частых запросов (вкладки браузера, API-вызовы).</p>
<p>Mux наиболее эффективен при высоком пинге до сервера, где каждое рукопожатие ощутимо замедляет работу. При передаче больших файлов или стриминге он может снизить производительность из-за блокировки начала очереди (head-of-line blocking) — все потоки делят один канал.</p>
<p><strong>⚠ Несовместим с Reality + XTLS flow (<code>xtls-rprx-vision</code>).</strong> Если VLESS URI использует безопасность Reality с параметром <code>flow=xtls-rprx-vision</code>, настройка Mux игнорируется и блок <code>mux</code> в конфиг не записывается.</p>
<p><strong>Concurrency</strong> — максимальное число TCP-потоков, одновременно мультиплексируемых в одном соединении. По умолчанию: 8.</p>
<p><strong>XUDP concurrency</strong> — то же ограничение для UDP-потоков (протокол XUDP). По умолчанию: 8.</p>
<p><strong>UDP/443 (QUIC)</strong> — определяет, как xray-core обрабатывает QUIC-трафик (UDP-порт 443):</p>
<ul>
  <li><code>reject</code> — блокировать QUIC; клиент переключится на TCP/TLS. Рекомендуется в большинстве случаев.</li>
  <li><code>allow</code> — проксировать QUIC через туннель.</li>
  <li><code>skip</code> — пустить QUIC напрямую, без туннеля.</li>
</ul>

<h3>Импортировать config.json</h3>
<p>Кнопка <strong>Импортировать config.json</strong> позволяет загрузить существующий файл <code>config.json</code> обратно в форму. Нажмите кнопку и выберите файл — все поля (inbound, VLESS URI, правила маршрутизации, DNS и журналирование) будут заполнены автоматически. После этого можно скорректировать настройки и сгенерировать обновлённый <code>config.json</code>.</p>
<p>Корректный импорт гарантирован только для файлов, созданных этим инструментом. Конфиги, отредактированные вручную, могут импортироваться частично, если содержат структуры, которые генератор не производит.</p>

<h3>Поделиться</h3>
<p>Кнопка <strong>Поделиться</strong> кодирует всё состояние формы — VLESS URI, настройки inbound, правила маршрутизации, конфигурацию DNS и параметры журналирования — в URL-безопасный параметр (<code>?s=…</code>) и копирует ссылку в буфер обмена. При открытии ссылки на любом устройстве конфигурация восстанавливается автоматически. Параметр удаляется из адресной строки после восстановления.</p>

<h3>Logging</h3>
<p>При включении xray-core записывает события доступа и ошибки в лог-файл. Это удобно для диагностики проблем с подключением.</p>

<p><strong>Каталог журналов</strong> — путь к папке, в которой будет создан файл журнала (<code>xray-core.log</code>). Каталог необходимо создать вручную на клиентском устройстве до запуска xray-core — он не будет создан автоматически. Оставьте поле пустым, чтобы выводить логи в stdout/stderr вместо файла.</p>

<p><strong>Уровень журналирования</strong> — управляет детализацией лога:</p>
<ul>
  <li><code>debug</code> — максимальная детализация, включая внутренние события xray-core. Используйте только при отладке.</li>
  <li><code>info</code> — общая информация о соединениях и активности сервера.</li>
  <li><code>warning</code> — только потенциально проблемные события. Рекомендуется для обычного использования.</li>
  <li><code>error</code> — только критические ошибки, препятствующие корректной работе xray-core.</li>
  <li><code>none</code> — журналирование полностью отключено.</li>
</ul>
`,
        remove_title:           'Удалить',
        err_vless_prefix:       'VLESS URI должен начинаться с vless://',
        err_server:             'Не удалось связаться с сервером: ',
        err_server_status:      'Ошибка сервера: ',
        theme_to_light:         'Светлая тема',
        theme_to_dark:          'Тёмная тема',
        preset_btn:             'Пресеты',
        preset_russia:          'Россия',
        preset_iran:            'Иран',
        preset_ads:             'Блокировать рекламу',
        preset_all_proxy:       'Всё через прокси',
        preset_bittorrent:      'Блокировать BitTorrent',
        share_btn:              'Поделиться',
        share_copied:           '✓ Ссылка скопирована',
        clear_rules_btn:        '✕ Очистить правила',
        import_btn:             'Импортировать config.json',
        import_error:           'Не удалось прочитать файл. Убедитесь, что это корректный config.json, созданный этим инструментом.',
        dns_server_duplicate:   'Этот DNS-сервер уже есть в списке.',
        add_http_inbound_btn:     '+ Добавить HTTP inbound',
        http_inbound_ip_hint:     'Адрес HTTP-прокси',
        http_inbound_port_hint:   'Порт HTTP-прокси',
        mux_enabled_label:              'Включить Mux (мультиплексирование)',
        mux_concurrency_label:          'Concurrency',
        mux_concurrency_hint:           'Макс. число TCP-потоков в одном соединении (рекомендуется: 8)',
        mux_xudp_concurrency_label:     'XUDP concurrency',
        mux_xudp_concurrency_hint:      'Макс. число UDP-потоков в одном соединении (рекомендуется: 8)',
        mux_xudp_proxy_udp443_label:    'UDP/443 (QUIC)',
        mux_xudp_proxy_udp443_hint:     'Обработка QUIC-трафика: reject — блокировать, allow — проксировать, skip — пускать напрямую',
        sniffing_enabled_label:       'Включить сниффинг',
        sniffing_dest_override_label: 'Определять протоколы (destOverride)',
        sniffing_dest_override_hint:  'Протоколы, которые xray-core будет определять во входящем трафике',
        sniffing_route_only_label:    'Только для маршрутизации (routeOnly)',
        sniffing_route_only_hint:     'Использовать определённый протокол только для маршрутизации, без подмены адреса назначения',
        add_vless_btn:                '+ Добавить VLESS',
        balancer_enabled_label:       'Включить балансировку нагрузки',
        balancer_strategy_label:      'Стратегия',
        balancer_strategy_hint:       'random: распределять соединения равномерно по всем серверам; leastPing: направлять на самый быстрый сервер (требует observatory)',
        observatory_probe_url_label:      'URL проверки',
        observatory_probe_url_hint:       'URL для измерения задержки до каждого сервера',
        observatory_probe_interval_label: 'Интервал проверки',
        observatory_probe_interval_hint:  'Как часто проверять серверы (например, 10s, 1m)',
        err_no_vless:                 'Требуется хотя бы один VLESS URI (должен начинаться с vless://)',
    },
};
