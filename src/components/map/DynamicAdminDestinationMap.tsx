'use client';

import dynamic from 'next/dynamic';
import React from 'react';
export type { TAMapItem } from './AdminDestinationMap';

const AdminDestinationMap = dynamic(() => import('./AdminDestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-100 animate-pulse border border-slate-200 flex flex-col items-center justify-center text-slate-500 gap-3">
      <div className="w-10 h-10 border-4 border-[#0F4C2E] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-600">Loading Interactive Regional TA Destination Map...</span>
    </div>
  ),
});

export default AdminDestinationMap;
