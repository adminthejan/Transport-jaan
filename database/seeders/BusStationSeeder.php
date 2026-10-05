<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\BusStation;

class BusStationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stations = [
            // Major bus stations in Sri Lanka
            ['name' => 'Colombo Central Bus Stand', 'code' => 'CCBS', 'city' => 'Colombo', 'province' => 'Western Province', 'latitude' => 6.9271, 'longitude' => 79.8612],
            ['name' => 'Pettah Bus Station', 'code' => 'PBS', 'city' => 'Colombo', 'province' => 'Western Province', 'latitude' => 6.9349, 'longitude' => 79.8538],
            ['name' => 'Kandy Bus Terminal', 'code' => 'KBT', 'city' => 'Kandy', 'province' => 'Central Province', 'latitude' => 7.2906, 'longitude' => 80.6337],
            ['name' => 'Galle Bus Station', 'code' => 'GBS', 'city' => 'Galle', 'province' => 'Southern Province', 'latitude' => 6.0535, 'longitude' => 80.2210],
            ['name' => 'Matara Bus Station', 'code' => 'MBS', 'city' => 'Matara', 'province' => 'Southern Province', 'latitude' => 5.9549, 'longitude' => 80.5550],
            ['name' => 'Anuradhapura Bus Station', 'code' => 'ABS', 'city' => 'Anuradhapura', 'province' => 'North Central Province', 'latitude' => 8.3114, 'longitude' => 80.4037],
            ['name' => 'Kurunegala Bus Station', 'code' => 'KUBS', 'city' => 'Kurunegala', 'province' => 'North Western Province', 'latitude' => 7.4818, 'longitude' => 80.3609],
            ['name' => 'Ratnapura Bus Station', 'code' => 'RBS', 'city' => 'Ratnapura', 'province' => 'Sabaragamuwa Province', 'latitude' => 6.6828, 'longitude' => 80.3992],
            ['name' => 'Badulla Bus Station', 'code' => 'BBS', 'city' => 'Badulla', 'province' => 'Uva Province', 'latitude' => 6.9934, 'longitude' => 81.0550],
            ['name' => 'Jaffna Bus Station', 'code' => 'JBS', 'city' => 'Jaffna', 'province' => 'Northern Province', 'latitude' => 9.6615, 'longitude' => 80.0255],
            ['name' => 'Negombo Bus Station', 'code' => 'NBS', 'city' => 'Negombo', 'province' => 'Western Province', 'latitude' => 7.2083, 'longitude' => 79.8358],
            ['name' => 'Gampaha Bus Station', 'code' => 'GABS', 'city' => 'Gampaha', 'province' => 'Western Province', 'latitude' => 7.0840, 'longitude' => 79.9994],
            ['name' => 'Kalutara Bus Station', 'code' => 'KABS', 'city' => 'Kalutara', 'province' => 'Western Province', 'latitude' => 6.5854, 'longitude' => 79.9607],
            ['name' => 'Hambantota Bus Station', 'code' => 'HBS', 'city' => 'Hambantota', 'province' => 'Southern Province', 'latitude' => 6.1241, 'longitude' => 81.1185],
            ['name' => 'Trincomalee Bus Station', 'code' => 'TBS', 'city' => 'Trincomalee', 'province' => 'Eastern Province', 'latitude' => 8.5874, 'longitude' => 81.2152],
            ['name' => 'Batticaloa Bus Station', 'code' => 'BABS', 'city' => 'Batticaloa', 'province' => 'Eastern Province', 'latitude' => 7.7102, 'longitude' => 81.6924],
            ['name' => 'Polonnaruwa Bus Station', 'code' => 'POBS', 'city' => 'Polonnaruwa', 'province' => 'North Central Province', 'latitude' => 7.9403, 'longitude' => 81.0188],
            ['name' => 'Nuwara Eliya Bus Station', 'code' => 'NEBS', 'city' => 'Nuwara Eliya', 'province' => 'Central Province', 'latitude' => 6.9497, 'longitude' => 80.7891],
            ['name' => 'Bandarawela Bus Station', 'code' => 'BWBS', 'city' => 'Bandarawela', 'province' => 'Uva Province', 'latitude' => 6.8326, 'longitude' => 80.9947],
            ['name' => 'Chilaw Bus Station', 'code' => 'CBS', 'city' => 'Chilaw', 'province' => 'North Western Province', 'latitude' => 7.5759, 'longitude' => 79.7955]
        ];

        foreach ($stations as $station) {
            BusStation::updateOrCreate(['code' => $station['code']], $station);
        }
    }
}
