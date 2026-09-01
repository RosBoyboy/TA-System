'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  locationName?: string;
}

export default function MapPicker({
  initialLat = 14.5547,
  initialLng = 121.0244,
  onLocationSelect,
  readOnly = false,
  locationName,
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix missing Leaflet default icon markers in bundler
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    // Initialize Leaflet Map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: !readOnly }).addTo(map);

      if (locationName) {
        marker.bindPopup(
          `<div style="font-size: 11px; font-weight: 700; max-width: 240px; line-height: 1.35; color: #0f172a;">${locationName}</div>`
        );
      }

      if (!readOnly && onLocationSelect) {
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view and marker when initialLat & initialLng change dynamically (e.g. via search recommendation click)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && initialLat && initialLng) {
      mapInstanceRef.current.setView([initialLat, initialLng], 13, { animate: true });
      markerRef.current.setLatLng([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  // Update popup content when locationName changes
  useEffect(() => {
    if (markerRef.current && locationName) {
      markerRef.current.bindPopup(
        `<div style="font-size: 11px; font-weight: 700; max-width: 240px; line-height: 1.35; color: #0f172a;">${locationName}</div>`
      );
    }
  }, [locationName]);

  return (
    <div className="w-full h-80 sm:h-96 lg:h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
