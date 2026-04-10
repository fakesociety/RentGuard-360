/**
 * ============================================
 *  MapComponent
 *  Leaflet map wrapper
 * ============================================
 * 
 * STRUCTURE:
 * - Renders a map centered on RentGuard HQ
 * - Fixes default leaflet icon issues
 * 
 * DEPENDENCIES:
 * - react-leaflet, leaflet
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PropTypes from 'prop-types';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);
  return null;
};

const MapComponent = ({ 
  address = '', 
  latitude = 32.0853, 
  longitude = 34.7818, 
  popupText = 'RentGuard-360 HQ', 
  notFoundText = 'הכתובת לא נמצאה', 
  height 
}) => {
  // Ensure valid numbers for position to prevent Leaflet errors
  const safeLat = (typeof latitude === 'number' && !isNaN(latitude)) ? latitude : 32.0853;
  const safeLng = (typeof longitude === 'number' && !isNaN(longitude)) ? longitude : 34.7818;
  
  const [position, setPosition] = useState([safeLat, safeLng]);
  const [currentPopup, setCurrentPopup] = useState(popupText);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAddress = async () => {
      if (!address) {
        if (isMounted) {
          setPosition([safeLat, safeLng]);
          setCurrentPopup(popupText || 'הכתובת לא נמצאה');
        }
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=il&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (isMounted) {
          if (data && data.length > 0) {
            setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            setCurrentPopup(address);
          } else {
            setPosition([safeLat, safeLng]); 
            setCurrentPopup(notFoundText || 'הכתובת לא נמצאה / Address not found');
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        if (isMounted) {
          setPosition([safeLat, safeLng]);
          setCurrentPopup(notFoundText || 'שגיאה בחיפוש הכתובת / Error finding address');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [address, safeLat, safeLng, popupText, notFoundText]);

  return (
    <div style={{ height: height || '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0, position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span>טוען מפה...</span>
        </div>
      )}
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <MapUpdater position={position} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{currentPopup}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

MapComponent.propTypes = {
  address: PropTypes.string,
  latitude: PropTypes.number,
  longitude: PropTypes.number,
  popupText: PropTypes.string,
  notFoundText: PropTypes.string
};

MapComponent.defaultProps = {
  address: '',
  latitude: 32.0853,
  longitude: 34.7818,
  popupText: 'RentGuard-360 HQ',
  notFoundText: 'הכתובת לא נמצאה'
};

export default MapComponent;
