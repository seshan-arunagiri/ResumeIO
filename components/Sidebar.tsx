'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UploadCloud, Building2, FileBarChart, LogOut, BrainCircuit } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Resumes', href: '/upload', icon: UploadCloud },
    { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
    { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
  ];

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-full text-slate-300">
      <div className="flex items-center justify-center h-16 border-b border-slate-800">
        <BrainCircuit className="w-6 h-6 text-blue-500 mr-2" />
        <span className="text-xl font-bold text-white tracking-tight">ResumeIQ</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${
                    isActive ? 'text-blue-200' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="flex-shrink-0 -ml-1 mr-3 h-5 w-5" />
          <span className="truncate">Sign out</span>
        </button>
      </div>
    </div>
  );
}
