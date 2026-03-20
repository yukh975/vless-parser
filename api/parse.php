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
    err('Некорректный JSON в запросе');
}

$inboundIp    = trim((string)($in['inbound_ip']   ?? ''));
$inboundPort  = (int)($in['inbound_port'] ?? 0);
$vlessLink    = trim((string)($in['vless_link']   ?? ''));
$routingRules = is_array($in['routing_rules'] ?? null) ? $in['routing_rules'] : [];

if ($inboundIp === '') {
    err('Не указан IP-адрес inbound');
}
if ($inboundPort < 1 || $inboundPort > 65535) {
    err('Порт inbound должен быть в диапазоне 1–65535');
}
if (!str_starts_with($vlessLink, 'vless://')) {
    err('Ссылка должна начинаться с vless://');
}

// --- Parse & build ---------------------------------------------------------

$parsed = parseVless($vlessLink);
$config = buildConfig($inboundIp, $inboundPort, $parsed, $routingRules);

echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

// ---------------------------------------------------------------------------

function parseVless(string $link): array
{
    $url = parse_url($link);

    if ($url === false || empty($url['host'])) {
        err('Не удалось разобрать VLESS-ссылку');
    }

    $uuid = $url['user'] ?? '';
    if ($uuid === '' || !isValidUuid($uuid)) {
        err('UUID некорректен или отсутствует');
    }

    parse_str($url['query'] ?? '', $q);

    $network  = $q['type']     ?? 'tcp';
    $security = $q['security'] ?? 'none';
    $flow     = $q['flow']     ?? '';

    // flow несовместим с xhttp
    if ($network === 'xhttp') {
        $flow = '';
    }

    $result = [
        'uuid'     => $uuid,
        'host'     => $url['host'],
        'port'     => (int)($url['port'] ?? 443),
        'name'     => isset($url['fragment']) ? urldecode($url['fragment']) : '',
        'network'  => $network,
        'security' => $security,
        'flow'     => $flow,
        'transport' => parseTransport($network, $q, $url['host']),
        'securitySettings' => parseSecurity($security, $q, $url['host']),
    ];

    return $result;
}

/**
 * Разбирает параметры транспортного уровня в зависимости от network.
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
 * Разбирает параметры безопасности (TLS / Reality).
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

function buildConfig(string $ip, int $port, array $v, array $routingRules): array
{
    $inbound = [
        'tag'      => 'socks-in',
        'listen'   => $ip,
        'port'     => $port,
        'protocol' => 'socks',
        'settings' => [
            'auth' => 'noauth',
            'udp'  => true,
        ],
        'sniffing' => [
            'enabled'      => true,
            'destOverride' => ['http', 'tls'],
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

    $routing = buildRouting($routingRules);
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

function buildRouting(array $rules): ?array
{
    if (empty($rules)) {
        return null;
    }

    $xrayRules = [];
    $allowedActions = ['direct', 'proxy', 'block'];

    foreach ($rules as $rule) {
        $type   = $rule['rule_type'] ?? '';
        $value  = trim((string)($rule['value'] ?? ''));
        $action = $rule['action'] ?? 'proxy';

        if ($value === '' || !in_array($type, ['ip', 'domain'], true) || !in_array($action, $allowedActions, true)) {
            continue;
        }

        $xrayRule = ['type' => 'field', 'outboundTag' => $action];

        if ($type === 'ip') {
            $xrayRule['ip'] = [$value];
        } else {
            $xrayRule['domain'] = [$value];
        }

        $xrayRules[] = $xrayRule;
    }

    if (empty($xrayRules)) {
        return null;
    }

    return [
        'domainStrategy' => 'IPIfNonMatch',
        'rules'          => $xrayRules,
    ];
}

function isValidUuid(string $uuid): bool
{
    return (bool)preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $uuid
    );
}
