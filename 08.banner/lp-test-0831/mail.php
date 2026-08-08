<?php
// ═══════════════════════════════════════════════════════
//  FlagK LP — 統合メール送信ハンドラ
//  Xserver PHP 7.4+
// ═══════════════════════════════════════════════════════

// ─── 設定（必ずご確認ください） ────────────────────────
define('MAIL_TO',       'ubereats-support@flagk-co.jp');
define('MAIL_FROM',     'no-reply@flagk-co.jp');
define('MAIL_FROM_NAME', 'FlagK お問い合わせフォーム');
define('GAS_URL',       'https://script.google.com/macros/s/AKfycbyqYW06LycLvbMekxF1h5nef0AUtA2GyxawgfJFvPexBrinP2vDUNDrhqljknOTY_O0/exec');
// ──────────────────────────────────────────────────────

// POSTリクエスト以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// ─── フォーム種別の検証 ────────────────────────────────
$allowed = ['hero', 'mobile', 'resource', 'tel', 'campaign'];
$type    = isset($_POST['form_type']) ? trim($_POST['form_type']) : '';
if (!in_array($type, $allowed, true)) {
    http_response_code(400);
    exit;
}

// ─── リファラーチェック（簡易CSRF対策） ─────────────────
$referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
$host    = isset($_SERVER['HTTP_HOST'])    ? $_SERVER['HTTP_HOST']    : '';
if ($host !== '' && $referer !== '' && strpos($referer, $host) === false) {
    http_response_code(403);
    exit;
}

// ─── ヘルパー関数 ──────────────────────────────────────
// ヘッダーインジェクション対策：改行文字を除去してトリム
function clean($str)
{
    return str_replace(["\r", "\n"], '', trim((string)$str));
}

// $_POST から取得してcleanを適用
function post($key)
{
    return isset($_POST[$key]) ? clean($_POST[$key]) : '';
}

// メールアドレスのバリデーション
function is_valid_email($email)
{
    return $email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// 流入元CTAのID（LP側から hidden で送られる）を日本語ラベルに変換
function cta_label($id)
{
    $labels = [
        'pc_banner_0814'      => 'PCヒーローバナー（8/14キャンペーン）',
        'pc_float_0814'       => 'PC右下フローティング（8/14キャンペーン）',
        'mobile_float_0814'   => 'モバイルフローティング（8/14キャンペーン）',
        'popup_0814'          => 'ポップアップ（8/14キャンペーン）',
        'header_tel'          => 'ヘッダー：電話相談予約',
        'header_line'         => 'ヘッダー：LINE相談',
        'hero_campaign'       => 'ヒーロー：対象キャンペーンを確認',
        'stats_tel'           => '実績セクション：出店申込フォームへ',
        'final_campaign'      => '最終CTA：キャンペーン確認',
        'final_tel'           => '最終CTA：電話相談予約',
        'final_line'          => '最終CTA：LINE相談',
        'mobile_bar_tel'      => 'モバイル下部バー：電話相談予約',
        'mobile_bar_campaign' => 'モバイル下部バー：特典確認',
        'mobile_bar_line'     => 'モバイル下部バー：LINE相談',
        'line_qr'             => 'LINE QRセクション：LINEで相談',
    ];
    if ($id === '') {
        return '（不明：バナー等を経由せずフォームへ到達）';
    }
    return isset($labels[$id]) ? $labels[$id] : $id;
}

// ─── 件名マッピング ────────────────────────────────────
$subjects = [
    'hero'     => '【無料出店相談】お問い合わせ（ヒーローフォーム）',
    'mobile'   => '【無料出店相談】お問い合わせ（モバイルフォーム）',
    'resource' => '【資料請求】資料申し込みフォーム',
    'tel'      => '【電話相談予約】電話相談予約フォーム',
    'campaign' => '【キャンペーン確認】キャンペーン確認フォーム',
];
$subject = $subjects[$type];

// ─── メール本文の組み立て ──────────────────────────────
$line = str_repeat('─', 36);
$sent_at = date('Y年n月j日 H:i');

$body  = $subject . "\n";
$body .= "送信日時：{$sent_at}\n";
$body .= $line . "\n\n";

$reply_to_email = ''; // Reply-To に使う送信者メール

switch ($type) {

    case 'hero':
    case 'mobile':
        $radio_key  = ($type === 'hero') ? 'h_new_store' : 'm_new_store';
        $new_store  = post($radio_key) === 'yes' ? 'はい' : 'いいえ';
        $shop_name  = post('shop_name');
        $contact    = post('contact_name');
        $zip        = post('zip');
        $pref       = post('pref');
        $city       = post('city');
        $address2   = post('address2');
        $tel        = post('tel');
        $email      = post('email');
        if (!is_valid_email($email)) { $email = '（無効なアドレス）'; }
        $reply_to_email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';

        // 必須項目チェック
        if ($shop_name === '' || $contact === '' || $zip === '' || $tel === '') {
            header('Location: /ubereats-support/');
            exit;
        }

        $body .= "【新規出店の検討】{$new_store}\n\n";
        $body .= "店舗名　　：{$shop_name}\n";
        $body .= "担当者名　：{$contact}\n";
        $body .= "郵便番号　：{$zip}\n";
        $body .= "都道府県　：{$pref}\n";
        $body .= "市区町村　：{$city}\n";
        $body .= "丁目・番地：{$address2}\n";
        $body .= "電話番号　：{$tel}\n";
        $body .= "メール　　：" . ($email !== '' ? $email : '（未入力）') . "\n";
        break;

    case 'resource':
        $shop_name = post('shop_name');
        $contact   = post('contact_name');
        $tel       = post('tel');
        $email     = post('email');
        if (!is_valid_email($email)) { $email = '（無効なアドレス）'; }
        $reply_to_email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';

        if ($shop_name === '' || $contact === '' || $tel === '' || $email === '') {
            header('Location: /ubereats-support/');
            exit;
        }

        $body .= "店舗名　：{$shop_name}\n";
        $body .= "担当者名：{$contact}\n";
        $body .= "電話番号：{$tel}\n";
        $body .= "メール　：{$email}\n";
        break;

    case 'tel':
        $shop_name = post('shop_name');
        $contact   = post('contact_name');
        $tel       = post('tel');
        $times     = (isset($_POST['contact_time']) && is_array($_POST['contact_time']))
                     ? array_map('clean', $_POST['contact_time'])
                     : [];

        if ($shop_name === '' || $contact === '' || $tel === '' || empty($times)) {
            header('Location: /ubereats-support/tel-reservation/');
            exit;
        }

        $body .= "店舗名　　　：{$shop_name}\n";
        $body .= "担当者名　　：{$contact}\n";
        $body .= "電話番号　　：{$tel}\n";
        $body .= "希望連絡時間：" . implode('、', $times) . "\n";
        break;

    case 'campaign':
        $company  = post('company');
        $contact  = post('contact_name');
        $tel      = post('tel');
        $email    = post('email');
        if (!is_valid_email($email)) { $email = '（無効なアドレス）'; }
        $reply_to_email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
        $times    = (isset($_POST['contact_time']) && is_array($_POST['contact_time']))
                    ? array_map('clean', $_POST['contact_time'])
                    : [];
        $inquiry  = post('inquiry_type');
        $message  = post('message');

        if ($company === '' || $contact === '' || $tel === '' || empty($times) || $inquiry === '') {
            header('Location: /ubereats-support/campaign-check/');
            exit;
        }

        $body .= "会社名（店舗名）：{$company}\n";
        $body .= "担当者名　　　　：{$contact}\n";
        $body .= "電話番号　　　　：{$tel}\n";
        $body .= "メール　　　　　：" . ($email !== '' ? $email : '（未入力）') . "\n";
        $body .= "希望連絡時間　　：" . implode('、', $times) . "\n";
        $body .= "お問合せ内容　　：{$inquiry}\n";
        $body .= "備考　　　　　　：" . ($message !== '' ? $message : '（なし）') . "\n";
        break;
}

$body .= "\n" . $line . "\n";
$body .= "【流入元】\n";
$body .= "最後にクリックしたCTA：" . cta_label(post('cta_last')) . "\n";
$body .= "最初にクリックしたCTA：" . cta_label(post('cta_first')) . "\n";
$body .= $line . "\n";
$body .= "※ このメールはフォームから自動送信されました。\n";
$body .= "送信元IP：" . $_SERVER['REMOTE_ADDR'] . "\n";

// ─── メール送信（PHPMailer + お名前.com SMTP） ──────────
require __DIR__ . '/../phpmailer/src/Exception.php';
require __DIR__ . '/../phpmailer/src/PHPMailer.php';
require __DIR__ . '/../phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$mail   = new PHPMailer(true);
$result = false;
try {
    $mail->isSMTP();
    $mail->Host       = 'mail1014.onamae.ne.jp';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'ubereats-support@flagk-co.jp';
    $mail->Password   = '"hB9g@rz)E6NWh.';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;

    $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
    $mail->addAddress(MAIL_TO);
    if ($reply_to_email !== '') {
        $mail->addReplyTo($reply_to_email);
    }
    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->isHTML(false);

    $mail->send();
    $result = true;
} catch (Exception $e) {
    $result = false;
}

// ─── スプレッドシートに記録 ────────────────────────────
$radio_key    = ($type === 'hero') ? 'h_new_store' : (($type === 'mobile') ? 'm_new_store' : '');
$new_store_val = ($radio_key !== '') ? (post($radio_key) === 'yes' ? 'はい' : 'いいえ') : '';
$contact_times = (isset($_POST['contact_time']) && is_array($_POST['contact_time']))
                 ? implode('、', array_map('clean', $_POST['contact_time'])) : '';

$gas_data = http_build_query([
    'form_type'    => $type,
    'shop_company' => post('shop_name') ?: post('company'),
    'contact_name' => post('contact_name'),
    'tel'          => post('tel'),
    'email'        => post('email'),
    'zip'          => post('zip'),
    'pref'         => post('pref'),
    'city'         => post('city'),
    'address2'     => post('address2'),
    'new_store'    => $new_store_val,
    'contact_time' => $contact_times,
    'inquiry_type' => post('inquiry_type'),
    'message'      => post('message'),
    'cta_last'     => post('cta_last'),
    'cta_first'    => post('cta_first'),
]);
$ctx = stream_context_create(['http' => [
    'method'  => 'POST',
    'header'  => 'Content-Type: application/x-www-form-urlencoded',
    'content' => $gas_data,
    'timeout' => 2,
    'ignore_errors' => true,
]]);
@file_get_contents(GAS_URL, false, $ctx);

// ─── リダイレクト ──────────────────────────────────────
$success_map = [
    'hero'     => '/thanks.html?type=hero',
    'mobile'   => '/thanks.html?type=mobile',
    'resource' => '/thanks.html?type=resource',
    'tel'      => '/thanks.html?type=tel',
    'campaign' => '/thanks.html?type=campaign',
];

header('Location: ' . ($result ? $success_map[$type] : '/ubereats-support/'));
exit;
