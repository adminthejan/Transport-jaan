<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location\LocationCity;
use App\Models\Location\LocationCountry;
use App\Models\Location\LocationDistrict;
use App\Models\Location\LocationProvince;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LocationLookupController extends Controller
{
    public function countries(Request $request)
    {
        $activeOnly = $request->boolean('active_only', true);

        $cacheKey = 'location_lookup:countries:active_' . ($activeOnly ? '1' : '0');

        $countries = Cache::remember($cacheKey, now()->addHours(24), function () use ($activeOnly) {
            $query = LocationCountry::query()
                ->select(['id', 'iso2', 'iso3', 'name_en', 'name_native', 'currency_code', 'phone_code', 'is_active'])
                ->orderBy('name_en');

            if ($activeOnly) {
                $query->where('is_active', true);
            }

            return $query->get()->map(function (LocationCountry $country) {
                return [
                    'id' => (int) $country->id,
                    'iso2' => (string) $country->iso2,
                    'iso3' => $country->iso3,
                    'nameEn' => (string) $country->name_en,
                    'nameNative' => $country->name_native,
                    'currencyCode' => $country->currency_code,
                    'phoneCode' => $country->phone_code,
                    'isActive' => (bool) $country->is_active,
                ];
            })->values()->all();
        });

        return response()->json([
            'data' => $countries,
        ]);
    }

    public function provinces(Request $request)
    {
        $validated = $request->validate([
            'country_id' => ['nullable', 'integer', 'exists:location_countries,id'],
            'country_iso2' => ['nullable', 'string', 'size:2'],
        ]);

        $countryId = null;

        if (!empty($validated['country_id'])) {
            $countryId = (int) $validated['country_id'];
        } elseif (!empty($validated['country_iso2'])) {
            $countryId = (int) LocationCountry::query()
                ->where('iso2', strtoupper((string) $validated['country_iso2']))
                ->value('id');
        }

        if (!$countryId) {
            return response()->json([
                'data' => [],
            ]);
        }

        $cacheKey = 'location_lookup:provinces:country_' . $countryId;

        $provinces = Cache::remember($cacheKey, now()->addHours(24), function () use ($countryId) {
            return LocationProvince::query()
                ->select(['id', 'country_id', 'name_en', 'name_si', 'name_ta'])
                ->where('country_id', $countryId)
                ->orderBy('name_en')
                ->get()
                ->map(function (LocationProvince $province) {
                    return [
                        'id' => (int) $province->id,
                        'countryId' => (int) $province->country_id,
                        'nameEn' => (string) $province->name_en,
                        'nameSi' => $province->name_si,
                        'nameTa' => $province->name_ta,
                    ];
                })
                ->values()
                ->all();
        });

        return response()->json([
            'data' => $provinces,
        ]);
    }

    public function districts(Request $request)
    {
        $validated = $request->validate([
            'province_id' => ['required', 'integer', 'exists:location_provinces,id'],
        ]);

        $provinceId = (int) $validated['province_id'];
        $cacheKey = 'location_lookup:districts:province_' . $provinceId;

        $districts = Cache::remember($cacheKey, now()->addHours(24), function () use ($provinceId) {
            return LocationDistrict::query()
                ->select(['id', 'province_id', 'name_en', 'name_si', 'name_ta'])
                ->where('province_id', $provinceId)
                ->orderBy('name_en')
                ->get()
                ->map(function (LocationDistrict $district) {
                    return [
                        'id' => (int) $district->id,
                        'provinceId' => (int) $district->province_id,
                        'nameEn' => (string) $district->name_en,
                        'nameSi' => $district->name_si,
                        'nameTa' => $district->name_ta,
                    ];
                })
                ->values()
                ->all();
        });

        return response()->json([
            'data' => $districts,
        ]);
    }

    public function cities(Request $request)
    {
        $validated = $request->validate([
            'district_id' => ['required', 'integer', 'exists:location_districts,id'],
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 300);

        $districtId = (int) $validated['district_id'];
        $normalizedSearch = strtolower($search);
        $cacheKey = 'location_lookup:cities:district_' . $districtId
            . ':limit_' . $limit
            . ':q_' . md5($normalizedSearch);

        $cities = Cache::remember($cacheKey, now()->addHours(12), function () use ($districtId, $search, $limit) {
            $query = LocationCity::query()
                ->select([
                    'id',
                    'district_id',
                    'name_en',
                    'name_si',
                    'name_ta',
                    'sub_name_en',
                    'sub_name_si',
                    'sub_name_ta',
                    'postcode',
                    'latitude',
                    'longitude',
                ])
                ->where('district_id', $districtId);

            if ($search !== '') {
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('name_en', 'like', '%' . $search . '%')
                        ->orWhere('sub_name_en', 'like', '%' . $search . '%');
                });
            }

            return $query
                ->orderBy('name_en')
                ->limit($limit)
                ->get()
                ->map(function (LocationCity $city) {
                    $displayName = $city->sub_name_en
                        ? ((string) $city->name_en) . ' - ' . ((string) $city->sub_name_en)
                        : (string) $city->name_en;

                    return [
                        'id' => (int) $city->id,
                        'districtId' => (int) $city->district_id,
                        'nameEn' => (string) $city->name_en,
                        'nameSi' => $city->name_si,
                        'nameTa' => $city->name_ta,
                        'subNameEn' => $city->sub_name_en,
                        'subNameSi' => $city->sub_name_si,
                        'subNameTa' => $city->sub_name_ta,
                        'displayName' => $displayName,
                        'postcode' => $city->postcode,
                        'latitude' => $city->latitude !== null ? (float) $city->latitude : null,
                        'longitude' => $city->longitude !== null ? (float) $city->longitude : null,
                    ];
                })
                ->values()
                ->all();
        });

        return response()->json([
            'data' => $cities,
        ]);
    }

    /**
     * Type-ahead for checkout forms: matches a city (or sub-area) by name across
     * all districts and returns its postcode so the zip field can auto-fill.
     */
    public function citySearch(Request $request)
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:80'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:25'],
        ]);

        $q = trim($validated['q']);
        $limit = (int) ($validated['limit'] ?? 10);

        $rows = LocationCity::query()
            ->join('location_districts as d', 'd.id', '=', 'location_cities.district_id')
            ->whereNotNull('location_cities.postcode')
            ->where(function ($builder) use ($q) {
                $builder->where('location_cities.name_en', 'like', $q . '%')
                    ->orWhere('location_cities.sub_name_en', 'like', $q . '%');
            })
            ->orderBy('location_cities.name_en')
            ->limit($limit * 3)
            ->get(['location_cities.name_en', 'location_cities.sub_name_en', 'location_cities.postcode', 'd.name_en as district']);

        $data = $rows
            ->map(fn ($r) => [
                'name' => (string) $r->name_en,
                'subName' => $r->sub_name_en,
                'postcode' => (string) $r->postcode,
                'district' => (string) $r->district,
            ])
            ->unique(fn ($r) => strtolower($r['name']) . '|' . $r['postcode'])
            ->take($limit)
            ->values();

        return response()->json(['data' => $data]);
    }
}
