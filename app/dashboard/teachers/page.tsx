'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/useAuth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Users, UserPlus, Lock, UserMinus, ShieldAlert, Loader2 } from 'lucide-react';

export default function TeachersPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'teacher' | 'admin'>('teacher');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // States for Reset Password Dialog
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUid, setResetTargetUid] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States for Remove User Dialog
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeTargetUser, setRemoveTargetUser] = useState<any>(null);

  useEffect(() => {
    if (!loading) {
        if (!user || role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchUsers();
    }
  }, [user, role, loading, activeTab]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', activeTab));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ uid: doc.id, ...doc.data() });
      });
      // Sort by status inside map if needed, for now just set
      setUsersList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTargetUser) return;
    setActionLoading('remove');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          targetUid: removeTargetUser.uid,
          adminUid: user?.uid
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('User removed successfully.');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setActionLoading(null);
      setRemoveModalOpen(false);
      setRemoveTargetUser(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setActionLoading('reset');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          targetUid: resetTargetUid,
          password: newPassword,
          adminUid: user?.uid
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('Password reset successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setActionLoading(null);
      setResetModalOpen(false);
      setResetTargetUid(null);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (loading || (role !== 'admin' && !fetching)) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
              <h1 className="text-2xl font-bold text-slate-800">Teachers & Admins</h1>
              <p className="text-slate-500 mt-1">Manage platform access and roles.</p>
          </div>
          <Link href="/dashboard/teachers/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" /> Add {activeTab === 'teacher' ? 'Teacher' : 'Admin'}
          </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100 rounded-lg w-max mb-6">
        <button
          className={`flex items-center px-6 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'teacher' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('teacher')}
        >
          <Users className="w-4 h-4 mr-2" /> Teachers
        </button>
        <button
          className={`flex items-center px-6 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('admin')}
        >
          <ShieldAlert className="w-4 h-4 mr-2" /> Admins
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
                {fetching ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                ) : usersList.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No {activeTab}s found.</td></tr>
                ) : (
                    usersList.map(u => (
                        <tr key={u.uid} className={u.isActive === false ? 'bg-slate-50 opacity-70' : ''}>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{u.name}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{u.email}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                           <td className="px-6 py-4 whitespace-nowrap">
                                {u.isActive === false 
                                  ? <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-medium">Disabled</span>
                                  : <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">Active</span>}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                               {u.isActive !== false && (
                                 <>
                                   <button 
                                      onClick={() => { setResetTargetUid(u.uid); setResetModalOpen(true); }}
                                      className="text-blue-600 hover:text-blue-900 p-1 bg-blue-50 hover:bg-blue-100 rounded" title="Reset Password"
                                   >
                                       <Lock className="w-4 h-4" />
                                   </button>
                                   <button 
                                      onClick={() => { setRemoveTargetUser(u); setRemoveModalOpen(true); }}
                                      className="text-red-600 hover:text-red-900 p-1 bg-red-50 hover:bg-red-100 rounded" title="Remove User"
                                   >
                                       <UserMinus className="w-4 h-4" />
                                   </button>
                                 </>
                               )}
                           </td>
                        </tr>
                    ))
                )}
            </tbody>
          </table>
      </div>

      {/* Remove Modal */}
      {removeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Remove User</h3>
                  <p className="text-slate-600 text-sm mb-6">Are you sure you want to remove <strong className="text-slate-900">{removeTargetUser?.name}</strong> as an {activeTab}? This action disables their account permanently.</p>
                  <div className="flex justify-end space-x-3">
                      <button onClick={() => setRemoveModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                      <button onClick={handleRemove} disabled={actionLoading === 'remove'} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center">
                          {actionLoading === 'remove' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Yes, Remove'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Reset Modal */}
      {resetModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Reset Password</h3>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                          <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                          <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                          <input type="checkbox" id="show" className="mr-2" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                          <label htmlFor="show">Show passwords</label>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                          <button type="button" onClick={() => setResetModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                          <button type="submit" disabled={actionLoading === 'reset'} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center">
                              {actionLoading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Reset Password'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
