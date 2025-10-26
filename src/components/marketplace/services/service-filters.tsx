"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Tag, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface ServiceFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  sortBy: string;
  onlyFeatured: boolean;
}

export default function ServiceFilters({
  filters, onFiltersChange, categories, locations, priceRange, totalServices, isLoading = false,
}: {
  filters: ServiceFilters;
  onFiltersChange: (filters: ServiceFilters) => void;
  categories: string[];
  locations: string[];
  priceRange: { min: number; max: number };
  totalServices: number;
  isLoading?: boolean;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState([filters.minPrice, filters.maxPrice]);
  const [locationQuery, setLocationQuery] = useState(filters.location && filters.location !== "all" ? filters.location : "");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => { 
    setLocalPriceRange([filters.minPrice, filters.maxPrice]); 
  }, [filters.minPrice, filters.maxPrice]);
  
  useEffect(() => { 
    setLocationQuery(!filters.location || filters.location === "all" ? "" : filters.location); 
  }, [filters.location]);

  const updateFilter = (key: keyof ServiceFilters, value: any) => { 
    onFiltersChange({ ...filters, [key]: value }); 
  };

  // Step dinámico para el slider según el rango total
  const priceStep = useMemo(() => {
    const span = Math.max(0, (priceRange.max ?? 0) - (priceRange.min ?? 0));
    if (span <= 100) return 1;
    if (span <= 1000) return 10;
    if (span <= 10000) return 50;
    if (span <= 100000) return 500;
    if (span <= 1000000) return 1000;
    return Math.round(span / 100); // ~100 pasos
  }, [priceRange.min, priceRange.max]);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const sortTuple = (a: number, b: number) => (a <= b ? [a, b] : [b, a]);

  const handlePriceRangeChange = (v: number[]) => {
    const [mn, mx] = sortTuple(
      clamp(v[0], priceRange.min, priceRange.max),
      clamp(v[1], priceRange.min, priceRange.max)
    );
    setLocalPriceRange([mn, mx]);
  };
  const handlePriceRangeCommit = (v: number[]) => {
    const [mn, mx] = sortTuple(
      clamp(v[0], priceRange.min, priceRange.max),
      clamp(v[1], priceRange.min, priceRange.max)
    );
    onFiltersChange({ ...filters, minPrice: mn, maxPrice: mx });
  };

  // Sugerencias de ubicación desde services
  const [locationResults, setLocationResults] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      const q = locationQuery.trim();
      if (q.length < 1) { 
        if (active) setLocationResults([]); 
        return; 
      }
      await new Promise(r => setTimeout(r, 250));
      if (!active) return;
      const { data, error } = await supabase
        .from("services")
        .select("location")
        .eq("published", true)
        .not("location", "is", null)
        .neq("location", "")
        .ilike("location", `%${q}%`)
        .order("location", { ascending: true })
        .limit(50);
      if (!active) return;
      if (error) { 
        setLocationResults([]); 
        return; 
      }
      const list = Array.from(new Set((data || []).map((r: any) => r.location as string))).slice(0, 10);
      setLocationResults(list);
    };
    run();
    return () => { active = false; };
  }, [locationQuery, supabase]);

  const clearFilters = () => {
    onFiltersChange({
      search: "", category: "all",
      minPrice: priceRange.min, maxPrice: priceRange.max,
      location: "all", sortBy: "newest", onlyFeatured: false
    });
    setLocalPriceRange([priceRange.min, priceRange.max]);
  };

  const getActiveFiltersCount = () => {
    let c = 0;
    if (filters.search) c++;
    if (filters.category && filters.category !== "all") c++;
    if (filters.location && filters.location !== "all") c++;
    if (filters.onlyFeatured) c++;
    if (filters.minPrice > priceRange.min || filters.maxPrice < priceRange.max) c++;
    return c;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar servicios..." 
            value={filters.search} 
            onChange={(e) => updateFilter("search", e.target.value)} 
            className="pl-10 h-10" 
          />
        </div>
        
        <div className="sm:w-56">
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="featured">Destacados primero</SelectItem>
              <SelectItem value="alphabetical">Alfabético A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)} 
          className="h-10 px-3"
        >
          <Filter className="h-4 w-4 mr-2" /> Filtros
          {getActiveFiltersCount() > 0 && (
            <Badge className="ml-2 bg-orange-500">{getActiveFiltersCount()}</Badge>
          )}
        </Button>
      </div>

      <div className={cn("space-y-2", isFiltersOpen ? "block" : "hidden")}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <Filter className="h-4 w-4 mr-2" /> Filtros
                {getActiveFiltersCount() > 0 && (
                  <Badge className="ml-2 bg-orange-500">{getActiveFiltersCount()}</Badge>
                )}
              </CardTitle>
              {getActiveFiltersCount() > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center text-sm font-medium">
                  <Tag className="h-4 w-4 mr-2" /> Categoría
                </Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => updateFilter("category", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center text-sm font-medium">
                  <MapPin className="h-4 w-4 mr-2" /> Ubicación
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar ubicación..."
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setIsLocationDropdownOpen(true);
                    }}
                    onFocus={() => setIsLocationDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsLocationDropdownOpen(false), 200)}
                    className="pr-10 h-9"
                  />
                  {isLocationDropdownOpen && locationQuery.length >= 1 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow max-h-56 overflow-auto">
                      <button 
                        type="button" 
                        className="w-full text-left px-2 py-1.5 hover:bg-orange-50 text-sm"
                        onClick={() => { 
                          updateFilter("location", "all"); 
                          setLocationQuery("");
                          setIsLocationDropdownOpen(false);
                        }}
                      >
                        Todas las ubicaciones
                      </button>
                      {locationResults.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          No se encontraron ubicaciones
                        </div>
                      ) : (
                        locationResults.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            className="w-full text-left px-2 py-1.5 hover:bg-orange-50 text-sm"
                            onClick={() => { 
                              updateFilter("location", loc); 
                              setLocationQuery(loc);
                              setIsLocationDropdownOpen(false);
                            }}
                          >
                            {loc}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center text-sm font-medium">
                  <DollarSign className="h-4 w-4 mr-2" /> Rango de precios
                </Label>
                <div className="px-1">
                  <Slider
                    value={localPriceRange}
                    onValueChange={handlePriceRangeChange}
                    onValueCommit={handlePriceRangeCommit}
                    min={priceRange.min}
                    max={priceRange.max}
                    step={priceStep}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      {new Intl.NumberFormat("es-AR", { 
                        style: "currency", 
                        currency: "ARS", 
                        minimumFractionDigits: 0 
                      }).format(localPriceRange[0])}
                    </span>
                    <span>
                      {new Intl.NumberFormat("es-AR", { 
                        style: "currency", 
                        currency: "ARS", 
                        minimumFractionDigits: 0 
                      }).format(localPriceRange[1])}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="featured" 
                  checked={filters.onlyFeatured} 
                  onCheckedChange={(c) => updateFilter("onlyFeatured", Boolean(c))} 
                />
                <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
                  Solo servicios destacados
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {isLoading 
            ? "Cargando servicios..." 
            : `${totalServices} servicio${totalServices !== 1 ? 's' : ''} encontrado${totalServices !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
}
