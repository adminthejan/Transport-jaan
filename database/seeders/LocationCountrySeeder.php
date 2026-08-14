<?php

namespace Database\Seeders;

use App\Models\Location\LocationCountry;
use Illuminate\Database\Seeder;

/**
 * Full ISO-3166 country list for the courier module's country pickers
 * (sender/recipient country on international shipments). Before this, the
 * table only had Sri Lanka in it, so the destination country field on the
 * international flow had nothing to suggest — it looked broken, but it was
 * a missing-data problem, not a UI bug. The controller still has a
 * restcountries.com fallback for enrichment, but core functionality no
 * longer depends on that external call succeeding.
 */
class LocationCountrySeeder extends Seeder
{
    public function run(): void
    {
        // [iso2, iso3, name, phone_code]
        $countries = [
            ['AF','AFG','Afghanistan','+93'], ['AL','ALB','Albania','+355'], ['DZ','DZA','Algeria','+213'],
            ['AD','AND','Andorra','+376'], ['AO','AGO','Angola','+244'], ['AG','ATG','Antigua and Barbuda','+1268'],
            ['AR','ARG','Argentina','+54'], ['AM','ARM','Armenia','+374'], ['AU','AUS','Australia','+61'],
            ['AT','AUT','Austria','+43'], ['AZ','AZE','Azerbaijan','+994'], ['BS','BHS','Bahamas','+1242'],
            ['BH','BHR','Bahrain','+973'], ['BD','BGD','Bangladesh','+880'], ['BB','BRB','Barbados','+1246'],
            ['BY','BLR','Belarus','+375'], ['BE','BEL','Belgium','+32'], ['BZ','BLZ','Belize','+501'],
            ['BJ','BEN','Benin','+229'], ['BT','BTN','Bhutan','+975'], ['BO','BOL','Bolivia','+591'],
            ['BA','BIH','Bosnia and Herzegovina','+387'], ['BW','BWA','Botswana','+267'], ['BR','BRA','Brazil','+55'],
            ['BN','BRN','Brunei','+673'], ['BG','BGR','Bulgaria','+359'], ['BF','BFA','Burkina Faso','+226'],
            ['BI','BDI','Burundi','+257'], ['KH','KHM','Cambodia','+855'], ['CM','CMR','Cameroon','+237'],
            ['CA','CAN','Canada','+1'], ['CV','CPV','Cape Verde','+238'], ['CF','CAF','Central African Republic','+236'],
            ['TD','TCD','Chad','+235'], ['CL','CHL','Chile','+56'], ['CN','CHN','China','+86'],
            ['CO','COL','Colombia','+57'], ['KM','COM','Comoros','+269'], ['CG','COG','Congo','+242'],
            ['CD','COD','Congo (DRC)','+243'], ['CR','CRI','Costa Rica','+506'], ['HR','HRV','Croatia','+385'],
            ['CU','CUB','Cuba','+53'], ['CY','CYP','Cyprus','+357'], ['CZ','CZE','Czech Republic','+420'],
            ['DK','DNK','Denmark','+45'], ['DJ','DJI','Djibouti','+253'], ['DM','DMA','Dominica','+1767'],
            ['DO','DOM','Dominican Republic','+1809'], ['EC','ECU','Ecuador','+593'], ['EG','EGY','Egypt','+20'],
            ['SV','SLV','El Salvador','+503'], ['GQ','GNQ','Equatorial Guinea','+240'], ['ER','ERI','Eritrea','+291'],
            ['EE','EST','Estonia','+372'], ['SZ','SWZ','Eswatini','+268'], ['ET','ETH','Ethiopia','+251'],
            ['FJ','FJI','Fiji','+679'], ['FI','FIN','Finland','+358'], ['FR','FRA','France','+33'],
            ['GA','GAB','Gabon','+241'], ['GM','GMB','Gambia','+220'], ['GE','GEO','Georgia','+995'],
            ['DE','DEU','Germany','+49'], ['GH','GHA','Ghana','+233'], ['GR','GRC','Greece','+30'],
            ['GD','GRD','Grenada','+1473'], ['GT','GTM','Guatemala','+502'], ['GN','GIN','Guinea','+224'],
            ['GW','GNB','Guinea-Bissau','+245'], ['GY','GUY','Guyana','+592'], ['HT','HTI','Haiti','+509'],
            ['HN','HND','Honduras','+504'], ['HK','HKG','Hong Kong','+852'], ['HU','HUN','Hungary','+36'],
            ['IS','ISL','Iceland','+354'], ['IN','IND','India','+91'], ['ID','IDN','Indonesia','+62'],
            ['IR','IRN','Iran','+98'], ['IQ','IRQ','Iraq','+964'], ['IE','IRL','Ireland','+353'],
            ['IL','ISR','Israel','+972'], ['IT','ITA','Italy','+39'], ['CI','CIV',"Ivory Coast",'+225'],
            ['JM','JAM','Jamaica','+1876'], ['JP','JPN','Japan','+81'], ['JO','JOR','Jordan','+962'],
            ['KZ','KAZ','Kazakhstan','+7'], ['KE','KEN','Kenya','+254'], ['KI','KIR','Kiribati','+686'],
            ['KP','PRK','North Korea','+850'], ['KR','KOR','South Korea','+82'], ['KW','KWT','Kuwait','+965'],
            ['KG','KGZ','Kyrgyzstan','+996'], ['LA','LAO','Laos','+856'], ['LV','LVA','Latvia','+371'],
            ['LB','LBN','Lebanon','+961'], ['LS','LSO','Lesotho','+266'], ['LR','LBR','Liberia','+231'],
            ['LY','LBY','Libya','+218'], ['LI','LIE','Liechtenstein','+423'], ['LT','LTU','Lithuania','+370'],
            ['LU','LUX','Luxembourg','+352'], ['MO','MAC','Macau','+853'], ['MG','MDG','Madagascar','+261'],
            ['MW','MWI','Malawi','+265'], ['MY','MYS','Malaysia','+60'], ['MV','MDV','Maldives','+960'],
            ['ML','MLI','Mali','+223'], ['MT','MLT','Malta','+356'], ['MH','MHL','Marshall Islands','+692'],
            ['MR','MRT','Mauritania','+222'], ['MU','MUS','Mauritius','+230'], ['MX','MEX','Mexico','+52'],
            ['FM','FSM','Micronesia','+691'], ['MD','MDA','Moldova','+373'], ['MC','MCO','Monaco','+377'],
            ['MN','MNG','Mongolia','+976'], ['ME','MNE','Montenegro','+382'], ['MA','MAR','Morocco','+212'],
            ['MZ','MOZ','Mozambique','+258'], ['MM','MMR','Myanmar','+95'], ['NA','NAM','Namibia','+264'],
            ['NR','NRU','Nauru','+674'], ['NP','NPL','Nepal','+977'], ['NL','NLD','Netherlands','+31'],
            ['NZ','NZL','New Zealand','+64'], ['NI','NIC','Nicaragua','+505'], ['NE','NER','Niger','+227'],
            ['NG','NGA','Nigeria','+234'], ['MK','MKD','North Macedonia','+389'], ['NO','NOR','Norway','+47'],
            ['OM','OMN','Oman','+968'], ['PK','PAK','Pakistan','+92'], ['PW','PLW','Palau','+680'],
            ['PS','PSE','Palestine','+970'], ['PA','PAN','Panama','+507'], ['PG','PNG','Papua New Guinea','+675'],
            ['PY','PRY','Paraguay','+595'], ['PE','PER','Peru','+51'], ['PH','PHL','Philippines','+63'],
            ['PL','POL','Poland','+48'], ['PT','PRT','Portugal','+351'], ['QA','QAT','Qatar','+974'],
            ['RO','ROU','Romania','+40'], ['RU','RUS','Russia','+7'], ['RW','RWA','Rwanda','+250'],
            ['KN','KNA','Saint Kitts and Nevis','+1869'], ['LC','LCA','Saint Lucia','+1758'],
            ['VC','VCT','Saint Vincent and the Grenadines','+1784'], ['WS','WSM','Samoa','+685'],
            ['SM','SMR','San Marino','+378'], ['ST','STP','Sao Tome and Principe','+239'], ['SA','SAU','Saudi Arabia','+966'],
            ['SN','SEN','Senegal','+221'], ['RS','SRB','Serbia','+381'], ['SC','SYC','Seychelles','+248'],
            ['SL','SLE','Sierra Leone','+232'], ['SG','SGP','Singapore','+65'], ['SK','SVK','Slovakia','+421'],
            ['SI','SVN','Slovenia','+386'], ['SB','SLB','Solomon Islands','+677'], ['SO','SOM','Somalia','+252'],
            ['ZA','ZAF','South Africa','+27'], ['SS','SSD','South Sudan','+211'], ['ES','ESP','Spain','+34'],
            ['LK','LKA','Sri Lanka','+94'], ['SD','SDN','Sudan','+249'], ['SR','SUR','Suriname','+597'],
            ['SE','SWE','Sweden','+46'], ['CH','CHE','Switzerland','+41'], ['SY','SYR','Syria','+963'],
            ['TW','TWN','Taiwan','+886'], ['TJ','TJK','Tajikistan','+992'], ['TZ','TZA','Tanzania','+255'],
            ['TH','THA','Thailand','+66'], ['TL','TLS','Timor-Leste','+670'], ['TG','TGO','Togo','+228'],
            ['TO','TON','Tonga','+676'], ['TT','TTO','Trinidad and Tobago','+1868'], ['TN','TUN','Tunisia','+216'],
            ['TR','TUR','Turkey','+90'], ['TM','TKM','Turkmenistan','+993'], ['TV','TUV','Tuvalu','+688'],
            ['UG','UGA','Uganda','+256'], ['UA','UKR','Ukraine','+380'], ['AE','ARE','United Arab Emirates','+971'],
            ['GB','GBR','United Kingdom','+44'], ['US','USA','United States','+1'], ['UY','URY','Uruguay','+598'],
            ['UZ','UZB','Uzbekistan','+998'], ['VU','VUT','Vanuatu','+678'], ['VA','VAT','Vatican City','+379'],
            ['VE','VEN','Venezuela','+58'], ['VN','VNM','Vietnam','+84'], ['YE','YEM','Yemen','+967'],
            ['ZM','ZMB','Zambia','+260'], ['ZW','ZWE','Zimbabwe','+263'],
        ];

        foreach ($countries as [$iso2, $iso3, $name, $phoneCode]) {
            LocationCountry::updateOrCreate(
                ['iso2' => $iso2],
                [
                    'iso3' => $iso3,
                    'name_en' => $name,
                    'phone_code' => $phoneCode,
                    'is_active' => true,
                ]
            );
        }
    }
}
