'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCompanies() {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const removeCompany = async (companyId: string) => {
    if (!confirm(
      "Are you sure you want to delete this company? " +
      "All shortlists for this company will also be deleted."
    )) return;
    
    setLoading(true);
    try {
      // Delete company
      await deleteDoc(doc(db, 'companies', companyId));
      
      // Delete all related shortlists
      const shortlistSnap = await getDocs(
        query(
          collection(db, 'shortlists'),
          where('companyId', '==', companyId)
        )
      );
      for (const d of shortlistSnap.docs) {
        await deleteDoc(doc(db, 'shortlists', d.id));
      }
      
      // Refresh company list
      await loadCompanies();
    } catch (err) {
      console.error("Failed to remove company", err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center sm:px-0 px-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Companies & Roles</h1>
          <p className="text-slate-500 mt-1">Manage recruiting criteria and scoring configurations.</p>
        </div>
        <Link
          href="/dashboard/companies/new"
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Company Target
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No companies target created</h3>
          <p className="mt-2 text-sm text-slate-500 mb-6">Create a default scoring profile to begin parsing resumes.</p>
          <Link
            href="/dashboard/companies/new"
            className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
          >
            Create Company Profile
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Min CGPA</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Req. Skills</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Min LC Solved</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Weights (R/L/G/C)</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                    {company.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {company.minCgpa?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-500">
                    <div className="flex flex-wrap gap-1">
                      {company.requiredSkills?.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                      {company.requiredSkills?.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          +{company.requiredSkills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {company.minLeetcodeSolved || 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {company.weights?.resume || 0}% / {company.weights?.leetcode || 0}% / {company.weights?.github || 0}% / {company.weights?.cgpa || 0}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                    <button
                      onClick={() => removeCompany(company.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
