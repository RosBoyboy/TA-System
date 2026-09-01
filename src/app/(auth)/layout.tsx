import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen font-sans bg-[#F4F6F5]">
      {children}
    </div>
  );
}
