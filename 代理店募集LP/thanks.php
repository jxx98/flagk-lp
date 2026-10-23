<?php
declare(strict_types=1);
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: same-origin');
ini_set('session.use_strict_mode', '1');
session_name('flagk_partner');
session_set_cookie_params(['httponly'=>true, 'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite'=>'Lax', 'path'=>'/']);
session_start();
$receipt = $_GET['receipt'] ?? '';
$valid = is_string($receipt) && preg_match('/^[a-f0-9]{32}$/D', $receipt) && isset($_SESSION['completed'][$receipt]) && $_SESSION['completed'][$receipt] > time() - 86400;
if (!$valid) http_response_code(404);
?>
<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>お問い合わせ受付｜株式会社FlagK</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&amp;display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css"><script src="analytics.js" defer></script><link rel="icon" href="assets/favicon.ico?v=20261020" sizes="any">
<link rel="icon" type="image/png" sizes="48x48" href="assets/favicon-48.png?v=20261020">
<link rel="icon" type="image/png" sizes="144x144" href="assets/favicon-144.png?v=20261020">
</head><body><header><a class="brand" href="index.html"><img src="assets/flagk-logo.webp" width="64" height="64" alt="FlagK"></a><span class="header-label">Uber Eats 法人向け代理店募集</span></header><main class="thanks-main">
<?php if ($valid): ?>
<div data-confirmed-receipt="<?= htmlspecialchars($receipt, ENT_QUOTES, 'UTF-8') ?>"><h1>お問い合わせを受け付けました。</h1><p>株式会社FlagKへご相談いただき、ありがとうございます。担当者より、ご入力いただいた連絡先へご連絡します。</p><p class="receipt">受付ID：<?= htmlspecialchars($receipt, ENT_QUOTES, 'UTF-8') ?></p></div>
<?php else: ?>
<h1>お問い合わせの受付を確認できませんでした。</h1><p>送信後に表示された画面からご確認ください。ご不明な点は <a href="mailto:ubereats-support@flagk-co.jp">ubereats-support@flagk-co.jp</a> へお問い合わせください。</p>
<?php endif; ?>
<a class="button" href="index.html">代理店募集ページへ戻る</a></main><footer><p>株式会社FlagK</p><small>© 2026 FlagK Co., Ltd.</small></footer></body></html>
