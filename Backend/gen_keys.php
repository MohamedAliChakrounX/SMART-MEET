<?php

$passphrase = 'f8930865d6eb40973e75522856ed17071804541b56ac39a44b7c193ce708de73';
$config = [
    'digest_alg' => 'sha512',
    'private_key_bits' => 4096,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
    'config' => __DIR__ . '/openssl_minimal.cnf',
];

echo "Generating new 4096-bit RSA key...\n";
$key = openssl_pkey_new($config);

if (!$key) {
    echo 'FAILED: ' . openssl_error_string() . "\n";
    exit(1);
}

openssl_pkey_export($key, $privateKey, $passphrase, $config);
$details = openssl_pkey_get_details($key);

if (!is_dir('config/jwt')) {
    mkdir('config/jwt', 0777, true);
}

file_put_contents('config/jwt/private.pem', $privateKey);
file_put_contents('config/jwt/public.pem', $details['key']);

echo "Keys generated successfully.\n";
echo "Private key size: " . filesize('config/jwt/private.pem') . " bytes\n";
echo "Public key size: " . filesize('config/jwt/public.pem') . " bytes\n";
