<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    refreshDemoData(db());
    flash('success', 'Database refreshed with default demo data.');
    header('Location: index.php');
    exit;
}

renderHeader('Refresh Database');
?>

<main class="stack gap-lg">
    <section class="panel">
        <div class="badge">Database Refresh</div>
        <h1>Reset demo data</h1>
        <p class="muted">This public page will replace the current app data with the default demo login and seeded records for inventory, ticket, and traceability.</p>
        <form method="post" class="stack">
            <button class="button danger" type="submit" onclick="return confirm('Refresh the database and replace current demo data?');">Refresh database</button>
        </form>
    </section>
</main>

<?php renderFooter(); ?>
