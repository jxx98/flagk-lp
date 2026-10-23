<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

// Dedicated partner form. It never writes to the existing store-enquiry spreadsheet.
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
ini_set('session.use_strict_mode', '1');
session_name('flagk_partner');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax', 'path' => '/']);
session_start();

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function field(string $name, int $max, bool $multiline = false): string {
    $raw = $_POST[$name] ?? '';
    if (!is_string($raw) || preg_match('//u', $raw) !== 1 || strpos($raw, "\0") !== false) reply(422, ['ok' => false, 'code' => 'validation']);
    $value = trim($raw);
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : preg_match_all('/./us', $value);
    if ($length > $max || (!$multiline && preg_match('/[\r\n]/', $value))) reply(422, ['ok' => false, 'code' => 'validation']);
    return $value;
}
function allow_request(): bool {
    $key = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $path = sys_get_temp_dir() . '/flagk-partner-rate-' . $key . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) return false;
    if (!flock($handle, LOCK_EX)) { fclose($handle); return false; }
    $raw = stream_get_contents($handle);
    $times = json_decode($raw ?: '[]', true);
    if (!is_array($times)) $times = [];
    $now = time();
    $times = array_values(array_filter($times, static function ($t) use ($now) { return is_int($t) && $t > $now - 600; }));
    $allowed = count($times) < 5;
    if ($allowed) $times[] = $now;
    rewind($handle); ftruncate($handle, 0); fwrite($handle, json_encode($times)); fflush($handle);
    flock($handle, LOCK_UN); fclose($handle);
    return $allowed;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET' && ($_GET['action'] ?? '') === 'token') {
    if (!isset($_SESSION['csrf'], $_SESSION['csrf_issued']) || time() - $_SESSION['csrf_issued'] > 3600) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_issued'] = time();
    }
    reply(200, ['csrf' => $_SESSION['csrf'], 'submission_id' => bin2hex(random_bytes(16))]);
}
if ($method !== 'POST') { header('Allow: GET, POST'); reply(405, ['ok' => false, 'code' => 'method']); }
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) reply(413, ['ok' => false, 'code' => 'size']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $host = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!$originHost || !$host || strtolower($originHost) !== strtolower($host)) reply(403, ['ok' => false, 'code' => 'origin']);
}
$csrf = field('csrf', 64);
$id = field('submission_id', 32);
if (!isset($_SESSION['csrf'], $_SESSION['csrf_issued']) || time() - $_SESSION['csrf_issued'] > 3600 || !hash_equals($_SESSION['csrf'], $csrf) || !preg_match('/^[a-f0-9]{32}$/D', $id)) reply(403, ['ok' => false, 'code' => 'csrf']);
// A lost response may be retried safely: the same successful submission is not mailed again.
if (isset($_SESSION['completed'][$id])) reply(200, ['ok' => true, 'receipt' => $id]);
if (field('website', 200) !== '') reply(422, ['ok' => false, 'code' => 'validation']);
$company = field('company', 120); $person = field('person', 80);
$email = field('email', 200); $phone = field('phone', 20); $message = field('message', 2000, true);
$privacy = field('privacy', 1);
$normalizedPhone = strtr($phone, ['０'=>'0','１'=>'1','２'=>'2','３'=>'3','４'=>'4','５'=>'5','６'=>'6','７'=>'7','８'=>'8','９'=>'9','＋'=>'+','（'=>'(','）'=>')','　'=>' ']);
$digits = preg_replace('/[^0-9]/', '', $normalizedPhone);
if ($company === '' || $person === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[+0-9()\s-]+$/D', $normalizedPhone) || strlen($digits) < 10 || strlen($digits) > 15 || $privacy !== '1') reply(422, ['ok' => false, 'code' => 'validation']);
if (!allow_request()) reply(429, ['ok' => false, 'code' => 'rate']);

// Reuse the production SMTP configuration outside public_html. Never bundle its password.
$configPath = getenv('FLAGK_SMTP_CONFIG_PATH') ?: dirname(__DIR__, 2) . '/flagk-mail-config.php';
$realConfig = realpath($configPath);
$documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
if (!$realConfig || ($documentRoot && ($realConfig === $documentRoot || strpos($realConfig, $documentRoot . DIRECTORY_SEPARATOR) === 0))) reply(503, ['ok' => false, 'code' => 'configuration']);
try {
    $config = require $realConfig;
    foreach (['host','username','password'] as $key) if (!is_array($config) || empty($config[$key])) throw new RuntimeException('configuration');
    require_once __DIR__ . '/vendor/phpmailer/src/Exception.php';
    require_once __DIR__ . '/vendor/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/vendor/phpmailer/src/SMTP.php';
    $mail = new PHPMailer(true);
    $mail->isSMTP(); $mail->Host = $config['host']; $mail->SMTPAuth = true;
    $mail->Username = $config['username']; $mail->Password = $config['password'];
    $mail->SMTPSecure = ($config['encryption'] ?? 'smtps') === 'starttls' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = (int) ($config['port'] ?? 465); $mail->Timeout = 15;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('no-reply@flagk-co.jp', 'FlagK 法人代理店募集');
    $mail->addAddress('ubereats-support@flagk-co.jp');
    $mail->addReplyTo($email, $person);
    $mail->Subject = '【法人代理店募集】Uber Eats 加盟店開拓のご相談';
    $body = "受付ID：{$id}\n\n法人名：{$company}\nご担当者：{$person}\n電話番号：{$phone}\nメール：{$email}\n個人情報保護方針：同意済み\n\nご相談内容：\n{$message}\n\n";
    foreach (['cta_last','utm_source','utm_medium','utm_campaign','gclid','gbraid','wbraid'] as $key) {
        $value = field($key, 200);
        if ($value !== '') $body .= $key . '：' . $value . "\n";
    }
    $body .= "\nフォーム：Uber Eats 法人向け二次代理店募集\n";
    $mail->isHTML(false); $mail->Body = $body;
    $mail->send();
} catch (Throwable $error) {
    error_log('FlagK partner enquiry: SMTP/configuration failure.');
    reply(503, ['ok' => false, 'code' => 'delivery']);
}
$_SESSION['completed'][$id] = time();
// Keep receipt history bounded and expire old receipt claims.
$_SESSION['completed'] = array_filter($_SESSION['completed'], static function ($time) { return $time > time() - 86400; });
if (count($_SESSION['completed']) > 20) $_SESSION['completed'] = array_slice($_SESSION['completed'], -20, null, true);
reply(200, ['ok' => true, 'receipt' => $id]);
