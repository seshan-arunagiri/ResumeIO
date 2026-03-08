'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { DownloadCloud, FileText, ChevronDown, ChevronUp, Loader2, Award, Users, CheckCircle, TrendingUp } from 'lucide-react';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DashboardPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, eligible: 0, avgScore: 0, top: "-" });
  const [loading, setLoading] = useState(true);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);

  // Load Companies
  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies);
          setSelectedCompany(data.companies[0].id);
        } else {
            setLoading(false); // No companies exist
        }
      })
      .catch(console.error);
  }, []);

  // Load Candidates when Company changes
  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    fetch(`/api/dashboard-data?companyId=${selectedCompany}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setCandidates(data.candidates);
            setStats(data.stats);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedCompany]);

  const toggleRow = (studentId: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(studentId)) newSet.delete(studentId);
    else newSet.add(studentId);
    setExpandedRows(newSet);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Highly Recommended": return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">Highly Recommended</span>;
      case "Recommended": return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">Recommended</span>;
      default: return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-medium">Not Recommended</span>;
    }
  };

  const ScoreBar = ({ score, color }: { score: number, color: string }) => (
    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
    </div>
  );

  const filteredCandidates = showEligibleOnly 
    ? candidates.filter(c => c.status !== "Not Recommended")
    : candidates;

  const exportExcel = () => {
    const companyName = companies.find(c => c.id === selectedCompany)?.name || "Company";
    
    // Create data mapper
    const mapData = (list: any[]) => list.map(c => ({
        "#": c.rank,
        "Name": c.name,
        "Email": c.email,
        "Score": Number(c.totalScore.toFixed(1)),
        "CGPA": Number(c.cgpa.toFixed(2)),
        "Resume": Number(c.breakdown.resume.toFixed(1)),
        "GitHub": Number(c.breakdown.github.toFixed(1)),
        "LeetCode": Number(c.breakdown.leetcode.toFixed(1)),
        "Status": c.status,
        "Reason": c.reason
    }));

    const sheet1Data = mapData(candidates);
    const sheet2Data = mapData(candidates.filter(c => c.status !== "Not Recommended"));

    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);
    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);

    // Auto column widths
    const colWidths = [
      {wch: 5}, {wch: 20}, {wch: 25}, {wch: 10}, {wch: 10}, 
      {wch: 10}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 40}
    ];
    ws1['!cols'] = colWidths;
    ws2['!cols'] = colWidths;
    
    // Add makeshift style tags for parsers that support it (Free SheetJS drops these but good to have)
    const applyColors = (ws: any, data: any[]) => {
        data.forEach((row, i) => {
            const rowIdx = i + 2; // +1 for header, +1 for 1-based indexing
            const statusCell = ws[xlsx.utils.encode_cell({r: rowIdx - 1, c: 8})]; // Status is 9th col (index 8) // Wait, Name(1) Email(2)
            if (statusCell) {
                if (row.Status === "Highly Recommended") statusCell.s = { fill: { fgColor: { rgb: "C6F6D5" } } };
                if (row.Status === "Recommended") statusCell.s = { fill: { fgColor: { rgb: "BEE3F8" } } };
                if (row.Status === "Not Recommended") statusCell.s = { fill: { fgColor: { rgb: "FED7D7" } } };
            }
        });
    };
    applyColors(ws1, sheet1Data);
    applyColors(ws2, sheet2Data);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws1, "Full Ranked List");
    xlsx.utils.book_append_sheet(wb, ws2, "Eligible Only");

    const dateStr = new Date().toISOString().split('T')[0];
    xlsx.writeFile(wb, `${companyName.replace(/\s+/g, '_')}_Shortlist_${dateStr}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const companyName = companies.find(c => c.id === selectedCompany)?.name || "Company";
    const dateStr = new Date().toLocaleDateString();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(`ResumeIQ`, 14, 15);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${companyName} Shortlist`, 14, 23);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${dateStr}`, 14, 30);
    
    // Summary Stats
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Students: ${stats.total} | Eligible: ${stats.eligible} | Avg Score: ${stats.avgScore}`, 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Name', 'Score', 'CGPA', 'Resume', 'GitHub', 'LeetCode', 'Status']],
      body: filteredCandidates.map(c => [
        c.rank.toString(),
        c.name + `\n${c.email}`,
        c.totalScore.toFixed(1),
        c.cgpa.toFixed(2),
        c.breakdown.resume.toFixed(1),
        c.breakdown.github.toFixed(1),
        c.breakdown.leetcode.toFixed(1),
        c.status
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: {
        7: { cellWidth: 25 } // Provide some width for status
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Generated by ResumeIQ", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    const fileDateStr = new Date().toISOString().split('T')[0];
    doc.save(`${companyName.replace(/\s+/g, '_')}_Shortlist_${fileDateStr}.pdf`);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
           <span className="font-semibold text-slate-700">Target Role:</span>
           <select 
              className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
           >
              {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {companies.length === 0 && <option value="">No roles available. Add one.</option>}
           </select>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button 
                onClick={() => setShowEligibleOnly(!showEligibleOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showEligibleOnly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
                {showEligibleOnly ? 'Show All' : 'Shortlist Only'}
            </button>
            <button onClick={exportExcel} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50">
                <FileText className="w-4 h-4 mr-2 text-green-600" /> Export Excel
            </button>
            <button onClick={exportPdf} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                <DownloadCloud className="w-4 h-4 mr-2" /> Export PDF
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
            { label: "Total Students", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
            { label: "Eligible Count", value: stats.eligible, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
            { label: "Average Score", value: stats.avgScore, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
            { label: "Top Candidate", value: stats.top, icon: Award, color: "text-amber-600", bg: "bg-amber-100" }
        ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center mr-4`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-xl font-bold text-slate-900 truncate w-32">{stat.value}</p>
                </div>
            </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            No candidates parsed for this role yet. Go to the Upload page to process resumes.
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="w-12 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CGPA</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Resume</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">GitHub</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">LeetCode</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Reason</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredCandidates.map((candidate) => {
                const isExpanded = expandedRows.has(candidate.studentId);
                return (
                 <Fragment key={candidate.studentId}>
                  <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => toggleRow(candidate.studentId)}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900">
                        {candidate.rank}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{candidate.name}</div>
                        <div className="text-xs text-slate-500">{candidate.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-lg font-bold text-blue-600">{candidate.totalScore.toFixed(1)}</div>
                        <ScoreBar score={candidate.totalScore} color="bg-blue-600" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">
                        {candidate.cgpa.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700 font-medium">{candidate.breakdown.resume.toFixed(1)}</div>
                        <ScoreBar score={candidate.breakdown.resume} color="bg-blue-400" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700 font-medium">{candidate.breakdown.github.toFixed(1)}</div>
                        <ScoreBar score={candidate.breakdown.github} color="bg-purple-400" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700 font-medium">{candidate.breakdown.leetcode.toFixed(1)}</div>
                        <ScoreBar score={candidate.breakdown.leetcode} color="bg-indigo-400" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(candidate.status)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate hidden md:table-cell">
                        {candidate.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                      <tr className="bg-slate-50">
                          <td colSpan={10} className="px-6 py-4 border-b border-slate-200">
                              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6">
                                  <div className="flex-1">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detailed Reasoning</p>
                                      <p className="text-sm text-slate-700 italic border-l-2 border-amber-400 pl-3">"{candidate.reason}"</p>
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Candidate Links</p>
                                      <div className="flex flex-col space-y-1">
                                          {candidate.resumeUrl && <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">View PDF Resume</a>}
                                          {candidate.githubUsername && <a href={`https://github.com/${candidate.githubUsername}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">GitHub: {candidate.githubUsername}</a>}
                                          {candidate.leetcodeUsername && <a href={`https://leetcode.com/u/${candidate.leetcodeUsername}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">LeetCode: {candidate.leetcodeUsername}</a>}
                                      </div>
                                  </div>
                              </div>
                          </td>
                      </tr>
                  )}
                 </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
