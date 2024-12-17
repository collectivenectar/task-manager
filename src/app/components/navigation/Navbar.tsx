import React from 'react';
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <header>
      <nav className="w-full bg-black shadow-md px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Brand/Logo */}
          <Link 
            href="/" 
            className="text-xl font-semibold"
          >
            Stacker
          </Link>

          {/* Center: Main Navigation */}
          <div className="flex gap-6">
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/tasks" className="hover:text-blue-600">
              Tasks
            </Link>
            <Link href="/lists" className="hover:text-blue-600">
              Lists
            </Link>
            <Link href="/calendar" className="hover:text-blue-600">
              Calendar
            </Link>
          </div>

          {/* Right: Actions & User */}
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              + New Task
            </button>
            <UserButton/>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
