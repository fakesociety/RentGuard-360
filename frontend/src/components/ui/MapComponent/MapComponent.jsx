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
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PropTypes from 'prop-types';
import { setupLeafletIcons } from './utils/leaflet-fix';
import { useGeocoding } from './hooks/useGeocoding';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

/** Fix Leaflet's default icon paths for Vite bundling issues. */
setupLeafletIcons();
/**
 *  Component to update the map view based on the provided position
 */
const MapUpdater = ({ position }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);
  return null;
};

/** 
 * MapComponent
 * Leaflet map wrapper
 */
const MapComponent = ({
  address = '',
  latitude = 32.0853,
  longitude = 34.7818,
  popupText,
  notFoundText,
  height
}) => {
  const { t, isRTL } = useLanguage();
  const markerRef = useRef(null);

  const safeLat = (typeof latitude === 'number' && !isNaN(latitude)) ? latitude : 32.0853;
  const safeLng = (typeof longitude === 'number' && !isNaN(longitude)) ? longitude : 34.7818;

  const actualPopupText = popupText || t?.('map.defaultLocation');
  const actualNotFoundText = notFoundText || t?.('map.addressNotFound');
  const searchErrorText = t?.('map.searchError');
  const loadingText = t?.('map.loading');

  const { position, currentPopup, isLoading } = useGeocoding(
    address, 
    safeLat, 
    safeLng, 
    actualPopupText, 
    actualNotFoundText,
    searchErrorText
  );

  // Auto-open popups if it's an error scenario (like address not found)
  useEffect(() => {
    if (!isLoading && markerRef.current && (currentPopup === actualNotFoundText || currentPopup === searchErrorText)) {
      markerRef.current.openPopup();
    }
  }, [isLoading, currentPopup, actualNotFoundText, searchErrorText]);

  return (
    <div style={{ height: height || '300px', flex: height === '100%' ? 1 : 'none', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0, position: 'relative' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {isLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span>{loadingText}</span>
        </div>
      )}
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <MapUpdater position={position} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} ref={markerRef}>
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

export default MapComponent;