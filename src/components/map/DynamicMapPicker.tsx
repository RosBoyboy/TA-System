'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 sm:h-96 lg:h-[420px] rounded-2xl bg-slate-100 animate-pulse border border-slate-200 flex flex-col items-center justify-center text-slate-500 gap-2">
      <div className="w-8 h-8 border-3 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold">Loading Interactive Leaflet Map...</span>
    </div>
  ),
});

export default MapPicker;
