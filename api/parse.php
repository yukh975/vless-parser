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
$blockBittorrent = (bool)($in['block_bittorrent']        ?? false);
$defaultOutbound = in_array($in['default_outbound'] ?? '', ['proxy', 'direct'], true)
    ? $in['default_outbound'] : 'proxy';
$domainStrategy  = in_array($in['domain_strategy'] ?? '', ['IPIfNonMatch', 'IPOnDemand', 'AsIs'], true)
    ? $in['domain_strategy'] : 'IPIfNonMatch';
$routingRules    = is_array($in['routing_rules'] ?? null) ? $in['routing_rules'] : [];

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
$config = buildConfig($inboundIp, $inboundPort, $parsed, $routingRules, $blockBittorrent, $socks5Auth, $socks5User, $socks5Pass, $defaultOutbound, $domainStrategy);

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

function buildConfig(string $ip, int $port, array $v, array $routingRules, bool $blockBittorrent = false, bool $socks5Auth = false, string $socks5User = '', string $socks5Pass = '', string $defaultOutbound = 'proxy', string $domainStrategy = 'IPIfNonMatch'): array
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

    $config = [
        'log'       => ['loglevel' => 'warning'],
        'inbounds'  => [$inbound],
        'outbounds' => [
            $outbound,
            ['tag' => 'direct', 'protocol' => 'freedom'],
            ['tag' => 'block',  'protocol' => 'blackhole'],
        ],
    ];

    $routing = buildRouting($routingRules, $blockBittorrent, $defaultOutbound, $domainStrategy);
    if ($routing !== null) {
        $config['routing'] = $routing;
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

function isValidUuid(string $uuid): bool
{
    return (bool)preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $uuid
    );
}
