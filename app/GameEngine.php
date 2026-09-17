<?php
namespace App;

class GameEngine {
    
    public static function simulateDay($state, $weather, $menuPrices, $inventory, $upgrades) {
        $baseCustomers = 12;
        if (!empty($upgrades['ads'])) $baseCustomers += 8;
        if (!empty($upgrades['interior'])) $baseCustomers += 5;
        
        $reputationFactor = ($state['reputation'] ?? 4.5) / 4.0;
        $totalCustomers = (int) floor($baseCustomers * $reputationFactor);
        
        $sold = 0;
        $revenue = 0;
        $missed = 0;
        
        for ($i = 0; $i < $totalCustomers; $i++) {
            // Decide menu choice based on weather
            $choice = 'aren';
            if ($weather === 'hot') {
                $choices = ['americano', 'aren', 'aren'];
                $choice = $choices[array_rand($choices)];
            } elseif ($weather === 'rainy') {
                $choices = ['latte', 'aren', 'latte'];
                $choice = $choices[array_rand($choices)];
            }
            
            // Check ingredient requirements
            $needed = ['coffee' => 1, 'milk' => 0, 'sugar' => 0, 'cups' => 1];
            if ($choice === 'aren') { $needed['milk'] = 1; $needed['sugar'] = 1; }
            if ($choice === 'latte') { $needed['milk'] = 2; }
            
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
                $price = $menuPrices[$choice] ?? 18000;
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
