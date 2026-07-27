<?php
// api/sync_pokepaste.php - Backend sync handler for Pokepaste teams repository
header('Content-Type: application/json; charset=utf-8');

$workspaceRoot = dirname(__DIR__);
$jsPath = $workspaceRoot . '/js/preset-teams.js';
$outputFile = $workspaceRoot . '/AllTeams.txt';

if (!file_exists($jsPath)) {
    echo json_encode(['success' => false, 'error' => 'preset-teams.js file not found']);
    exit;
}

$rawJs = file_get_contents($jsPath);
if (preg_match('/const\s+PRESET_TEAMS\s*=\s*(\[\s*[\s\S]*?\s*\]);/s', $rawJs, $matches)) {
    $teams = json_decode($matches[1], true);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to parse PRESET_TEAMS JSON']);
    exit;
}

if (!is_array($teams)) {
    echo json_encode(['success' => false, 'error' => 'Invalid teams JSON array']);
    exit;
}

$logs = [];
$processed = 0;
$allContent = "";

foreach ($teams as $index => $team) {
    $title = $team['description'] ?? $team['name'] ?? $team['id'] ?? ('Equipo ' . ($index + 1));
    $creator = $team['creator'] ?? 'Desconocido';
    $url = $team['pokepaste'] ?? $team['link'] ?? '';

    $rawUrl = (substr($url, -4) === '/raw') ? $url : rtrim($url, '/') . '/raw';

    $opts = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n",
            "timeout" => 8
        ]
    ];
    $context = stream_context_create($opts);

    $pasteContent = !empty($url) ? @file_get_contents($rawUrl, false, $context) : false;

    if ($pasteContent === false && !empty($team['details'])) {
        $lines = [];
        foreach ($team['details'] as $mon) {
            $itemStr = !empty($mon['item']) ? " @ " . $mon['item'] : "";
            $lines[] = ($mon['species'] ?? 'Pokemon') . $itemStr;
            if (!empty($mon['ability'])) $lines[] = "Ability: " . $mon['ability'];
            if (!empty($mon['teraType'])) $lines[] = "Tera Type: " . $mon['teraType'];
            if (!empty($mon['nature'])) $lines[] = $mon['nature'] . " Nature";
            if (!empty($mon['evs'])) $lines[] = "EVs: " . $mon['evs'];
            if (!empty($mon['ivs'])) $lines[] = "IVs: " . $mon['ivs'];
            if (!empty($mon['moves'])) {
                foreach ($mon['moves'] as $mv) {
                    $lines[] = "- " . $mv;
                }
            }
            $lines[] = "";
        }
        $pasteContent = implode("\n", $lines);
    }

    $header = "=== {$title} (Creador: {$creator}) ===";
    $allContent .= $header . "\n" . trim((string)$pasteContent) . "\n\n";

    $processed++;
    $logs[] = "[" . $processed . "/" . count($teams) . "] Sincronizado: " . $title;
}

file_put_contents($outputFile, $allContent);

echo json_encode([
    'success' => true,
    'count' => $processed,
    'total' => count($teams),
    'logs' => $logs,
    'outputFile' => 'AllTeams.txt',
    'message' => "Se exportaron correctamente $processed de " . count($teams) . " equipos a AllTeams.txt."
]);
