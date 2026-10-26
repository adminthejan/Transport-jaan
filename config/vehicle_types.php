<?php

/**
 * Air and sea vehicle type lists (client amendment, 07 Oct).
 *
 * 'air' / 'sea' are the types offered when listing and searching vehicles.
 * The *_legacy lists are values older rows may still hold (they were offered
 * before the amendment); they stay valid for filtering and validation so no
 * existing vehicle breaks, but they are not shown as choices any more.
 *
 * The JS mirror of this file is resources/js/constants/vehicleTypes.js.
 */

$air = [
    'private_jet' => 'Private Jets',
    'business_aircraft' => 'Business Aircraft',
    'helicopter' => 'Helicopters',
    'charter_aircraft' => 'Charter Aircraft',
    'light_aircraft' => 'Light Aircraft',
    'turboprop_aircraft' => 'Turboprop Aircraft',
    'seaplane' => 'Seaplanes',
    'vip_aircraft' => 'VIP Aircraft',
    'air_ambulance' => 'Air Ambulance',
    'tourism_adventure' => 'Tourism & Adventure',
    'special_purpose_aircraft' => 'Special-Purpose Aircraft',
    'recreational_aircraft' => 'Recreational Aircraft',
    'other_aircraft' => 'Other Aircraft',
];

$airLegacy = ['fixed_wing', 'commercial_airliner', 'business_jet', 'glider', 'cargo_aircraft', 'hot_air_balloon', 'other'];

$sea = [
    'boat' => 'Boats',
    'speedboat' => 'Speedboats',
    'yacht' => 'Yachts',
    'sailboat' => 'Sailboats',
    'catamaran' => 'Catamarans',
    'jet_ski' => 'Jet Skis',
    'houseboat' => 'Houseboats',
    'fishing_boat' => 'Fishing Boats',
    'diving_adventure_boat' => 'Diving / Adventure Boats',
    'passenger_boat' => 'Passenger Boats',
    'kayak_canoe' => 'Kayaks / Canoes',
    'pontoon' => 'Pontoons',
    'luxury_vip_boat' => 'Luxury / VIP Boats',
    'other_watercraft' => 'Other Watercraft',
];

$seaLegacy = ['cruise_ship', 'ferry', 'tugboat', 'cargo_vessel', 'other'];

return [
    'air' => $air,
    'air_legacy' => $airLegacy,
    'air_all' => array_merge(array_keys($air), $airLegacy),
    'sea' => $sea,
    'sea_legacy' => $seaLegacy,
    'sea_all' => array_merge(array_keys($sea), $seaLegacy),
];
