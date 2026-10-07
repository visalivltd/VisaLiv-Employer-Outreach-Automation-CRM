import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function PublicLayout({ children }) {
  return (
    <div className="public-root">
      <PublicNavbar />
      <main className="public-main-content">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
