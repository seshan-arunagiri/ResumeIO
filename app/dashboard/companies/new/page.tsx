'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [minCgpa, setMinCgpa] = useState('6.0');
  const [minLeetcodeSolved, setMinLeetcodeSolved] = useState('50');
  
  // Tag input
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(['TypeScript', 'React']);
  
  // Weights (must sum to 100)
  const [weights, setWeights] = useState({
    resume: 35,
    leetcode: 30,
    github: 20,
    cgpa: 15
  });

  const remainingWeight = 100 - (weights.resume + weights.leetcode + weights.github + weights.cgpa);

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleWeightChange = (key: keyof typeof weights, value: string) => {
    const num = parseInt(value) || 0;
    setWeights(prev => ({ ...prev, [key]: num }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (remainingWeight !== 0) {
      setError("Score weights must exactly sum to 100%");
      return;
    }
    
    if (!name.trim()) {
      setError("Company/Role name is required");
      return;
    }
    
    if (skills.length === 0) {
      setError("Add at least one skill");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      console.log("Current user:", user?.email);
      console.log("User UID:", user?.uid);
      
      if (!user) {
        setError("Not logged in. Please login again.");
        return;
      }

      const companyData = {
        name: name.trim(),
        minCgpa: parseFloat(String(minCgpa)) || 6.0,
        requiredSkills: skills,
        minLeetcodeSolved: parseInt(String(minLeetcodeSolved)) || 50,
        weights: {
          resume: Number(weights.resume) || 35,
          leetcode: Number(weights.leetcode) || 30,
          github: Number(weights.github) || 20,
          cgpa: Number(weights.cgpa) || 15
        },
        createdAt: new Date().toISOString(),
        createdBy: user.email
      };

      console.log("Attempting to save:", companyData);

      const docRef = await addDoc(
        collection(db, 'companies'),
        companyData
      );

      console.log("SUCCESS! Company ID:", docRef.id);
      router.push('/dashboard/companies');

    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("Company save error:", error);
      setError(`Failed: ${error.code} - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Link href="/dashboard/companies" className="mr-4 text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create target profile</h1>
          <p className="text-slate-500">Define criteria and scoring weights for a role.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 space-y-8">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Company / Role Name</label>
              <input 
                type="text" 
                value={name} onChange={e => setName(e.target.value)}
                className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                placeholder="e.g. Google Software Engineer 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Minimum CGPA</label>
              <input 
                type="number" step="0.1"
                value={minCgpa} onChange={e => setMinCgpa(e.target.value)}
                className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Min LeetCode Solved</label>
              <input 
                type="number"
                value={minLeetcodeSolved} onChange={e => setMinLeetcodeSolved(e.target.value)}
                className="mt-2 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Required Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map(skill => (
                  <span key={skill} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="ml-1.5 inline-flex items-center text-indigo-400 hover:text-indigo-600 focus:outline-none">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
              <input 
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="Type skill and press Enter..."
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
              />
              <p className="mt-1 text-xs text-slate-500">These skills are searched for via AI extraction.</p>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Weights */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Scoring Algorithm Weights</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${remainingWeight === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {remainingWeight === 0 ? '100% Balanced' : `${remainingWeight}% Remaining`}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Resume Match', key: 'resume', color: 'bg-blue-500' },
                { label: 'LeetCode Stats', key: 'leetcode', color: 'bg-indigo-500' },
                { label: 'GitHub Activity', key: 'github', color: 'bg-purple-500' },
                { label: 'CGPA', key: 'cgpa', color: 'bg-emerald-500' }
              ].map(({ label, key, color }) => (
                <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-3">{label}</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0" max="100"
                      value={weights[key as keyof typeof weights]}
                      onChange={e => handleWeightChange(key as keyof typeof weights, e.target.value)}
                      className="block w-[70px] rounded-md border-slate-300 shadow-sm text-center font-semibold text-slate-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-2 py-1.5 border mr-2"
                    />
                    <span className="text-slate-500 font-medium">%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4">
                    <div className={`${color} h-1.5 rounded-full`} style={{ width: `${weights[key as keyof typeof weights]}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center">
          {error ? <p className="text-red-600 text-sm font-medium">{error}</p> : <div></div>}
          <button
            type="submit"
            disabled={loading || remainingWeight !== 0}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save & Publish
          </button>
        </div>
      </form>
    </div>
  );
}
