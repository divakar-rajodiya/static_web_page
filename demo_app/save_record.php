<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
requireLogin();
verifyCsrf();

$case = getCaseOrFail($_POST['case'] ?? '');
$id = isset($_POST['id']) ? (int) $_POST['id'] : null;

$payload = [
    'reference_code' => trim($_POST['reference_code'] ?? ''),
    'title' => trim($_POST['title'] ?? ''),
    'location' => trim($_POST['location'] ?? ''),
    'status' => trim($_POST['status'] ?? ''),
    'owner_name' => trim($_POST['owner_name'] ?? ''),
    'category' => trim($_POST['category'] ?? ''),
    'quantity' => max(0, (int) ($_POST['quantity'] ?? 0)),
    'scheduled_at' => trim($_POST['scheduled_at'] ?? ''),
];

foreach (['reference_code', 'title', 'location', 'status', 'owner_name', 'category'] as $requiredField) {
    if ($payload[$requiredField] === '') {
        flash('error', 'All fields are required.');
        header('Location: use_case.php?case=' . urlencode($case['slug']) . ($id ? '&edit=' . $id : ''));
        exit;
    }
}

$payload['scheduled_at'] = $payload['scheduled_at'] !== ''
    ? date('Y-m-d H:i:s', strtotime($payload['scheduled_at']))
    : null;

if ($id) {
    $stmt = db()->prepare(
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
    $stmt->execute($payload + ['updated_at' => now(), 'id' => $id]);
    flash('success', $case['title'] . ' record updated.');
} else {
    $stmt = db()->prepare(
        sprintf(
            'INSERT INTO %s
             (reference_code, title, location, status, owner_name, category, quantity, scheduled_at, created_at, updated_at)
             VALUES
             (:reference_code, :title, :location, :status, :owner_name, :category, :quantity, :scheduled_at, :created_at, :updated_at)',
            $case['table']
        )
    );
    $stmt->execute($payload + ['created_at' => now(), 'updated_at' => now()]);
    flash('success', $case['title'] . ' record created.');
}

header('Location: use_case.php?case=' . urlencode($case['slug']));
exit;
