/**
 * ============================================
 *  useGeocoding Hook
 *  Map geolocator hook
 * ============================================
 * 
 * PURPOSE:
 * - Fetches coordinates for provided address
 * - Returns map initial position and popup text
 * 
 * ============================================
 */
import { useState, useEffect } from 'react';
import { fetchCoordinatesByAddress } from '../services/geocoding.service';

export function useGeocoding(address, safeLat, safeLng, popupText, notFoundText, searchErrorText) {
  const [position, setPosition] = useState([safeLat, safeLng]);
  const [currentPopup, setCurrentPopup] = useState(popupText);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAddress = async () => {
      if (!address) {
        if (isMounted) {
          setPosition([safeLat, safeLng]);
          setCurrentPopup(popupText || notFoundText);
        }
        return;
      }

      setIsLoading(true);
      try {
        const coords = await fetchCoordinatesByAddress(address);

        if (isMounted) {
          setPosition([coords.lat, coords.lon]);
          setCurrentPopup(address);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        if (isMounted) {
          setPosition([safeLat, safeLng]);
          setCurrentPopup(searchErrorText || notFoundText);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [address, safeLat, safeLng, popupText, notFoundText, searchErrorText]);

  return { position, currentPopup, isLoading };
}
