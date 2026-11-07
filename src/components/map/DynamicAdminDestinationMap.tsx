'use client';

import dynamic from 'next/dynamic';
import React from 'react';
export type { TAMapItem } from './AdminDestinationMap';

const AdminDestinationMap = dynamic(() => import('./AdminDestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-[8px] bg-[#F5F5F7] animate-pulse border border-[#E5E5E7] flex flex-col items-center justify-center text-[#86868B] gap-2.5">
      <div className="w-7 h-7 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      <span className="text-[12px] font-medium text-[#86868B]">Loading Interactive Regional TA Destination Map...</span>
    </div>
  ),
});

export default AdminDestinationMap;
