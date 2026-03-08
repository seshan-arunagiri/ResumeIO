import Link from "next/link";
import { BrainCircuit, FileSearch, BarChart3, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold tracking-tight text-blue-900">ResumeIQ</span>
        </div>
        <div>
          <Link 
            href="/login" 
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition mr-6"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition"
          >
            Login as Teacher
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-20 lg:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-8 border border-blue-100">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
          Now supporting automatic GitHub & LeetCode scraping
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight max-w-4xl">
          AI-Powered Campus <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Placement Screening</span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-2xl">
          Instantly process hundreds of resumes, extract precise data using LLMs, and rank candidates automatically based on custom company criteria.
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all"
        >
          Get Started
          <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 w-full">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <FileSearch className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">AI Parsing</h3>
            <p className="text-slate-600 leading-relaxed">
              Extract CGPA, skills, projects, and structured data natively from unstructured PDFs using Google's Gemini Flash.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left hover:shadow-md transition">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
              <BrainCircuit className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Ranking</h3>
            <p className="text-slate-600 leading-relaxed">
              Dynamically assign weights to resumes, GitHub commits, and LeetCode problems to find the perfect match.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left hover:shadow-md transition">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Export Reports</h3>
            <p className="text-slate-600 leading-relaxed">
              Generate actionable Excel spreads and PDF shortlist reports to send directly to campus recruiters.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
