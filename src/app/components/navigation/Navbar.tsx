import React from 'react';
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <header>
      <nav className="w-full bg-surface/50 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between">
          <div className="w-24">
            <Link 
              href="/" 
              className="text-xl font-semibold text-primary"
            >
              TUDU
            </Link>
          </div>

          <div className="w-24 flex justify-end">
            <UserButton/>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
