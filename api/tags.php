<?php
declare(strict_types=1);
header('Content-Type: application/json');

// Path to the directory containing .dat files.
// Adjust to match your server installation.
const GEO_DIR = '/home/web/ip/www/xray-confgen/db';

// ---------------------------------------------------------------------------

function err(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$db = trim((string)($_GET['db'] ?? ''));

if ($db === '') {
    err('Parameter db is required');
}

// Allow only safe filenames: letters, digits, underscores, hyphens, dots
if (!preg_match('/^[a-zA-Z0-9_\-]+\.dat$/', $db)) {
    err('Invalid filename');
}

$path = GEO_DIR . '/' . $db;

if (!is_file($path)) {
    err("File not found: $db", 404);
}

$tags = extractGeoTags($path);
sort($tags);

echo json_encode(['db' => $db, 'tags' => $tags], JSON_UNESCAPED_UNICODE);

// ---------------------------------------------------------------------------

/**
 * Extracts category tags from a geosite.dat / geoip.dat file.
 *
 * Both files use the same outer structure:
 *   GeoXxxList { repeated GeoXxx entry = 1; }
 *   GeoXxx     { string country_code = 1; ... }
 *
 * We parse two levels of protobuf:
 *   1. Outer list → get each entry blob (field 1, length-delimited)
 *   2. Entry blob → read first field-1 string (country_code)
 */
function extractGeoTags(string $path): array
{
    $data = file_get_contents($path);
    if ($data === false) {
        err('Failed to read file');
    }

    $tags = [];
    $i    = 0;
    $len  = strlen($data);

    while ($i < $len) {
        $tag = readVarint($data, $i, $len);
        if ($tag === null) break;

        $wireType = $tag & 0x07;
        $fieldNum = $tag >> 3;

        if ($fieldNum === 1 && $wireType === 2) {
            // Outer field 1: an entry blob (GeoSite / GeoIP)
            $blobLen = readVarint($data, $i, $len);
            if ($blobLen === null || $i + $blobLen > $len) break;

            $blob = substr($data, $i, $blobLen);
            $i   += $blobLen;

            $code = readFirstString($blob);
            if ($code !== null && preg_match('/^[A-Za-z][A-Za-z0-9_\-]*$/', $code)) {
                $tags[] = strtolower($code);
            }
        } else {
            if (!skipField($data, $i, $len, $wireType)) break;
        }
    }

    return array_values(array_unique($tags));
}

/**
 * Reads the field-1 string from the beginning of a protobuf blob.
 * The country_code is always the first field in GeoSite / GeoIP entries.
 */
function readFirstString(string $blob): ?string
{
    $i   = 0;
    $len = strlen($blob);

    while ($i < $len) {
        $tag = readVarint($blob, $i, $len);
        if ($tag === null) break;

        $wireType = $tag & 0x07;
        $fieldNum = $tag >> 3;

        if ($fieldNum === 1 && $wireType === 2) {
            $strLen = readVarint($blob, $i, $len);
            if ($strLen === null || $i + $strLen > $len) break;
            return substr($blob, $i, $strLen);
        }

        // Skip any field that appears before field 1 (shouldn't happen, but be safe)
        if (!skipField($blob, $i, $len, $wireType)) break;
    }

    return null;
}

function readVarint(string $data, int &$i, int $len): ?int
{
    $result = 0;
    $shift  = 0;

    while ($i < $len) {
        $b      = ord($data[$i++]);
        $result |= ($b & 0x7F) << $shift;
        $shift  += 7;
        if (!($b & 0x80)) return $result;
        if ($shift >= 64) return null; // overflow guard
    }

    return null;
}

function skipField(string $data, int &$i, int $len, int $wireType): bool
{
    switch ($wireType) {
        case 0: // varint
            while ($i < $len) {
                if (!(ord($data[$i++]) & 0x80)) return true;
            }
            return false;
        case 1: // 64-bit
            $i += 8;
            return $i <= $len;
        case 2: // length-delimited
            $l = readVarint($data, $i, $len);
            if ($l === null) return false;
            $i += $l;
            return $i <= $len;
        case 5: // 32-bit
            $i += 4;
            return $i <= $len;
        default:
            return false;
    }
}
