<?php

declare(strict_types=1);

session_start();

const APP_ROOT = __DIR__ . '/..';

$config = require APP_ROOT . '/includes/config.php';

$pdo = connectDatabase($config['database']);

bootstrapSchema($pdo);

function appConfig(): array
{
    global $config;

    return $config;
}

function qproConfig(): array
{
    $qpro = appConfig()['qpro'];
    $environment = $qpro['environment'] ?? 'local';
    $endpoints = $qpro['endpoints'] ?? [];
    $apiBaseUrl = $endpoints[$environment] ?? ($endpoints['local'] ?? '');

    return $qpro + [
        'environment' => $environment,
        'api_base_url' => rtrim($apiBaseUrl, '/'),
    ];
}

function db(): PDO
{
    global $pdo;

    return $pdo;
}

function connectDatabase(array $databaseConfig): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $databaseConfig['host'],
        $databaseConfig['port'],
        $databaseConfig['database'],
        $databaseConfig['charset']
    );

    return new PDO(
        $dsn,
        $databaseConfig['username'],
        $databaseConfig['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

function bootstrapSchema(PDO $pdo): void
{
    $pdo->exec(
        <<<SQL
        CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(191) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL
        )
        SQL
    );

    foreach (caseDefinitions() as $case) {
        $pdo->exec(
            sprintf(
                <<<SQL
                CREATE TABLE IF NOT EXISTS %s (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    reference_code VARCHAR(191) NOT NULL,
                    title VARCHAR(191) NOT NULL,
                    location VARCHAR(191) NOT NULL,
                    status VARCHAR(191) NOT NULL,
                    owner_name VARCHAR(191) NOT NULL DEFAULT '',
                    category VARCHAR(191) NOT NULL DEFAULT '',
                    quantity INT NOT NULL DEFAULT 0,
                    scheduled_at DATETIME NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                SQL,
                $case['table']
            )
        );

        ensureColumn($pdo, $case['table'], 'owner_name', "VARCHAR(191) NOT NULL DEFAULT ''");
        ensureColumn($pdo, $case['table'], 'category', "VARCHAR(191) NOT NULL DEFAULT ''");
        ensureColumn($pdo, $case['table'], 'quantity', 'INT NOT NULL DEFAULT 0');
        ensureColumn($pdo, $case['table'], 'scheduled_at', 'DATETIME NULL');
    }
}

function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column'
    );
    $stmt->execute([
        'table' => $table,
        'column' => $column,
    ]);

    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }

    $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $table, $column, $definition));
}

function seedDefaultUser(PDO $pdo): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username = :username');
    $stmt->execute(['username' => 'demo']);

    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users (username, password_hash, created_at) VALUES (:username, :password_hash, :created_at)'
    );

    $stmt->execute([
        'username' => 'demo',
        'password_hash' => password_hash('password', PASSWORD_DEFAULT),
        'created_at' => now(),
    ]);
}

function seedDemoRecords(PDO $pdo): void
{
    foreach (caseDefinitions() as $slug => $case) {
        $samples = $case['samples'];
        $count = (int) $pdo->query('SELECT COUNT(*) FROM ' . $case['table'])->fetchColumn();

        if ($count === 0) {
            $insert = $pdo->prepare(
                sprintf(
                    'INSERT INTO %s (reference_code, title, location, status, owner_name, category, quantity, scheduled_at, created_at, updated_at)
                     VALUES (:reference_code, :title, :location, :status, :owner_name, :category, :quantity, :scheduled_at, :created_at, :updated_at)',
                    $case['table']
                )
            );

            foreach ($samples as $sample) {
                $insert->execute($sample + ['created_at' => now(), 'updated_at' => now()]);
            }

            continue;
        }

        $records = $pdo->query(
            sprintf('SELECT id, title, reference_code FROM %s ORDER BY id ASC LIMIT 10', $case['table'])
        )->fetchAll();

        $update = $pdo->prepare(
            sprintf(
                'UPDATE %s
                 SET reference_code = :reference_code,
                     title = :title,
                     location = :location,
                     status = :status,
                     owner_name = :owner_name,
                     category = :category,
                     quantity = :quantity,
                     scheduled_at = :scheduled_at,
                     updated_at = :updated_at
                 WHERE id = :id',
                $case['table']
            )
        );

        foreach ($records as $index => $record) {
            $sample = $samples[$index] ?? null;
            if ($sample === null) {
                continue;
            }

            $isLegacySeed = str_contains((string) $record['title'], $case['record_prefix'])
                || isLegacyReferenceCode($slug, (string) $record['reference_code']);

            if (!$isLegacySeed && $index >= count($samples)) {
                continue;
            }

            if ($isLegacySeed) {
                $update->execute($sample + ['updated_at' => now(), 'id' => $record['id']]);
            }
        }
    }
}

function refreshDemoData(PDO $pdo): void
{
    bootstrapSchema($pdo);

    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

    try {
        foreach (caseDefinitions() as $case) {
            $pdo->exec(sprintf('TRUNCATE TABLE `%s`', $case['table']));
        }

        $pdo->exec('TRUNCATE TABLE `users`');

        seedDefaultUser($pdo);
        seedDemoRecords($pdo);
    } finally {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }
}

function isLegacyReferenceCode(string $slug, string $referenceCode): bool
{
    if ($slug === 'inventory') {
        return (bool) preg_match('/^INV-\d{3}$/', $referenceCode);
    }

    if ($slug === 'ticket') {
        return (bool) preg_match('/^TIC-\d{3}$/', $referenceCode);
    }

    if ($slug === 'traceability') {
        return (bool) preg_match('/^TRA-\d{3}$/', $referenceCode);
    }

    return false;
}

function caseDefinitions(): array
{
    return [
        'inventory' => [
            'slug' => 'inventory',
            'name' => 'Use Case 1',
            'title' => 'Inventory',
            'table' => 'inventory_records',
            'record_prefix' => 'Inventory Item',
            'samples' => [
                ['reference_code' => 'INV-24001', 'title' => '12mm Hex Bolt Pack', 'location' => 'Aisle A / Bin 12', 'status' => 'Available', 'owner_name' => 'Maya Chen', 'category' => 'Fasteners', 'quantity' => 480, 'scheduled_at' => '2026-04-16 09:00:00'],
                ['reference_code' => 'INV-24002', 'title' => 'Food Grade Lubricant', 'location' => 'Chemical Cage 2', 'status' => 'Restricted', 'owner_name' => 'Arjun Patel', 'category' => 'Maintenance', 'quantity' => 36, 'scheduled_at' => '2026-04-16 11:30:00'],
                ['reference_code' => 'INV-24003', 'title' => 'Label Roll 4x6 White', 'location' => 'Print Room Shelf B', 'status' => 'Available', 'owner_name' => 'Nina Brooks', 'category' => 'Packaging', 'quantity' => 120, 'scheduled_at' => '2026-04-17 08:15:00'],
                ['reference_code' => 'INV-24004', 'title' => 'Stainless Sensor Bracket', 'location' => 'Aisle C / Rack 4', 'status' => 'Reserved', 'owner_name' => 'Leo Martinez', 'category' => 'Components', 'quantity' => 64, 'scheduled_at' => '2026-04-17 13:00:00'],
                ['reference_code' => 'INV-24005', 'title' => 'Blue Tote Container', 'location' => 'Receiving Dock', 'status' => 'Available', 'owner_name' => 'Sarah Kim', 'category' => 'Material Handling', 'quantity' => 92, 'scheduled_at' => '2026-04-18 10:00:00'],
                ['reference_code' => 'INV-24006', 'title' => 'Thermal Print Head', 'location' => 'MRO Cabinet 7', 'status' => 'Queued', 'owner_name' => 'Ethan Ross', 'category' => 'Printer Parts', 'quantity' => 8, 'scheduled_at' => '2026-04-18 14:00:00'],
                ['reference_code' => 'INV-24007', 'title' => 'Shrink Wrap Film', 'location' => 'Packaging Line 1', 'status' => 'Available', 'owner_name' => 'Priya Shah', 'category' => 'Packaging', 'quantity' => 54, 'scheduled_at' => '2026-04-19 07:45:00'],
                ['reference_code' => 'INV-24008', 'title' => 'Pallet Corner Board', 'location' => 'Warehouse West', 'status' => 'Available', 'owner_name' => 'Marcus Lee', 'category' => 'Shipping', 'quantity' => 300, 'scheduled_at' => '2026-04-19 16:20:00'],
                ['reference_code' => 'INV-24009', 'title' => 'RF Scanner Battery', 'location' => 'IT Locker', 'status' => 'Reserved', 'owner_name' => 'Elena Diaz', 'category' => 'IT Assets', 'quantity' => 22, 'scheduled_at' => '2026-04-20 09:40:00'],
                ['reference_code' => 'INV-24010', 'title' => 'Cleanroom Gloves Large', 'location' => 'QA Supply Room', 'status' => 'Available', 'owner_name' => 'Owen Price', 'category' => 'PPE', 'quantity' => 960, 'scheduled_at' => '2026-04-20 15:10:00'],
            ],
        ],
        'ticket' => [
            'slug' => 'ticket',
            'name' => 'Use Case 2',
            'title' => 'Ticket',
            'table' => 'ticket_records',
            'record_prefix' => 'Support Ticket',
            'samples' => [
                ['reference_code' => 'TKT-6012', 'title' => 'Zebra printer not pairing', 'location' => 'Packing Station 3', 'status' => 'Open', 'owner_name' => 'Helpdesk Queue', 'category' => 'Printer', 'quantity' => 1, 'scheduled_at' => '2026-04-15 09:00:00'],
                ['reference_code' => 'TKT-6013', 'title' => 'Missing pallet label on outbound order', 'location' => 'Shipping Bay 2', 'status' => 'In Progress', 'owner_name' => 'Jordan Hayes', 'category' => 'Shipping', 'quantity' => 3, 'scheduled_at' => '2026-04-15 10:30:00'],
                ['reference_code' => 'TKT-6014', 'title' => 'Trace scan mismatch on lot 88A', 'location' => 'Production Line 1', 'status' => 'Open', 'owner_name' => 'QA Team', 'category' => 'Traceability', 'quantity' => 6, 'scheduled_at' => '2026-04-15 13:15:00'],
                ['reference_code' => 'TKT-6015', 'title' => 'Reprint request for inventory labels', 'location' => 'Warehouse Office', 'status' => 'Closed', 'owner_name' => 'Maya Chen', 'category' => 'Labeling', 'quantity' => 24, 'scheduled_at' => '2026-04-15 15:00:00'],
                ['reference_code' => 'TKT-6016', 'title' => 'Scanner cradle power issue', 'location' => 'Receiving Dock', 'status' => 'In Progress', 'owner_name' => 'IT Field Support', 'category' => 'Hardware', 'quantity' => 2, 'scheduled_at' => '2026-04-16 08:00:00'],
                ['reference_code' => 'TKT-6017', 'title' => 'Ticket for damaged label stock', 'location' => 'Print Room', 'status' => 'Open', 'owner_name' => 'Nina Brooks', 'category' => 'Supplies', 'quantity' => 18, 'scheduled_at' => '2026-04-16 11:00:00'],
                ['reference_code' => 'TKT-6018', 'title' => 'Outbound ASN not matching cartons', 'location' => 'Dock Door 5', 'status' => 'In Progress', 'owner_name' => 'Logistics Ops', 'category' => 'Integration', 'quantity' => 14, 'scheduled_at' => '2026-04-16 14:30:00'],
                ['reference_code' => 'TKT-6019', 'title' => 'User access request for demo station', 'location' => 'Front Office', 'status' => 'Closed', 'owner_name' => 'System Admin', 'category' => 'Access', 'quantity' => 1, 'scheduled_at' => '2026-04-17 09:20:00'],
                ['reference_code' => 'TKT-6020', 'title' => 'Need new traceability template', 'location' => 'QA Lab', 'status' => 'Open', 'owner_name' => 'Elena Diaz', 'category' => 'Template', 'quantity' => 4, 'scheduled_at' => '2026-04-17 12:10:00'],
                ['reference_code' => 'TKT-6021', 'title' => 'Batch print job stuck in browser', 'location' => 'Packing Station 1', 'status' => 'In Progress', 'owner_name' => 'Jordan Hayes', 'category' => 'Browser Printing', 'quantity' => 9, 'scheduled_at' => '2026-04-17 16:00:00'],
            ],
        ],
        'traceability' => [
            'slug' => 'traceability',
            'name' => 'Use Case 3',
            'title' => 'Traceability',
            'table' => 'traceability_records',
            'record_prefix' => 'Trace Batch',
            'samples' => [
                ['reference_code' => 'TRC-8801', 'title' => 'Tomato Sauce Lot 24A', 'location' => 'Kettle Line 1', 'status' => 'Created', 'owner_name' => 'QA Hold', 'category' => 'Finished Goods', 'quantity' => 1200, 'scheduled_at' => '2026-04-15 06:30:00'],
                ['reference_code' => 'TRC-8802', 'title' => 'Bottle Cap Batch BC-19', 'location' => 'Component Staging', 'status' => 'Verified', 'owner_name' => 'Samuel Green', 'category' => 'Packaging Component', 'quantity' => 5400, 'scheduled_at' => '2026-04-15 07:45:00'],
                ['reference_code' => 'TRC-8803', 'title' => 'Dry Spice Mix Run 412', 'location' => 'Blend Room', 'status' => 'Released', 'owner_name' => 'Priya Shah', 'category' => 'Raw Material', 'quantity' => 280, 'scheduled_at' => '2026-04-15 09:10:00'],
                ['reference_code' => 'TRC-8804', 'title' => 'Retail Carton Serial Block', 'location' => 'Packaging Line 2', 'status' => 'Verified', 'owner_name' => 'Marcus Lee', 'category' => 'Serialized Unit', 'quantity' => 800, 'scheduled_at' => '2026-04-15 11:40:00'],
                ['reference_code' => 'TRC-8805', 'title' => 'Pouch Seal Integrity Check', 'location' => 'QA Inspection', 'status' => 'Created', 'owner_name' => 'Avery Long', 'category' => 'Quality Check', 'quantity' => 75, 'scheduled_at' => '2026-04-15 13:25:00'],
                ['reference_code' => 'TRC-8806', 'title' => 'Finished Pallet Series FG-72', 'location' => 'Finished Goods Zone', 'status' => 'Released', 'owner_name' => 'Logistics Ops', 'category' => 'Pallet Group', 'quantity' => 32, 'scheduled_at' => '2026-04-16 08:35:00'],
                ['reference_code' => 'TRC-8807', 'title' => 'Ingredient Intake PO-1184', 'location' => 'Receiving Lab', 'status' => 'Verified', 'owner_name' => 'Maya Chen', 'category' => 'Inbound Lot', 'quantity' => 14, 'scheduled_at' => '2026-04-16 10:05:00'],
                ['reference_code' => 'TRC-8808', 'title' => 'Case Aggregation Run CA-55', 'location' => 'Aggregation Tunnel', 'status' => 'Created', 'owner_name' => 'Leo Martinez', 'category' => 'Case Trace', 'quantity' => 260, 'scheduled_at' => '2026-04-16 12:45:00'],
                ['reference_code' => 'TRC-8809', 'title' => 'Recall Drill Sample Set', 'location' => 'Compliance Room', 'status' => 'Verified', 'owner_name' => 'Elena Diaz', 'category' => 'Audit', 'quantity' => 18, 'scheduled_at' => '2026-04-16 15:15:00'],
                ['reference_code' => 'TRC-8810', 'title' => 'Export Order Trace Packet', 'location' => 'Shipping Documentation', 'status' => 'Released', 'owner_name' => 'Sarah Kim', 'category' => 'Export', 'quantity' => 11, 'scheduled_at' => '2026-04-17 09:55:00'],
            ],
        ],
    ];
}

function getCaseOrFail(string $slug): array
{
    $cases = caseDefinitions();

    if (!isset($cases[$slug])) {
        http_response_code(404);
        exit('Unknown use case.');
    }

    return $cases[$slug];
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function isLoggedIn(): bool
{
    return isset($_SESSION['user']);
}

function requireLogin(): void
{
    if (isLoggedIn()) {
        return;
    }

    header('Location: login.php');
    exit;
}

function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

function loginUser(array $user): void
{
    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'username' => $user['username'],
    ];
}

function logoutUser(): void
{
    unset($_SESSION['user']);
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'] = compact('type', 'message');
}

function pullFlash(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);

    return $flash;
}

function old(string $key, string $default = ''): string
{
    return $_SESSION['old'][$key] ?? $default;
}

function withOldInput(array $input): void
{
    $_SESSION['old'] = $input;
}

function clearOldInput(): void
{
    unset($_SESSION['old']);
}

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function csrfToken(): string
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function verifyCsrf(): void
{
    $token = $_POST['csrf_token'] ?? '';

    if (!hash_equals(csrfToken(), $token)) {
        http_response_code(419);
        exit('Invalid CSRF token.');
    }
}

function renderHeader(string $title, ?array $case = null): void
{
    $user = currentUser();
    $flash = pullFlash();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= e($title) ?></title>
        <link rel="stylesheet" href="assets/styles.css">
    </head>
    <body>
    <div class="shell">
        <header class="topbar">
            <div>
                <a class="brand" href="index.php">Qpro Demo App</a>
                <?php if ($case): ?>
                    <p class="subtitle"><?= e($case['title']) ?> workspace</p>
                <?php else: ?>
                    <p class="subtitle">Core PHP sample with login, CRUD, SQLite, and QPRO label printing.</p>
                <?php endif; ?>
            </div>
            <?php if ($user): ?>
                <div class="topbar-actions">
                    <span class="welcome">Signed in as <?= e($user['username']) ?></span>
                    <a class="button secondary" href="logout.php">Logout</a>
                </div>
            <?php endif; ?>
        </header>
        <?php if ($flash): ?>
            <div class="alert <?= e($flash['type']) ?>"><?= e($flash['message']) ?></div>
        <?php endif; ?>
    <?php
}

function renderFooter(): void
{
    $qpro = qproConfig();
    $qproLabels = json_encode($qpro['labels'], JSON_THROW_ON_ERROR);
    $apiBaseUrl = json_encode($qpro['api_base_url'], JSON_THROW_ON_ERROR);
    $apiKey = json_encode($qpro['api_key'], JSON_THROW_ON_ERROR);
    $apiSecret = json_encode($qpro['api_secret'], JSON_THROW_ON_ERROR);
    ?>
    </div>
    <script>
        window.QPRO_APP_CONFIG = {
            apiBaseUrl: <?= $apiBaseUrl ?>,
            apiKey: <?= $apiKey ?>,
            apiSecret: <?= $apiSecret ?>,
            labels: <?= $qproLabels ?>,
            printPageUrl: "../print-label.html"
        };
    </script>
    <script src="../qpro-label-sdk.js"></script>
    <script src="assets/app.js"></script>
    </body>
    </html>
    <?php
}

function fetchRecords(string $table): array
{
    $stmt = db()->query(sprintf('SELECT * FROM %s ORDER BY id DESC', $table));

    return $stmt->fetchAll();
}

function fetchRecord(string $table, int $id): ?array
{
    $stmt = db()->prepare(sprintf('SELECT * FROM %s WHERE id = :id', $table));
    $stmt->execute(['id' => $id]);
    $record = $stmt->fetch();

    return $record ?: null;
}
