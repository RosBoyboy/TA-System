'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TAMapItem {
  id: string;
  trackingNumber: string;
  destination: string;
  purpose: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  status: string;
  lat: number;
  lng: number;
}

interface AdminDestinationMapProps {
  items: TAMapItem[];
  selectedId?: string | null;
  onSelectItem?: (item: TAMapItem) => void;
}

export default function AdminDestinationMap({
  items,
  selectedId,
  onSelectItem,
}: AdminDestinationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix leaflet default marker asset path issues in Next.js
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    if (!mapInstanceRef.current) {
      // Default view over Region I / North Luzon / Philippines (matching DENR-PENRO La Union focus)
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([16.6159, 120.3209], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers whenever items change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const isApproved = item.status === 'APPROVED';
      const isOverdue = item.status === 'REJECTED_OVERDUE' || item.status.includes('OVERDUE');
      const isCancelled = item.status.includes('REJECTED');

      // Custom colored SVG pin
      const pinColor = isApproved ? '#10B981' : isOverdue || isCancelled ? '#EF4444' : '#0F4C2E';

      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div style="
            background-color: ${pinColor};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: Inter, sans-serif; padding: 2px; min-width: 190px;">
          <div style="font-weight: 600; font-size: 11px; color: #1B4332; font-family: monospace;">${item.trackingNumber}</div>
          <div style="font-weight: 600; font-size: 13px; color: #0f172a; margin-top: 2px;">${item.destination}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">${item.employeeName}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${new Date(item.startDate).toLocaleDateString()} – ${new Date(item.endDate).toLocaleDateString()}</div>
          <div style="margin-top: 5px; display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background-color: ${isApproved ? '#d1fae5' : '#fef3c7'}; color: ${isApproved ? '#065f46' : '#92400e'}; border: 1px solid ${isApproved ? '#a7f3d0' : '#fde68a'};">
            ${item.status.replace(/_/g, ' ')}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectItem) onSelectItem(item);
      });

      markersLayerRef.current?.addLayer(marker);
      bounds.extend([item.lat, item.lng]);
    });

    if (items.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [items, onSelectItem]);

  return (
    <div className="relative w-full h-[540px] rounded-lg overflow-hidden border border-slate-200 z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
