import React from 'react';
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <header>
      <nav className="w-full bg-surface/50 backdrop-blur-lg border-b border-white/10">
        <div className="mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <div>
              <Link 
                href="/" 
                className="text-xl font-semibold text-primary"
              >
                TUDU
              </Link>
            </div>

            <div>
              <UserButton/>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
