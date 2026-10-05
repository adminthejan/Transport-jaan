<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TrainStation;

class TrainStationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stations = [
            // Major railway stations in Sri Lanka
            ['name' => 'Colombo Fort Railway Station', 'code' => 'CMB', 'city' => 'Colombo', 'province' => 'Western Province', 'latitude' => 6.9349, 'longitude' => 79.8538],
            ['name' => 'Maradana Railway Station', 'code' => 'MDA', 'city' => 'Colombo', 'province' => 'Western Province', 'latitude' => 6.9269, 'longitude' => 79.8612],
            ['name' => 'Kandy Railway Station', 'code' => 'KDT', 'city' => 'Kandy', 'province' => 'Central Province', 'latitude' => 7.2906, 'longitude' => 80.6337],
            ['name' => 'Galle Railway Station', 'code' => 'GAL', 'city' => 'Galle', 'province' => 'Southern Province', 'latitude' => 6.0535, 'longitude' => 80.2210],
            ['name' => 'Matara Railway Station', 'code' => 'MTR', 'city' => 'Matara', 'province' => 'Southern Province', 'latitude' => 5.9549, 'longitude' => 80.5550],
            ['name' => 'Anuradhapura Railway Station', 'code' => 'ANP', 'city' => 'Anuradhapura', 'province' => 'North Central Province', 'latitude' => 8.3114, 'longitude' => 80.4037],
            ['name' => 'Polonnaruwa Railway Station', 'code' => 'POL', 'city' => 'Polonnaruwa', 'province' => 'North Central Province', 'latitude' => 7.9403, 'longitude' => 81.0188],
            ['name' => 'Batticaloa Railway Station', 'code' => 'BTL', 'city' => 'Batticaloa', 'province' => 'Eastern Province', 'latitude' => 7.7102, 'longitude' => 81.6924],
            ['name' => 'Trincomalee Railway Station', 'code' => 'TNK', 'city' => 'Trincomalee', 'province' => 'Eastern Province', 'latitude' => 8.5874, 'longitude' => 81.2152],
            ['name' => 'Kurunegala Railway Station', 'code' => 'KUR', 'city' => 'Kurunegala', 'province' => 'North Western Province', 'latitude' => 7.4818, 'longitude' => 80.3609],
            ['name' => 'Puttalam Railway Station', 'code' => 'PND', 'city' => 'Puttalam', 'province' => 'North Western Province', 'latitude' => 8.0362, 'longitude' => 79.8283],
            ['name' => 'Ratnapura Railway Station', 'code' => 'RTP', 'city' => 'Ratnapura', 'province' => 'Sabaragamuwa Province', 'latitude' => 6.6828, 'longitude' => 80.3992],
            ['name' => 'Badulla Railway Station', 'code' => 'BDL', 'city' => 'Badulla', 'province' => 'Uva Province', 'latitude' => 6.9934, 'longitude' => 81.0550],
            ['name' => 'Bandarawela Railway Station', 'code' => 'BAN', 'city' => 'Bandarawela', 'province' => 'Uva Province', 'latitude' => 6.8326, 'longitude' => 80.9947],
            ['name' => 'Ella Railway Station', 'code' => 'ELA', 'city' => 'Ella', 'province' => 'Uva Province', 'latitude' => 6.8667, 'longitude' => 81.0464],
            ['name' => 'Nanu Oya Railway Station', 'code' => 'NWE', 'city' => 'Nuwara Eliya', 'province' => 'Central Province', 'latitude' => 6.9497, 'longitude' => 80.7891],
            ['name' => 'Hatton Railway Station', 'code' => 'HTN', 'city' => 'Hatton', 'province' => 'Central Province', 'latitude' => 6.8908, 'longitude' => 80.5953],
            ['name' => 'Nawalapitiya Railway Station', 'code' => 'NRL', 'city' => 'Nawalapitiya', 'province' => 'Central Province', 'latitude' => 7.0558, 'longitude' => 80.5333],
            ['name' => 'Peradeniya Railway Station', 'code' => 'PER', 'city' => 'Peradeniya', 'province' => 'Central Province', 'latitude' => 7.2599, 'longitude' => 80.5977],
            ['name' => 'Gampaha Railway Station', 'code' => 'GMP', 'city' => 'Gampaha', 'province' => 'Western Province', 'latitude' => 7.0840, 'longitude' => 79.9994],
            ['name' => 'Ragama Railway Station', 'code' => 'RGM', 'city' => 'Ragama', 'province' => 'Western Province', 'latitude' => 7.0276, 'longitude' => 79.9217],
            ['name' => 'Veyangoda Railway Station', 'code' => 'VYA', 'city' => 'Veyangoda', 'province' => 'Western Province', 'latitude' => 7.1549, 'longitude' => 80.0583],
            ['name' => 'Mirigama Railway Station', 'code' => 'MHO', 'city' => 'Mirigama', 'province' => 'Western Province', 'latitude' => 7.2417, 'longitude' => 80.1167],
            ['name' => 'Pallewela Railway Station', 'code' => 'PLM', 'city' => 'Pallewela', 'province' => 'Central Province', 'latitude' => 7.2558, 'longitude' => 80.4308],
            ['name' => 'Ambalangoda Railway Station', 'code' => 'AMB', 'city' => 'Ambalangoda', 'province' => 'Southern Province', 'latitude' => 6.2357, 'longitude' => 80.0540],
            ['name' => 'Hikkaduwa Railway Station', 'code' => 'HIK', 'city' => 'Hikkaduwa', 'province' => 'Southern Province', 'latitude' => 6.1391, 'longitude' => 80.1037],
            ['name' => 'Unawatuna Railway Station', 'code' => 'UNW', 'city' => 'Unawatuna', 'province' => 'Southern Province', 'latitude' => 6.0108, 'longitude' => 80.2497],
            ['name' => 'Kalutara South Railway Station', 'code' => 'KLT', 'city' => 'Kalutara', 'province' => 'Western Province', 'latitude' => 6.5854, 'longitude' => 79.9607],
            ['name' => 'Aluthgama Railway Station', 'code' => 'ALT', 'city' => 'Aluthgama', 'province' => 'Western Province', 'latitude' => 6.4287, 'longitude' => 79.9983],
            ['name' => 'Bentota Railway Station', 'code' => 'BEN', 'city' => 'Bentota', 'province' => 'Southern Province', 'latitude' => 6.4259, 'longitude' => 79.9951],
        ];

        foreach ($stations as $station) {
            TrainStation::updateOrCreate(['code' => $station['code']], $station);
        }
    }
}
