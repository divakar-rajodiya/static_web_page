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
        'api_key' => 'yS3cC7iTv5z6DBO6iPaRrh1Cs9Z0twRu',
        'api_secret' => 'T3ewDV53EMPZs6vb5kyit6NDYn4rRtJHQmMO65sRxZAJITHCWo3n2unCVmOUfWBS',
//       production
//        'api_key' => 'OXxd0iQPn2mHbs4PBbNtEZ2cKppfcvdl',
//        'api_secret' => 'gK8ix5NTYRrhxMhVzmwkhc1JfEoj3WvKAvTOduHGiWcfGYK4cC9gO3jACxK2Rm5n',
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
