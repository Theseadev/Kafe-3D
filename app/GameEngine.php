<?php
namespace App;

/**
 * ☕ GameEngine — Deterministic Business Simulation Engine for Kafe 3D
 * Architecture: Service Layer for Flight PHP Micro-Framework
 * 
 * Handles inventory deductions, daily customer order economics,
 * profit calculations, and recipe validations for the 3D coffee shop.
 */
class GameEngine {

    /**
     * Menu Recipe Definitions & Pricing
     */
    public const MENU = [
        'kenangan_mantan' => [
            'name' => 'Es Kopi Kenangan Mantan',
            'price' => 18000,
            'cost' => 6500,
            'req' => ['beans' => 1, 'milk' => 1, 'aren' => 1]
        ],
        'latte_art' => [
            'name' => 'Hot Cafe Latte Art',
            'price' => 22000,
            'cost' => 8000,
            'req' => ['beans' => 1, 'milk' => 2]
        ],
        'matcha_zen' => [
            'name' => 'Matcha Latte Zen',
            'price' => 24000,
            'cost' => 9000,
            'req' => ['matcha' => 1, 'milk' => 1]
        ],
        'donut_glazed' => [
            'name' => 'Donat Cokelat Meises',
            'price' => 15000,
            'cost' => 4500,
            'req' => ['pastry' => 1]
        ],
        'croissant_butter' => [
            'name' => 'Butter Croissant Warm',
            'price' => 16000,
            'cost' => 5000,
            'req' => ['pastry' => 1]
        ]
    ];
    
    public static function simulateDay($state, $weather, $menuPrices, $inventory, $upgrades) {
        $baseCustomers = 12;
        if (!empty($upgrades['ads'])) $baseCustomers += 8;
        if (!empty($upgrades['interior'])) $baseCustomers += 5;
        
        $reputationFactor = ($state['reputation'] ?? 4.5) / 4.0;
        $totalCustomers = (int) floor($baseCustomers * $reputationFactor);
        
        $sold = 0;
        $revenue = 0;
        $missed = 0;
        
        $menuKeys = array_keys(self::MENU);

        for ($i = 0; $i < $totalCustomers; $i++) {
            // Decide menu choice based on weather preference
            $choice = 'kenangan_mantan';
            if ($weather === 'hot') {
                $choices = ['kenangan_mantan', 'matcha_zen', 'donut_glazed'];
                $choice = $choices[array_rand($choices)];
            } elseif ($weather === 'rainy' || $weather === 'snowy') {
                $choices = ['latte_art', 'matcha_zen', 'croissant_butter'];
                $choice = $choices[array_rand($choices)];
            } else {
                $choice = $menuKeys[array_rand($menuKeys)];
            }
            
            $recipe = self::MENU[$choice] ?? self::MENU['kenangan_mantan'];
            $needed = $recipe['req'];
            
            $canServe = true;
            foreach ($needed as $ing => $qty) {
                if (($inventory[$ing] ?? 0) < $qty) {
                    $canServe = false;
                    break;
                }
            }
            
            if ($canServe) {
                foreach ($needed as $ing => $qty) {
                    $inventory[$ing] -= $qty;
                }
                $price = $menuPrices[$choice] ?? $recipe['price'];
                $revenue += $price;
                $sold++;
            } else {
                $missed++;
            }
        }
        
        $rent = 30000;
        $netProfit = $revenue - $rent;
        
        return [
            'sold' => $sold,
            'missed' => $missed,
            'revenue' => $revenue,
            'rent' => $rent,
            'net_profit' => $netProfit,
            'updated_inventory' => $inventory,
            'updated_money' => ($state['money'] ?? 500000) + $netProfit
        ];
    }
}
