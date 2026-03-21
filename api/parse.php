<?php
declare(strict_types=1);
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

function err(string $msg): never {
    http_response_code(400);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Input -----------------------------------------------------------------

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);

if (!is_array($in)) {
    err('Invalid JSON in request body');
}

$inboundIp       = trim((string)($in['inbound_ip']       ?? ''));
$inboundPort     = (int)($in['inbound_port']             ?? 0);
$socks5Auth      = (bool)($in['socks5_auth']             ?? false);
$socks5User      = trim((string)($in['socks5_user']      ?? ''));
$socks5Pass      = (string)($in['socks5_pass']           ?? '');
$routingEnabled  = (bool)($in['routing_enabled']         ?? false);
$blockBittorrent = (bool)($in['block_bittorrent']        ?? false);
$domainStrategy  = in_array($in['domain_strategy'] ?? '', ['IPIfNonMatch', 'IPOnDemand', 'AsIs'], true)
    ? $in['domain_strategy'] : 'IPIfNonMatch';
$routingRules    = is_array($in['routing_rules'] ?? null) ? $in['routing_rules'] : [];

// Multi-VLESS: support new vless_entries array and legacy vless_link
$rawVlessEntries = is_array($in['vless_entries'] ?? null) ? $in['vless_entries'] : null;
if ($rawVlessEntries === null && isset($in['vless_link'])) {
    $rawVlessEntries = [['name' => '', 'uri' => trim((string)$in['vless_link'])]];
}
$rawVlessEntries = $rawVlessEntries ?? [];

$balancerEnabled          = (bool)($in['balancer_enabled'] ?? false);
$balancerStrategy         = in_array($in['balancer_strategy'] ?? '', ['random', 'leastPing'], true)
    ? $in['balancer_strategy'] : 'random';
$observatoryProbeUrl      = trim((string)($in['observatory_probe_url']      ?? 'https://www.google.com/generate_204'));
$observatoryProbeInterval = trim((string)($in['observatory_probe_interval'] ?? '10s'));
$dnsEnabled      = (bool)($in['dns_enabled']  ?? false);
$dnsQueryStrategy = in_array($in['dns_query_strategy'] ?? '', ['UseIP', 'UseIPv4', 'UseIPv6', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'useSystem'], true)
    ? $in['dns_query_strategy'] : 'UseIPv4';
$dnsDomainStrategy = in_array($in['dns_domain_strategy'] ?? '', ['AsIs', 'IPIfNonMatch', 'IPOnDemand'], true)
    ? $in['dns_domain_strategy'] : 'IPIfNonMatch';
$dnsFallback     = trim((string)($in['dns_fallback'] ?? ''));
$dnsServers      = is_array($in['dns_servers'] ?? null) ? $in['dns_servers'] : [];
$dnsRules        = is_array($in['dns_rules']   ?? null) ? $in['dns_rules']   : [];
$logEnabled      = (bool)($in['log_enabled'] ?? false);
$logDir          = trim((string)($in['log_dir'] ?? ''));
$logLevel        = in_array($in['log_level'] ?? '', ['debug', 'info', 'warning', 'error', 'none'], true)
    ? $in['log_level'] : 'warning';
$httpInboundEnabled = (bool)($in['http_inbound_enabled'] ?? false);
$httpInboundIp      = trim((string)($in['http_inbound_ip']   ?? '127.0.0.1'));
$httpInboundPort    = (int)($in['http_inbound_port']          ?? 8080);
$muxEnabled           = (bool)($in['mux_enabled'] ?? false);
$muxConcurrency       = (int)($in['mux_concurrency'] ?? 8);
$muxXudpConcurrency   = (int)($in['mux_xudp_concurrency'] ?? 8);
$muxXudpProxyUDP443   = in_array($in['mux_xudp_proxy_udp443'] ?? '', ['reject', 'allow', 'skip'], true)
    ? $in['mux_xudp_proxy_udp443'] : 'reject';
$sniffingEnabled      = (bool)($in['sniffing_enabled'] ?? true);
$sniffingDestOverride = is_array($in['sniffing_dest_override'] ?? null)
    ? array_values(array_filter(array_map('strval', $in['sniffing_dest_override']), fn($v) => in_array($v, ['http', 'tls', 'quic', 'bittorrent'], true)))
    : ['http', 'tls'];
$sniffingRouteOnly    = (bool)($in['sniffing_route_only'] ?? false);

if ($inboundIp === '' || filter_var($inboundIp, FILTER_VALIDATE_IP) === false) {
    err('Invalid inbound IP address');
}
if ($inboundPort < 1 || $inboundPort > 65535) {
    err('Inbound port must be in range 1–65535');
}

// Parse and validate VLESS entries
$vlessEntries = [];
foreach ($rawVlessEntries as $entry) {
    $uri  = trim((string)($entry['uri'] ?? ''));
    $name = trim((string)($entry['name'] ?? ''));
    if (!str_starts_with($uri, 'vless://')) continue;
    $vlessEntries[] = ['name' => $name, 'uri' => $uri, 'parsed' => parseVless($uri)];
}
if (empty($vlessEntries)) {
    err('At least one valid VLESS URI is required (must start with vless://)');
}

// Build outbound tags
$outboundTags = [];
foreach ($vlessEntries as $i => $entry) {
    $outboundTags[] = makeOutboundTag($entry['name'], $i);
}

// Validate default outbound against available tags
$validOutbounds = array_merge($outboundTags, ['direct']);
if ($balancerEnabled) $validOutbounds[] = 'balancer';
$rawDefault = $in['default_outbound'] ?? $outboundTags[0];
$defaultOutbound = in_array($rawDefault, $validOutbounds, true) ? $rawDefault : $outboundTags[0];

if ($httpInboundEnabled) {
    if (filter_var($httpInboundIp, FILTER_VALIDATE_IP) === false) {
        err('Invalid HTTP inbound IP address');
    }
    if ($httpInboundPort < 1 || $httpInboundPort > 65535) {
        err('HTTP inbound port must be in range 1–65535');
    }
}

// --- Build -----------------------------------------------------------------

$config = buildConfig($inboundIp, $inboundPort, $vlessEntries, $outboundTags, $routingEnabled, $routingRules, $blockBittorrent, $socks5Auth, $socks5User, $socks5Pass, $defaultOutbound, $domainStrategy, $logEnabled, $logDir, $logLevel, $dnsEnabled, $dnsQueryStrategy, $dnsDomainStrategy, $dnsFallback, $dnsServers, $dnsRules, $sniffingEnabled, $sniffingDestOverride, $sniffingRouteOnly, $httpInboundEnabled, $httpInboundIp, $httpInboundPort, $muxEnabled, $muxConcurrency, $muxXudpConcurrency, $muxXudpProxyUDP443, $balancerEnabled, $balancerStrategy, $observatoryProbeUrl, $observatoryProbeInterval);

echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

// ---------------------------------------------------------------------------

function makeOutboundTag(string $name, int $index): string
{
    $name = trim($name);
    if ($name === '') {
        return $index === 0 ? 'proxy' : 'proxy' . ($index + 1);
    }
    if (in_array(strtolower($name), ['direct', 'block', 'balancer'], true)) {
        err("The tag name \"$name\" is reserved (direct, block, balancer). Use a different name or leave it blank.");
    }
    return $name;
}

function parseVless(string $link): array
{
    $url = parse_url($link);

    if ($url === false || empty($url['host'])) {
        err('Failed to parse VLESS link');
    }

    $uuid = $url['user'] ?? '';
    if ($uuid === '' || !isValidUuid($uuid)) {
        err('UUID is invalid or missing');
    }

    parse_str($url['query'] ?? '', $q);

    $network  = $q['type']     ?? 'tcp';
    $security = $q['security'] ?? 'none';
    $flow     = $q['flow']     ?? '';

    // flow is not compatible with xhttp
    if ($network === 'xhttp') {
        $flow = '';
    }

    $result = [
        'uuid'             => $uuid,
        'host'             => $url['host'],
        'port'             => (int)($url['port'] ?? 443),
        'name'             => isset($url['fragment']) ? urldecode($url['fragment']) : '',
        'network'          => $network,
        'security'         => $security,
        'flow'             => $flow,
        'transport'        => parseTransport($network, $q, $url['host']),
        'securitySettings' => parseSecurity($security, $q, $url['host']),
    ];

    return $result;
}

/**
 * Parses transport-level parameters based on the network type.
 */
function parseTransport(string $network, array $q, string $remoteHost): array
{
    return match ($network) {
        'ws' => [
            'path' => $q['path'] ?? '/',
            'host' => $q['host'] ?? $remoteHost,
        ],
        'xhttp' => [
            'path' => $q['path'] ?? '/',
            'host' => $q['host'] ?? $remoteHost,
            'mode' => $q['mode'] ?? 'auto',
        ],
        'grpc' => [
            'serviceName' => $q['serviceName'] ?? $q['mode'] ?? '',
            'mode'        => $q['mode']        ?? 'gun',
        ],
        'h2' => [
            'path' => $q['path'] ?? '/',
            'host' => $q['host'] ?? $remoteHost,
        ],
        'tcp', 'kcp', 'quic' => [],
        default => [],
    };
}

/**
 * Parses security parameters (TLS / Reality).
 */
function parseSecurity(string $security, array $q, string $remoteHost): array
{
    return match ($security) {
        'reality' => [
            'serverName'  => $q['sni']  ?? $remoteHost,
            'fingerprint' => $q['fp']   ?? 'chrome',
            'publicKey'   => $q['pbk']  ?? '',
            'shortId'     => $q['sid']  ?? '',
            'spiderX'     => $q['spx']  ?? '',
        ],
        'tls' => [
            'serverName'    => $q['sni']              ?? $remoteHost,
            'fingerprint'   => $q['fp']               ?? '',
            'allowInsecure' => ($q['allowInsecure'] ?? '0') === '1',
            'alpn'          => isset($q['alpn']) ? explode(',', $q['alpn']) : [],
        ],
        default => [],
    };
}

// ---------------------------------------------------------------------------

function buildConfig(string $ip, int $port, array $vlessEntries, array $outboundTags, bool $routingEnabled = false, array $routingRules = [], bool $blockBittorrent = false, bool $socks5Auth = false, string $socks5User = '', string $socks5Pass = '', string $defaultOutbound = 'proxy', string $domainStrategy = 'IPIfNonMatch', bool $logEnabled = false, string $logDir = '', string $logLevel = 'warning', bool $dnsEnabled = false, string $dnsQueryStrategy = 'UseIPv4', string $dnsDomainStrategy = 'IPIfNonMatch', string $dnsFallback = '', array $dnsServers = [], array $dnsRules = [], bool $sniffingEnabled = true, array $sniffingDestOverride = ['http', 'tls'], bool $sniffingRouteOnly = false, bool $httpInboundEnabled = false, string $httpInboundIp = '127.0.0.1', int $httpInboundPort = 8080, bool $muxEnabled = false, int $muxConcurrency = 8, int $muxXudpConcurrency = 8, string $muxXudpProxyUDP443 = 'reject', bool $balancerEnabled = false, string $balancerStrategy = 'random', string $observatoryProbeUrl = 'https://www.google.com/generate_204', string $observatoryProbeInterval = '10s'): array
{
    $socksSettings = ['auth' => 'noauth', 'udp' => true];
    if ($socks5Auth && $socks5User !== '') {
        $socksSettings['auth']     = 'password';
        $socksSettings['accounts'] = [['user' => $socks5User, 'pass' => $socks5Pass]];
    }

    $inbound = [
        'tag'      => 'socks-in',
        'listen'   => $ip,
        'port'     => $port,
        'protocol' => 'socks',
        'settings' => $socksSettings,
    ];

    if ($sniffingEnabled && !empty($sniffingDestOverride)) {
        $sniffing = ['enabled' => true, 'destOverride' => array_values($sniffingDestOverride)];
        if ($sniffingRouteOnly) {
            $sniffing['routeOnly'] = true;
        }
        $inbound['sniffing'] = $sniffing;
    }

    // Build VLESS outbounds
    $vlessOutbounds = [];
    foreach ($vlessEntries as $i => $entry) {
        $v   = $entry['parsed'];
        $tag = $outboundTags[$i];

        $userEntry = ['id' => $v['uuid'], 'encryption' => 'none'];
        if ($v['flow'] !== '') {
            $userEntry['flow'] = $v['flow'];
        }

        $outbound = [
            'tag'            => $tag,
            'protocol'       => 'vless',
            'settings'       => [
                'vnext' => [[
                    'address' => $v['host'],
                    'port'    => $v['port'],
                    'users'   => [$userEntry],
                ]],
            ],
            'streamSettings' => buildStreamSettings($v),
        ];

        if ($v['name'] !== '') {
            $outbound['_comment'] = $v['name'];
        }

        // Mux is incompatible with Reality + XTLS flow — silently skip if that combination is used
        $isRealityFlow = $v['security'] === 'reality' && $v['flow'] !== '';
        if ($muxEnabled && !$isRealityFlow) {
            $outbound['mux'] = [
                'enabled'         => true,
                'concurrency'     => $muxConcurrency,
                'xudpConcurrency' => $muxXudpConcurrency,
                'xudpProxyUDP443' => $muxXudpProxyUDP443,
            ];
        }

        $vlessOutbounds[] = $outbound;
    }

    if ($logEnabled && $logDir !== '') {
        $logPath = rtrim($logDir, '/\\') . '/xray-core.log';
        $log = ['access' => $logPath, 'error' => $logPath, 'loglevel' => $logLevel];
    } elseif ($logEnabled) {
        $log = ['loglevel' => $logLevel];
    } else {
        $log = ['loglevel' => 'none'];
    }

    $inbounds = [$inbound];
    if ($httpInboundEnabled) {
        $inbounds[] = [
            'tag'      => 'http-in',
            'listen'   => $httpInboundIp,
            'port'     => $httpInboundPort,
            'protocol' => 'http',
        ];
    }

    $config = [
        'log'       => $log,
        'inbounds'  => $inbounds,
        'outbounds' => array_merge(
            $vlessOutbounds,
            [
                ['tag' => 'direct', 'protocol' => 'freedom'],
                ['tag' => 'block',  'protocol' => 'blackhole'],
            ]
        ),
    ];

    if ($routingEnabled) {
        $routing = buildRouting($routingRules, $blockBittorrent, $defaultOutbound, $domainStrategy, $outboundTags, $balancerEnabled, $balancerStrategy);
        if ($routing !== null) {
            $config['routing'] = $routing;
        }
    }

    if ($dnsEnabled) {
        $dns = buildDns($dnsServers, $dnsRules, $dnsFallback, $dnsQueryStrategy, $dnsDomainStrategy);
        if ($dns !== null) {
            $config['dns'] = $dns;
        }
    }

    // Observatory is needed for leastPing balancer strategy
    if ($balancerEnabled && $balancerStrategy === 'leastPing') {
        $config['observatory'] = [
            'subjectSelector'   => $outboundTags,
            'probeUrl'          => $observatoryProbeUrl,
            'probeInterval'     => $observatoryProbeInterval,
            'enableConcurrency' => false,
        ];
    }

    return $config;
}

function buildStreamSettings(array $v): array
{
    $ss = [
        'network'  => $v['network'],
        'security' => $v['security'],
    ];

    // --- Transport settings ------------------------------------------------
    $t = $v['transport'];

    switch ($v['network']) {
        case 'ws':
            $ss['wsSettings'] = [
                'path'    => $t['path'],
                'headers' => ['Host' => $t['host']],
            ];
            break;

        case 'xhttp':
            $xs = ['path' => $t['path'], 'mode' => $t['mode']];
            if ($t['host'] !== '') {
                $xs['host'] = $t['host'];
            }
            $ss['xhttpSettings'] = $xs;
            break;

        case 'grpc':
            $ss['grpcSettings'] = [
                'serviceName' => $t['serviceName'],
                'multiMode'   => $t['mode'] === 'multi',
            ];
            break;

        case 'h2':
            $ss['httpSettings'] = [
                'path' => $t['path'],
                'host' => [$t['host']],
            ];
            break;
    }

    // --- Security settings -------------------------------------------------
    $sec = $v['securitySettings'];

    switch ($v['security']) {
        case 'reality':
            $rs = [
                'serverName'  => $sec['serverName'],
                'fingerprint' => $sec['fingerprint'],
                'publicKey'   => $sec['publicKey'],
                'shortId'     => $sec['shortId'],
            ];
            if ($sec['spiderX'] !== '') {
                $rs['spiderX'] = $sec['spiderX'];
            }
            $ss['realitySettings'] = $rs;
            break;

        case 'tls':
            $ts = [
                'serverName'    => $sec['serverName'],
                'allowInsecure' => $sec['allowInsecure'],
            ];
            if ($sec['fingerprint'] !== '') {
                $ts['fingerprint'] = $sec['fingerprint'];
            }
            if (!empty($sec['alpn'])) {
                $ts['alpn'] = $sec['alpn'];
            }
            $ss['tlsSettings'] = $ts;
            break;
    }

    return $ss;
}

function buildRouting(array $rules, bool $blockBittorrent = false, string $defaultOutbound = 'proxy', string $domainStrategy = 'IPIfNonMatch', array $outboundTags = ['proxy'], bool $balancerEnabled = false, string $balancerStrategy = 'random'): ?array
{
    $xrayRules = [];

    if ($blockBittorrent) {
        $xrayRules[] = [
            'type'        => 'field',
            'protocol'    => ['bittorrent'],
            'outboundTag' => 'block',
        ];
    }

    $allowedActions = array_merge(['direct', 'block'], $outboundTags);
    if ($balancerEnabled) $allowedActions[] = 'balancer';

    foreach ($rules as $rule) {
        $type = $rule['rule_type'] ?? '';
        $db   = trim((string)($rule['db'] ?? ''));
        if ($db !== '' && !preg_match('/^[a-zA-Z0-9_\-]+\.dat$/', $db)) {
            continue; // skip rules with invalid db filename
        }
        $action = $rule['action'] ?? $outboundTags[0];

        // Support both new `values` array and legacy `value` string
        $rawValues = [];
        if (!empty($rule['values']) && is_array($rule['values'])) {
            $rawValues = $rule['values'];
        } elseif (!empty($rule['value'])) {
            $rawValues = [trim((string)$rule['value'])];
        }

        if (empty($rawValues) || !in_array($type, ['ip', 'domain'], true) || !in_array($action, $allowedActions, true)) {
            continue;
        }

        $prefix    = $type === 'ip' ? 'geoip' : 'geosite';
        $formatted = array_values(array_filter(array_map(
            fn($v) => formatGeoValue(trim((string)$v), $prefix, $db),
            $rawValues
        )));

        if (empty($formatted)) continue;

        // Balancer rules use balancerTag instead of outboundTag
        if ($action === 'balancer' && $balancerEnabled) {
            $xrayRule = ['type' => 'field', 'balancerTag' => 'balancer'];
        } else {
            $xrayRule = ['type' => 'field', 'outboundTag' => $action];
        }
        if ($type === 'ip') {
            $xrayRule['ip'] = $formatted;
        } else {
            $xrayRule['domain'] = $formatted;
        }

        $xrayRules[] = $xrayRule;
    }

    // Catch-all rule for unmatched traffic
    if ($defaultOutbound === 'balancer' && $balancerEnabled) {
        $xrayRules[] = ['type' => 'field', 'network' => 'tcp,udp', 'balancerTag' => 'balancer'];
    } else {
        $xrayRules[] = ['type' => 'field', 'network' => 'tcp,udp', 'outboundTag' => $defaultOutbound];
    }

    $result = [
        'domainStrategy' => $domainStrategy,
        'rules'          => $xrayRules,
    ];

    if ($balancerEnabled) {
        $result['balancers'] = [[
            'tag'      => 'balancer',
            'selector' => $outboundTags,
            'strategy' => ['type' => $balancerStrategy],
        ]];
    }

    return $result;
}

/**
 * Formats a category value into the xray-core routing format.
 *
 * Rules:
 *   - IP/CIDR (contains dot, colon, or slash) — returned as-is
 *   - Already in ext:... format — returned as-is
 *   - Already prefixed with geosite: or geoip: — returned as-is
 *   - Otherwise: "ru" + db="geosite_RU.dat" → "ext:geosite_RU.dat:ru"
 *                "ru" + db="geosite.dat"    → "geosite:ru"
 */
function formatGeoValue(string $value, string $prefix, string $db): string
{
    // Already a fully qualified format — leave as-is
    if (str_starts_with($value, 'ext:') ||
        str_starts_with($value, 'geosite:') ||
        str_starts_with($value, 'geoip:')) {
        return $value;
    }

    // IP address or CIDR — leave as-is
    if (str_contains($value, '.') || str_contains($value, ':') || str_contains($value, '/')) {
        return $value;
    }

    // Plain category name — build the appropriate prefix
    $defaultDb = $prefix . '.dat';
    if ($db === '' || $db === $defaultDb) {
        return $prefix . ':' . $value;
    }

    return 'ext:' . $db . ':' . $value;
}

function buildDns(array $serverDefs, array $rules, string $fallback, string $queryStrategy = 'UseIPv4', string $domainStrategy = 'IPIfNonMatch'): ?array
{
    $presets = [
        'google_doh'     => 'https://8.8.8.8/dns-query',
        'cloudflare_doh' => 'https://1.1.1.1/dns-query',
        'yandex_doh'     => 'https://77.88.8.8/dns-query',
        'google_dns'     => '8.8.8.8',
        'cloudflare_dns' => '1.1.1.1',
        'yandex_dns'     => '77.88.8.8',
    ];

    // Build ordered list of server addresses
    $addresses = [];
    foreach ($serverDefs as $s) {
        $preset  = $s['preset'] ?? 'google_doh';
        $address = $presets[$preset] ?? trim((string)($s['custom'] ?? ''));
        $addresses[] = $address; // keep empty slots to preserve index alignment
    }

    // Group domain sets per server index
    $domainsByServer = array_fill(0, count($addresses), []);

    foreach ($rules as $rule) {
        $idx = (int)($rule['server_idx'] ?? 0);
        if (!isset($addresses[$idx])) continue;

        $db = trim((string)($rule['db'] ?? ''));
        if ($db !== '' && !preg_match('/^[a-zA-Z0-9_\-]+\.dat$/', $db)) continue;

        $values  = is_array($rule['values'] ?? null) ? $rule['values'] : [];
        $prefix  = str_starts_with($db, 'geoip') ? 'geoip' : 'geosite';

        $domains = array_values(array_filter(array_map(
            fn($v) => formatGeoValue(trim((string)$v), $prefix, $db),
            $values
        )));

        $domainsByServer[$idx] = array_merge($domainsByServer[$idx], $domains);
    }

    // Assemble final servers array
    $servers = [];
    foreach ($addresses as $i => $address) {
        if ($address === '') continue;
        $domains = $domainsByServer[$i];
        if (!empty($domains)) {
            $servers[] = ['address' => $address, 'domains' => $domains];
        } else {
            $servers[] = $address;
        }
    }

    if ($fallback !== '') {
        $servers[] = $fallback;
    }

    if (empty($servers)) return null;

    $result = ['servers' => $servers];
    $result['queryStrategy'] = $queryStrategy;
    $result['domainStrategy'] = $domainStrategy;

    return $result;
}

function isValidUuid(string $uuid): bool
{
    return (bool)preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $uuid
    );
}
