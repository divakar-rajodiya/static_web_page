<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();

    $username = trim($_POST['username'] ?? '');
    $password = (string) ($_POST['password'] ?? '');

    withOldInput(['username' => $username]);

    $stmt = db()->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        flash('error', 'Invalid username or password.');
        header('Location: login.php');
        exit;
    }

    clearOldInput();
    loginUser($user);
    flash('success', 'Welcome back.');
    header('Location: index.php');
    exit;
}

renderHeader('Login');
?>

<main class="auth-layout">
    <section class="panel auth-panel">
        <div class="badge">Basic Authentication</div>
        <h1>Sign in</h1>
        <p class="muted">Use `demo` / `password` to enter the sample app.</p>

        <form method="post" class="stack">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">

            <label class="field">
                <span>Username</span>
                <input type="text" name="username" value="<?= e(old('username', 'demo')) ?>" required>
            </label>

            <label class="field">
                <span>Password</span>
                <input type="password" name="password" value="password" required>
            </label>

            <button class="button primary" type="submit">Login</button>
        </form>
    </section>
</main>

<?php renderFooter(); ?>
