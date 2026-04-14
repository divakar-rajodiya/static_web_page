<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
requireLogin();

$case = getCaseOrFail($_GET['case'] ?? '');
$records = fetchRecords($case['table']);
$editing = null;

if (isset($_GET['edit'])) {
    $editing = fetchRecord($case['table'], (int) $_GET['edit']);
}

renderHeader($case['title'], $case);
?>

<main class="stack gap-lg">
    <section class="panel split">
        <div>
            <div class="badge"><?= e($case['name']) ?></div>
            <h1><?= e($case['title']) ?> records</h1>
            <p class="muted">The table now shows richer operational data, and the last column includes the print button plus edit and delete actions.</p>
        </div>
        <div class="inline-actions">
            <a class="button secondary" href="index.php">Back to dashboard</a>
        </div>
    </section>

    <section class="panel">
        <h2><?= $editing ? 'Update record' : 'Create record' ?></h2>
        <form method="post" action="save_record.php" class="grid-form">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="case" value="<?= e($case['slug']) ?>">
            <?php if ($editing): ?>
                <input type="hidden" name="id" value="<?= (int) $editing['id'] ?>">
            <?php endif; ?>

            <label class="field">
                <span>Reference Code</span>
                <input type="text" name="reference_code" value="<?= e($editing['reference_code'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Title</span>
                <input type="text" name="title" value="<?= e($editing['title'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Location</span>
                <input type="text" name="location" value="<?= e($editing['location'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Status</span>
                <input type="text" name="status" value="<?= e($editing['status'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Owner</span>
                <input type="text" name="owner_name" value="<?= e($editing['owner_name'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Category</span>
                <input type="text" name="category" value="<?= e($editing['category'] ?? '') ?>" required>
            </label>

            <label class="field">
                <span>Quantity</span>
                <input type="number" min="0" name="quantity" value="<?= e((string) ($editing['quantity'] ?? 0)) ?>" required>
            </label>

            <label class="field">
                <span>Scheduled At</span>
                <input type="datetime-local" name="scheduled_at" value="<?= e(isset($editing['scheduled_at']) && $editing['scheduled_at'] ? date('Y-m-d\TH:i', strtotime($editing['scheduled_at'])) : '') ?>">
            </label>

            <div class="form-actions">
                <button class="button primary" type="submit"><?= $editing ? 'Update record' : 'Add record' ?></button>
                <?php if ($editing): ?>
                    <a class="button secondary" href="use_case.php?case=<?= e($case['slug']) ?>">Cancel</a>
                <?php endif; ?>
            </div>
        </form>
    </section>

    <section class="panel">
        <div class="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Reference Code</th>
                    <th>Title</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Scheduled</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <?php foreach ($records as $record): ?>
                    <tr>
                        <td><?= (int) $record['id'] ?></td>
                        <td><?= e($record['reference_code']) ?></td>
                        <td><?= e($record['title']) ?></td>
                        <td><?= e($record['location']) ?></td>
                        <td><strong><?= e($record['status']) ?></strong></td>
                        <td><?= e($record['owner_name']) ?></td>
                        <td><?= e($record['category']) ?></td>
                        <td><?= (int) $record['quantity'] ?></td>
                        <td><?= e($record['scheduled_at'] ? date('Y-m-d H:i', strtotime($record['scheduled_at'])) : '-') ?></td>
                        <td>
                            <div class="inline-actions">
                                <button
                                    type="button"
                                    class="button tiny"
                                    data-print-button
                                    data-case="<?= e($case['slug']) ?>"
                                    data-id="<?= (int) $record['id'] ?>"
                                    data-title="<?= e($record['title']) ?>"
                                    data-reference-code="<?= e($record['reference_code']) ?>"
                                    data-location="<?= e($record['location']) ?>"
                                    data-status="<?= e($record['status']) ?>"
                                    data-owner-name="<?= e($record['owner_name']) ?>"
                                    data-category="<?= e($record['category']) ?>"
                                    data-quantity="<?= (int) $record['quantity'] ?>"
                                    data-scheduled-at="<?= e((string) $record['scheduled_at']) ?>"
                                    data-label-name="<?= e(appConfig()['qpro']['labels'][$case['slug']]) ?>"
                                >
                                    Print
                                </button>
                                <a class="button tiny secondary" href="use_case.php?case=<?= e($case['slug']) ?>&edit=<?= (int) $record['id'] ?>">Edit</a>
                                <form method="post" action="delete_record.php" onsubmit="return confirm('Delete this record?');">
                                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                                    <input type="hidden" name="case" value="<?= e($case['slug']) ?>">
                                    <input type="hidden" name="id" value="<?= (int) $record['id'] ?>">
                                    <button class="button tiny danger" type="submit">Delete</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>

    <section class="panel">
        <h2>QPRO label variables to configure</h2>
        <p class="muted">In the QPRO label designer for <?= e($case['title']) ?>, create placeholders using the exact names below. The PHP app sends these keys in `apiData`.</p>
        <div class="chips">
            <?php foreach (appConfig()['qpro']['api_fields'] as $field): ?>
                <span class="chip"><?= e('{{api:' . $field . '}}') ?></span>
            <?php endforeach; ?>
        </div>
    </section>
</main>

<?php renderFooter(); ?>
