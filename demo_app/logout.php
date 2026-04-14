<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

logoutUser();
flash('success', 'You have been logged out.');
header('Location: login.php');
exit;
