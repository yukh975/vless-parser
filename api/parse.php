<?php
declare(strict_types=1);
header('Content-Type: application/json');

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
$vlessLink       = trim((string)($in['vless_link']       ?? ''));
$routingEnabled  = (bool)($in['routing_enabled']         ?? false);
$blockBittorrent = (bool)($in['block_bittorrent']        ?? false);
$defaultOutbound = in_array($in['default_outbound'] ?? '', ['proxy', 'direct'], true)
    ? $in['default_outbound'] : 'proxy';
$domainStrategy  = in_array($in['domain_strategy'] ?? '', ['IPIfNonMatch', 'IPOnDemand', 'AsIs'], true)
    ? $in['domain_strategy'] : 'IPIfNonMatch';
$routingRules    = is_array($in['routing_rules'] ?? null) ? $in['routing_rules'] : [];
$dnsEnabled      = (bool)($in['dns_enabled']  ?? false);
$dnsQueryStrategy = in_array($in['dns_query_strategy'] ?? '', ['UseIP', 'UseIPv4', 'UseIPv6', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'useSystem'], true)
    ? $in['dns_query_strategy'] : 'UseIPv4';
$dnsDomainMatcher = in_array($in['dns_domain_matcher'] ?? '', ['hybrid', 'linear'], true)
    ? $in['dns_domain_matcher'] : 'hybrid';
$dnsFallback     = trim((string)($in['dns_fallback'] ?? ''));
$dnsServers      = is_array($in['dns_servers'] ?? null) ? $in['dns_servers'] : [];
$dnsRules        = is_array($in['dns_rules']   ?? null) ? $in['dns_rules']   : [];
$logEnabled      = (bool)($in['log_enabled'] ?? false);
$logDir          = trim((string)($in['log_dir'] ?? ''));
$logLevel        = in_array($in['log_level'] ?? '', ['debug', 'info', 'warning', 'error', 'none'], true)
    ? $in['log_level'] : 'warning';

if ($inboundIp === '' || filter_var($inboundIp, FILTER_VALIDATE_IP) === false) {
    err('Invalid inbound IP address');
}
if ($inboundPort < 1 || $inboundPort > 65535) {
    err('Inbound port must be in range 1–65535');
}
if (!str_starts_with($vlessLink, 'vless://')) {
    err('Link must start with vless://');
}

// --- Parse & build ---------------------------------------------------------

$parsed = parseVless($vlessLink);
$config = buildConfig($inboundIp, $inboundPort, $parsed, $routingEnabled, $routingRules, $blockBittorrent, $socks5Auth, $socks5User, $socks5Pass, $defaultOutbound, $domainStrategy, $logEnabled, $logDir, $logLevel, $dnsEnabled, $dnsQueryStrategy, $dnsDomainMatcher, $dnsFallback, $dnsServers, $dnsRules);

echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

// ---------------------------------------------------------------------------

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

function buildConfig(string $ip, int $port, array $v, bool $routingEnabled = false, array $routingRules = [], bool $blockBittorrent = false, bool $socks5Auth = false, string $socks5User = '', string $socks5Pass = '', string $defaultOutbound = 'proxy', string $domainStrategy = 'IPIfNonMatch', bool $logEnabled = false, string $logDir = '', string $logLevel = 'warning', bool $dnsEnabled = false, string $dnsQueryStrategy = 'UseIPv4', string $dnsDomainMatcher = 'hybrid', string $dnsFallback = '', array $dnsServers = [], array $dnsRules = []): array
{
    $destOverride = ['http', 'tls'];
    if ($blockBittorrent) {
        $destOverride[] = 'bittorrent';
    }

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
        'sniffing'  => [
            'enabled'      => true,
            'destOverride' => $destOverride,
        ],
    ];

    $userEntry = ['id' => $v['uuid'], 'encryption' => 'none'];
    if ($v['flow'] !== '') {
        $userEntry['flow'] = $v['flow'];
    }

    $streamSettings = buildStreamSettings($v);

    $outbound = [
        'tag'      => 'proxy',
        'protocol' => 'vless',
        'settings' => [
            'vnext' => [[
                'address' => $v['host'],
                'port'    => $v['port'],
                'users'   => [$userEntry],
            ]],
        ],
        'streamSettings' => $streamSettings,
    ];

    if ($v['name'] !== '') {
        $outbound['_comment'] = $v['name'];
    }

    if ($logEnabled && $logDir !== '') {
        $logPath = rtrim($logDir, '/\\') . '/xray-core.log';
        $log = ['access' => $logPath, 'error' => $logPath, 'loglevel' => $logLevel];
    } elseif ($logEnabled) {
        $log = ['loglevel' => $logLevel];
    } else {
        $log = ['loglevel' => 'none'];
    }

    $config = [
        'log'       => $log,
        'inbounds'  => [$inbound],
        'outbounds' => [
            $outbound,
            ['tag' => 'direct', 'protocol' => 'freedom'],
            ['tag' => 'block',  'protocol' => 'blackhole'],
        ],
    ];

    if ($routingEnabled) {
        $routing = buildRouting($routingRules, $blockBittorrent, $defaultOutbound, $domainStrategy);
        if ($routing !== null) {
            $config['routing'] = $routing;
        }
    }

    if ($dnsEnabled) {
        $dns = buildDns($dnsServers, $dnsRules, $dnsFallback, $dnsQueryStrategy, $dnsDomainMatcher);
        if ($dns !== null) {
            $config['dns'] = $dns;
        }
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

function buildRouting(array $rules, bool $blockBittorrent = false, string $defaultOutbound = 'proxy', string $domainStrategy = 'IPIfNonMatch'): ?array
{
    $xrayRules = [];

    if ($blockBittorrent) {
        $xrayRules[] = [
            'type'        => 'field',
            'protocol'    => ['bittorrent'],
            'outboundTag' => 'block',
        ];
    }

    $allowedActions = ['direct', 'proxy', 'block'];

    foreach ($rules as $rule) {
        $type = $rule['rule_type'] ?? '';
        $db   = trim((string)($rule['db'] ?? ''));
        if ($db !== '' && !preg_match('/^[a-zA-Z0-9_\-]+\.dat$/', $db)) {
            continue; // skip rules with invalid db filename
        }
        $action = $rule['action'] ?? 'proxy';

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

        $xrayRule = ['type' => 'field', 'outboundTag' => $action];
        if ($type === 'ip') {
            $xrayRule['ip'] = $formatted;
        } else {
            $xrayRule['domain'] = $formatted;
        }

        $xrayRules[] = $xrayRule;
    }

    // Catch-all rule for unmatched traffic
    $xrayRules[] = [
        'type'        => 'field',
        'network'     => 'tcp,udp',
        'outboundTag' => $defaultOutbound,
    ];

    return [
        'domainStrategy' => $domainStrategy,
        'rules'          => $xrayRules,
    ];
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

function buildDns(array $serverDefs, array $rules, string $fallback, string $queryStrategy = 'UseIPv4', string $domainMatcher = 'hybrid'): ?array
{
    $presets = [
        'google_doh'     => 'https://dns.google/dns-query',
        'cloudflare_doh' => 'https://cloudflare-dns.com/dns-query',
        'yandex_doh'     => 'https://dns.yandex.com/dns-query',
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
    if ($queryStrategy !== 'UseIPv4') {
        $result['queryStrategy'] = $queryStrategy;
    }
    if ($domainMatcher !== 'hybrid') {
        $result['domainMatcher'] = $domainMatcher;
    }

    return $result;
}

function isValidUuid(string $uuid): bool
{
    return (bool)preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $uuid
    );
}
