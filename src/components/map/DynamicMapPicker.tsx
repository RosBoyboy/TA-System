'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 sm:h-96 lg:h-[420px] rounded-[8px] bg-[#F5F5F7] animate-pulse border border-[#E5E5E7] flex flex-col items-center justify-center text-[#86868B] gap-2">
      <div className="w-7 h-7 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      <span className="text-[12px] font-medium text-[#86868B]">Loading Interactive Leaflet Map...</span>
    </div>
  ),
});

export default MapPicker;
