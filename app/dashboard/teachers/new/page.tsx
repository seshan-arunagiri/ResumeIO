'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy, CheckCircle } from 'lucide-react';

export default function AddUserPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'teacher' | 'admin'>('teacher');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Credentials Card State
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, role, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          email,
          password,
          role: activeTab,
          adminUid: user?.uid
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        // Show success card
        setSuccessData({
            name,
            email,
            password,
            role: activeTab
        });
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setSuccessData(null);
  };

  const copyCredentials = () => {
      const text = `ResumeIQ Account Credentials\nRole: ${successData.role === 'admin' ? 'Admin' : 'Teacher'}\nName: ${successData.name}\nEmail: ${successData.email}\nPassword: ${successData.password}`;
      navigator.clipboard.writeText(text);
      alert('Credentials copied to clipboard!');
  };

  if (loading || role !== 'admin') {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (successData) {
      return (
          <div className="max-w-2xl mx-auto space-y-6 pt-10">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Account Created Successfully</h2>
                  <p className="text-slate-600 mb-8">The new {successData.role} account is now active and ready to use.</p>
                  
                  <div className="bg-white rounded-lg border border-slate-200 p-6 text-left max-w-sm mx-auto shadow-sm space-y-4 relative">
                      <div className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 cursor-pointer" onClick={copyCredentials} title="Copy Credentials">
                          <Copy className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-xs uppercase font-semibold text-slate-400">Name</p>
                          <p className="font-medium text-slate-900">{successData.name}</p>
                      </div>
                      <div>
                          <p className="text-xs uppercase font-semibold text-slate-400">Email</p>
                          <p className="font-medium text-slate-900">{successData.email}</p>
                      </div>
                      <div>
                          <p className="text-xs uppercase font-semibold text-slate-400">Temporary Password</p>
                          <p className="font-medium text-slate-900">{successData.password}</p>
                      </div>
                      <div>
                          <p className="text-xs uppercase font-semibold text-slate-400">Role</p>
                          <p className="font-medium text-slate-900 capitalize">{successData.role}</p>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-center space-x-4">
                      <button onClick={resetForm} className="px-6 py-2.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50">Create Another</button>
                      <Link href="/dashboard/teachers" className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Return to Directory</Link>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <Link href="/dashboard/teachers" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
              <h1 className="text-2xl font-bold text-slate-800">Add New User</h1>
              <p className="text-slate-500 mt-1">Create a new Teacher or Admin account.</p>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Role Toggle Selector */}
          <div className="flex border-b border-slate-200">
              <button
                  type="button"
                  onClick={() => setActiveTab('teacher')}
                  className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teacher' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                  Add Teacher
              </button>
              <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admin' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                  Add Admin
              </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                     <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
                 </div>
                 <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                     <input type="email" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                 <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Password</label>
                     <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" minLength={6} />
                 </div>
                 <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                     <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" minLength={6} />
                 </div>
              </div>

              <div className="flex items-center text-sm text-slate-600 pb-4">
                  <input type="checkbox" id="showpw" className="mr-2" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                  <label htmlFor="showpw" className="cursor-pointer select-none">Show passwords</label>
              </div>

              <div className="flex justify-end pt-4">
                  <button type="submit" disabled={actionLoading} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center shadow-sm">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : `Create ${activeTab === 'admin' ? 'Admin' : 'Teacher'}`}
                  </button>
              </div>
          </form>
      </div>
    </div>
  );
}
