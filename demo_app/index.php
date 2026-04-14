<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
requireLogin();

$cases = caseDefinitions();

renderHeader('Dashboard');
?>

<main class="stack gap-lg">
    <section class="hero panel">
        <div>
            <div class="badge">Landing Page</div>
            <h1>Choose a use case</h1>
            <p class="muted">Each card opens a separate CRUD table with seeded records and a print action that calls the QPRO `print_markups` API flow through the SDK.</p>
        </div>
        <div class="inline-actions">
            <a class="button secondary" href="refresh_database.php">Refresh demo data</a>
        </div>
    </section>

    <section class="card-grid">
        <?php foreach ($cases as $case): ?>
            <a class="card-link" href="use_case.php?case=<?= e($case['slug']) ?>">
                <span class="card-kicker"><?= e($case['name']) ?></span>
                <strong><?= e($case['title']) ?></strong>
                <span class="muted">Open table, manage records, and print labels.</span>
            </a>
        <?php endforeach; ?>
    </section>
</main>

<?php renderFooter(); ?>
