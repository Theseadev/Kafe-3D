<?php
// Autoloader
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    // Standalone fallback for direct testing
    spl_autoload_register(function ($class) {
        $prefix = 'App\\';
        $base_dir = __DIR__ . '/app/';
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) return;
        $relative_class = substr($class, $len);
        $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
        if (file_exists($file)) require $file;
    });
}

// Session init for Game State
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['game_state'])) {
    $_SESSION['game_state'] = [
        'day' => 1,
        'money' => 500000,
        'reputation' => 4.5,
        'weather' => 'sunny',
        'inventory' => ['coffee' => 50, 'milk' => 40, 'sugar' => 40, 'cups' => 50],
        'prices' => ['aren' => 18000, 'americano' => 15000, 'latte' => 22000],
        'upgrades' => ['machine' => false, 'interior' => false, 'ads' => false]
    ];
}

// Check if Flight PHP class is loaded
if (class_exists('Flight')) {
    // --- FLIGHT PHP ROUTES ---
    Flight::route('GET /', function () {
        Flight::render('index.html');
    });

    Flight::route('GET /api/state', function () {
        Flight::json($_SESSION['game_state']);
    });

    Flight::route('POST /api/simulate-day', function () {
        $data = Flight::request()->data;
        $result = App\GameEngine::simulateDay(
            $_SESSION['game_state'],
            $data['weather'] ?? 'sunny',
            $data['prices'] ?? $_SESSION['game_state']['prices'],
            $data['inventory'] ?? $_SESSION['game_state']['inventory'],
            $data['upgrades'] ?? $_SESSION['game_state']['upgrades']
        );
        
        $_SESSION['game_state']['money'] = $result['updated_money'];
        $_SESSION['game_state']['inventory'] = $result['updated_inventory'];
        $_SESSION['game_state']['day']++;
        
        Flight::json($result);
    });

    Flight::start();
} else {
    // Simple micro-router fallback
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if ($path === '/' || $path === '/index.php') {
        readfile(__DIR__ . '/index.html');
    } else {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'ok', 'state' => $_SESSION['game_state']]);
    }
}
