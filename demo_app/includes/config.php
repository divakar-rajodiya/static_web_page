<?php

declare(strict_types=1);

return [
    'auth' => [
        'demo_username' => 'demo',
        'demo_password' => 'password',
    ],
//   local
    'database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'quandosol_demo',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
//   production
//    'database' => [
//        'host' => '127.0.0.1',
//        'port' => 3306,
//        'database' => 'quandosol_demo',
//        'username' => 'quandosol_demo',
//        'password' => '#kWB,mN=7ouj',
//        'charset' => 'utf8mb4',
//    ],
    'qpro' => [
        'environment' => 'local',
        'endpoints' => [
            'local' => 'http://qcim-backend.test/api',
            'production' => 'https://api.beta.quandosol.com/api',
        ],
//       local
        'api_key' => 'WhfLxEHQckQu27E7PsgAvirzDdvTNO3s',
        'api_secret' => 'J4U3UTQviKE8js7bS1PjVGzlk5siLzYQ1q6H1ulZxkdHke0fd0FWa0w50uXMfJ0b',
//       production
//        'api_key' => 'OXxd0iQPn2mHbs4PBbNtEZ2cKppfcvdl',
//        'api_secret' => 'tPC5dj4WRnB3ZX3T1LJ9BgnHu6ikJo96c5u72BAKkNtYWPlzrIAQK1b5Bf04bUgz',
        'labels' => [
            'inventory' => 'inventory',
            'ticket' => 'ticket',
            'traceability' => 'traceability',
        ],
        'api_fields' => [
            'record_id',
            'reference_code',
            'title',
            'location',
            'status',
            'owner_name',
            'category',
            'quantity',
            'scheduled_at',
        ],
    ],
];
