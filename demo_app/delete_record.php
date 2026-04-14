<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
requireLogin();
verifyCsrf();

$case = getCaseOrFail($_POST['case'] ?? '');
$id = (int) ($_POST['id'] ?? 0);

$stmt = db()->prepare(sprintf('DELETE FROM %s WHERE id = :id', $case['table']));
$stmt->execute(['id' => $id]);

flash('success', $case['title'] . ' record deleted.');
header('Location: use_case.php?case=' . urlencode($case['slug']));
exit;
