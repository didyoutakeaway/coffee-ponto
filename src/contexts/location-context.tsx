
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationContextProps {
  currentLocation: Location | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<Location | null>;
}

const LocationContext = createContext<LocationContextProps | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = async (): Promise<Location | null> => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada por este navegador.');
      toast({
        variant: "destructive",
        title: "Localização indisponível",
        description: "Seu navegador não suporta geolocalização.",
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationData: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      setCurrentLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      let errorMessage = 'Erro desconhecido ao obter localização.';
      
      if (geoError.code === 1) {
        errorMessage = 'Permissão de localização negada.';
      } else if (geoError.code === 2) {
        errorMessage = 'Posição indisponível.';
      } else if (geoError.code === 3) {
        errorMessage = 'Tempo esgotado ao obter localização.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Erro de localização",
        description: errorMessage,
      });
      return null;
    }
  };

  useEffect(() => {
    // Buscar localização inicial
    getLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        isLoading,
        error,
        refreshLocation: getLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation deve ser usado dentro de um LocationProvider');
  }
  return context;
};
