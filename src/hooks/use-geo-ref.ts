import { useState, useEffect } from "react";

export const AR_PROVINCES = [
    "Buenos Aires",
    "Ciudad Autónoma de Buenos Aires",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Córdoba",
    "Corrientes",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
    "Tucumán",
];

export function useGeoRef(selectedProvince?: string) {
    const [cities, setCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        async function loadCities(prov: string) {
            setLoadingCities(true);
            try {
                const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre&orden=nombre&max=5000`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("No se pudieron cargar localidades");
                const json = await res.json();
                const rawList = Array.isArray(json?.localidades)
                    ? json.localidades.map((l: any) => String(l.nombre))
                    : [];
                const list: string[] = Array.from(new Set(rawList as string[]));
                setCities(list);
            } catch (e) {
                console.error(e);
                setCities([]);
            } finally {
                setLoadingCities(false);
            }
        }

        if (selectedProvince && selectedProvince.length > 0) {
            setCities([]);
            loadCities(selectedProvince);
        } else {
            setCities([]);
        }
    }, [selectedProvince]);

    return {
        cities,
        loadingCities,
        provinces: AR_PROVINCES,
    };
}
