import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select';

// PSGC API Base URL
const PSGC_API_BASE = 'https://psgc.gitlab.io/api';

export interface Region {
    code: string;
    name: string;
}

export interface Province {
    code: string;
    name: string;
    region_code?: string;
}

export interface CityMunicipality {
    code: string;
    name: string;
    province_code?: string;
}

export interface Barangay {
    code: string;
    name: string;
    city_code?: string;
    municipality_code?: string;
    zip_code?: string;
}

interface PhilippineAddressSelectorProps {
    region: string;
    province: string;
    municipality: string;
    barangay: string;
    postalCode: string;
    onRegionChange: (value: string, region: Region | null) => void;
    onProvinceChange: (value: string, province: Province | null) => void;
    onMunicipalityChange: (value: string, municipality: CityMunicipality | null) => void;
    onBarangayChange: (value: string, barangay: Barangay | null) => void;
    onPostalCodeChange: (value: string) => void;
    disabled?: boolean;
}

export function PhilippineAddressSelector({
    region,
    province,
    municipality,
    barangay,
    postalCode,
    onRegionChange,
    onProvinceChange,
    onMunicipalityChange,
    onBarangayChange,
    onPostalCodeChange,
    disabled = false,
}: PhilippineAddressSelectorProps) {
    const [regions, setRegions] = useState<Region[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [municipalities, setMunicipalities] = useState<CityMunicipality[]>([]);
    const [barangays, setBarangays] = useState<Barangay[]>([]);
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    // Fetch regions on mount
    useEffect(() => {
        const fetchRegions = async () => {
            setLoadingRegions(true);
            try {
                const response = await fetch(`${PSGC_API_BASE}/regions/`);
                if (!response.ok) throw new Error('Failed to fetch regions');
                const data = await response.json();
                setRegions(data.sort((a: Region, b: Region) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error('Error fetching regions:', error);
            } finally {
                setLoadingRegions(false);
            }
        };
        fetchRegions();
    }, []);

    // Memoize options for SearchableSelect components
    const regionOptions = useMemo(() => 
        regions.map(r => ({ value: r.code, label: r.name })), 
        [regions]
    );

    const provinceOptions = useMemo(() => 
        provinces.map(p => ({ value: p.code, label: p.name })), 
        [provinces]
    );

    const municipalityOptions = useMemo(() => 
        municipalities.map(m => ({ value: m.code, label: m.name })), 
        [municipalities]
    );

    const barangayOptions = useMemo(() => 
        barangays.map(b => ({ value: b.code, label: b.name })), 
        [barangays]
    );

    return (
        <div className="grid gap-4">
            {/* Region */}
            <div className="grid gap-2">
                <Label htmlFor="region-select">Region</Label>
                <SearchableSelect
                    options={regionOptions}
                    value={regions.find(r => r.name === region)?.code || ''}
                    onValueChange={(code) => {
                        const selectedRegion = regions.find(r => r.code === code);
                        onRegionChange(selectedRegion?.name || '', selectedRegion || null);
                        
                        // Reset dependent fields
                        onProvinceChange('', null);
                        onMunicipalityChange('', null);
                        onBarangayChange('', null);
                        onPostalCodeChange('');
                        setProvinces([]);
                        setMunicipalities([]);
                        setBarangays([]);

                        if (!code) return;

                        // Fetch provinces for the selected region
                        setLoadingProvinces(true);
                        fetch(`${PSGC_API_BASE}/regions/${code}/provinces/`)
                            .then(res => res.json())
                            .then(data => {
                                const sortedProvinces = data
                                    .sort((a: Province, b: Province) => a.name.localeCompare(b.name));
                                setProvinces(sortedProvinces);
                            })
                            .catch(err => console.error('Error fetching provinces:', err))
                            .finally(() => setLoadingProvinces(false));
                    }}
                    placeholder="Select region..."
                    searchPlaceholder="Search region..."
                    disabled={disabled}
                    loading={loadingRegions}
                    emptyMessage="No regions found."
                />
            </div>

            {/* Province */}
            <div className="grid gap-2">
                <Label htmlFor="province-select">Province</Label>
                <SearchableSelect
                    options={provinceOptions}
                    value={provinces.find(p => p.name === province)?.code || ''}
                    onValueChange={(code) => {
                        const selectedProvince = provinces.find(p => p.code === code);
                        onProvinceChange(selectedProvince?.name || '', selectedProvince || null);
                        
                        // Reset dependent fields
                        onMunicipalityChange('', null);
                        onBarangayChange('', null);
                        onPostalCodeChange('');
                        setMunicipalities([]);
                        setBarangays([]);

                        if (!code) return;

                        setLoadingMunicipalities(true);
                        fetch(`${PSGC_API_BASE}/provinces/${code}/cities-municipalities/`)
                            .then(res => res.json())
                            .then(data => {
                                setMunicipalities(data.sort((a: CityMunicipality, b: CityMunicipality) => 
                                    a.name.localeCompare(b.name)
                                ));
                            })
                            .catch(err => console.error('Error fetching municipalities:', err))
                            .finally(() => setLoadingMunicipalities(false));
                    }}
                    placeholder="Select a region first"
                    searchPlaceholder="Search province..."
                    disabled={disabled || !region}
                    loading={loadingProvinces}
                    emptyMessage="No provinces found."
                />
            </div>

            {/* Municipality/City */}
            <div className="grid gap-2">
                <Label htmlFor="municipality-select">Municipality / City</Label>
                <SearchableSelect
                    options={municipalityOptions}
                    value={municipalities.find(m => m.name === municipality)?.code || ''}
                    onValueChange={(code) => {
                        const selectedMunicipality = municipalities.find(m => m.code === code);
                        onMunicipalityChange(selectedMunicipality?.name || '', selectedMunicipality || null);
                        
                        // Reset dependent fields
                        onBarangayChange('', null);
                        onPostalCodeChange('');
                        setBarangays([]);

                        if (!code) return;

                        setLoadingBarangays(true);
                        fetch(`${PSGC_API_BASE}/cities-municipalities/${code}/barangays/`)
                            .then(res => res.json())
                            .then(data => {
                                setBarangays(data.sort((a: Barangay, b: Barangay) => 
                                    a.name.localeCompare(b.name)
                                ));
                            })
                            .catch(err => console.error('Error fetching barangays:', err))
                            .finally(() => setLoadingBarangays(false));
                    }}
                    placeholder="Select a province first"
                    searchPlaceholder="Search municipality/city..."
                    disabled={disabled || !province}
                    loading={loadingMunicipalities}
                    emptyMessage="No municipalities found."
                />
            </div>

            {/* Barangay */}
            <div className="grid gap-2">
                <Label htmlFor="barangay-select">Barangay</Label>
                <SearchableSelect
                    options={barangayOptions}
                    value={barangays.find(b => b.name === barangay)?.code || ''}
                    onValueChange={(code) => {
                        const selectedBarangay = barangays.find(b => b.code === code);
                        onBarangayChange(selectedBarangay?.name || '', selectedBarangay || null);
                        
                        // Auto-fill postal code if available
                        if (selectedBarangay?.zip_code) {
                            onPostalCodeChange(selectedBarangay.zip_code);
                        }
                    }}
                    placeholder="Select a municipality/city first"
                    searchPlaceholder="Search barangay..."
                    disabled={disabled || !municipality}
                    loading={loadingBarangays}
                    emptyMessage="No barangays found."
                />
            </div>

            {/* Postal Code */}
            <div className="grid gap-2">
                <Label htmlFor="postal-code">Postal Code</Label>
                <Input
                    id="postal-code"
                    type="text"
                    value={postalCode}
                    onChange={(e) => onPostalCodeChange(e.target.value)}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
