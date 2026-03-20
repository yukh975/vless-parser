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

$inboundIp   = trim((string)($in['inbound_ip']   ?? ''));
$inboundPort = (int)($in['inbound_port'] ?? 0);
$vlessLink   = trim((string)($in['vless_link']   ?? ''));

if ($inboundIp === '') {
    err('Не указан IP-адрес inbound');
}
if ($inboundPort < 1 || $inboundPort > 65535) {
    err('Порт inbound должен быть в диапазоне 1–65535');
}
if (!str_starts_with($vlessLink, 'vless://')) {
    err('Ссылка должна начинаться с vless://');
}

// --- Parse VLESS URI -------------------------------------------------------

$parsed = parseVless($vlessLink);

// --- Build config ----------------------------------------------------------

$config = buildConfig($inboundIp, $inboundPort, $parsed);

echo json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

// ---------------------------------------------------------------------------

function parseVless(string $link): array
{
    // vless://uuid@host:port?params#name
    $url = parse_url($link);

    if ($url === false || empty($url['host'])) {
        err('Не удалось разобрать VLESS-ссылку');
    }

    $uuid = $url['user'] ?? '';
    if ($uuid === '' || !isValidUuid($uuid)) {
        err('UUID некорректен или отсутствует');
    }

    $host = $url['host'];
    $port = (int)($url['port'] ?? 443);
    $name = isset($url['fragment']) ? urldecode($url['fragment']) : '';

    parse_str($url['query'] ?? '', $q);

    $security = $q['security'] ?? 'none';
    $network  = $q['type']     ?? 'tcp';
    $flow     = $q['flow']     ?? '';

    $result = [
        'uuid'     => $uuid,
        'host'     => $host,
        'port'     => $port,
        'name'     => $name,
        'security' => $security,
        'network'  => $network,
        'flow'     => $flow,
    ];

    // Reality-specific
    if ($security === 'reality') {
        $result['reality'] = [
            'serverName'  => $q['sni']  ?? '',
            'fingerprint' => $q['fp']   ?? 'chrome',
            'publicKey'   => $q['pbk']  ?? '',
            'shortId'     => $q['sid']  ?? '',
            'spiderX'     => $q['spx']  ?? '',
        ];
    }

    // TLS-specific
    if ($security === 'tls') {
        $result['tls'] = [
            'serverName'    => $q['sni']              ?? $host,
            'fingerprint'   => $q['fp']               ?? '',
            'allowInsecure' => ($q['allowInsecure'] ?? '0') === '1',
        ];
    }

    return $result;
}

function buildConfig(string $ip, int $port, array $v): array
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

    $vnext = [[
        'address' => $v['host'],
        'port'    => $v['port'],
        'users'   => [$userEntry],
    ]];

    $streamSettings = [
        'network'  => $v['network'],
        'security' => $v['security'],
    ];

    if ($v['security'] === 'reality') {
        $r = $v['reality'];
        $streamSettings['realitySettings'] = [
            'serverName'  => $r['serverName'],
            'fingerprint' => $r['fingerprint'],
            'publicKey'   => $r['publicKey'],
            'shortId'     => $r['shortId'],
        ];
        if ($r['spiderX'] !== '') {
            $streamSettings['realitySettings']['spiderX'] = $r['spiderX'];
        }
    }

    if ($v['security'] === 'tls') {
        $t = $v['tls'];
        $streamSettings['tlsSettings'] = [
            'serverName'    => $t['serverName'],
            'allowInsecure' => $t['allowInsecure'],
        ];
        if ($t['fingerprint'] !== '') {
            $streamSettings['tlsSettings']['fingerprint'] = $t['fingerprint'];
        }
    }

    $outbound = [
        'tag'            => 'proxy',
        'protocol'       => 'vless',
        'settings'       => ['vnext' => $vnext],
        'streamSettings' => $streamSettings,
    ];

    if (!empty($v['name'])) {
        $outbound['_comment'] = $v['name'];
    }

    return [
        'log' => [
            'loglevel' => 'warning',
        ],
        'inbounds'  => [$inbound],
        'outbounds' => [
            $outbound,
            ['tag' => 'direct', 'protocol' => 'freedom'],
            ['tag' => 'block',  'protocol' => 'blackhole'],
        ],
    ];
}

function isValidUuid(string $uuid): bool
{
    return (bool)preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $uuid
    );
}
