'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/components/useAuth';
import { Loader2, ChevronDown, ChevronUp, DownloadCloud, FileText, FileBarChart } from 'lucide-react';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadReports();
    }
  }, [authLoading, user]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const compRes = await fetch('/api/companies');
      const compData = await compRes.json();
      const companies = compData.companies || [];

      const reportPromises = companies.map(async (c: any) => {
        const dashRes = await fetch(`/api/dashboard-data?companyId=${c.id}`);
        const dashData = await dashRes.json();
        return {
          companyId: c.id,
          companyName: c.name,
          createdAt: c.createdAt,
          stats: dashData.stats || { total: 0, eligible: 0, avgScore: 0, top: "-" },
          candidates: dashData.candidates || []
        };
      });

      const allReports = await Promise.all(reportPromises);
      setReports(allReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    if (expandedCompany === id) setExpandedCompany(null);
    else setExpandedCompany(id);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Highly Recommended": return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">Highly Recommended</span>;
      case "Recommended": return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">Recommended</span>;
      default: return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-medium">Not Recommended</span>;
    }
  };

  const exportExcel = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    const mapData = (list: any[]) => list.map(c => ({
        "#": c.rank,
        "Name": c.name,
        "Email": c.email,
        "Score": Number(c.totalScore.toFixed(1)),
        "CGPA": `${Number((c.cgpa || 0).toFixed(1))}/10`,
        "Resume": Number(c.breakdown?.resume?.toFixed(1) || 0),
        "GitHub": Number(c.breakdown?.github?.toFixed(1) || 0),
        "LeetCode": Number(c.breakdown?.leetcode?.toFixed(1) || 0),
        "Status": c.status,
        "Reason": c.reason
    }));

    const sheet1Data = mapData(report.candidates);
    const sheet2Data = mapData(report.candidates.filter((c: any) => c.status !== "Not Recommended"));

    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);
    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);

    const colWidths = [
      {wch: 5}, {wch: 20}, {wch: 25}, {wch: 10}, {wch: 10}, 
      {wch: 10}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 40}
    ];
    ws1['!cols'] = colWidths;
    ws2['!cols'] = colWidths;

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws1, "Full Ranked List");
    xlsx.utils.book_append_sheet(wb, ws2, "Eligible Only");

    const dateStr = new Date().toISOString().split('T')[0];
    xlsx.writeFile(wb, `${report.companyName.replace(/\s+/g, '_')}_Shortlist_${dateStr}.xlsx`);
  };

  const exportPdf = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(`ResumeIQ`, 14, 15);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${report.companyName} Shortlist`, 14, 23);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${dateStr}`, 14, 30);
    doc.text(`Total Students: ${report.stats.total} | Eligible: ${report.stats.eligible} | Avg Score: ${report.stats.avgScore}`, 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Name', 'Score', 'CGPA', 'Resume', 'GitHub', 'LeetCode', 'Status']],
      body: report.candidates.map((c: any) => [
        c.rank.toString(),
        c.name + `\n${c.email}`,
        c.totalScore.toFixed(1),
        `${(c.cgpa || 0).toFixed(1)}/10`,
        (c.breakdown?.resume || 0).toFixed(1),
        (c.breakdown?.github || 0).toFixed(1),
        (c.breakdown?.leetcode || 0).toFixed(1),
        c.status
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 7: { cellWidth: 25 } }
    });
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Generated by ResumeIQ", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    const fileDateStr = new Date().toISOString().split('T')[0];
    doc.save(`${report.companyName.replace(/\s+/g, '_')}_Shortlist_${fileDateStr}.pdf`);
  };

  if (authLoading || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  // Filter out reports that have absolutely no candidates yet? 
  // User specifies: "Shows empty state if no data yet: No reports available. Upload and process resumes first."
  const activeReports = reports.filter(r => r.stats.total > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
             <FileBarChart className="w-6 h-6 mr-2 text-blue-600" />
             Placement Reports
          </h1>
          <p className="text-slate-500 mt-1">View summarized analytics and download historical shortlists for all target roles.</p>
      </div>

      {activeReports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No reports available.</h3>
            <p className="text-slate-500 mb-6">Upload and process resumes first to generate placement reports.</p>
            <Link href="/upload" className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Go to Upload
            </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Role</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Resumes</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Score</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Candidate</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Created</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activeReports.map((report) => {
                const isExpanded = expandedCompany === report.companyId;
                return (
                 <Fragment key={report.companyId}>
                  <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => toggleRow(report.companyId)}>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-900 flex items-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 mr-2 text-slate-400" /> : <ChevronDown className="w-4 h-4 mr-2 text-slate-400" />}
                        {report.companyName}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {report.stats.total}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{report.stats.eligible}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {report.stats.avgScore}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-900 border-b-0">
                        {report.stats.top}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                        {new Date(report.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-2">
                        <button onClick={(e) => exportExcel(e, report)} className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm" title="Export Excel">
                            <FileText className="w-3.5 h-3.5 mr-1.5 text-green-600" /> Excel
                        </button>
                        <button onClick={(e) => exportPdf(e, report)} className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm" title="Export PDF">
                            <DownloadCloud className="w-3.5 h-3.5 mr-1.5" /> PDF
                        </button>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                      <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-6 py-6 border-b border-slate-200">
                              <h4 className="text-sm font-semibold text-slate-800 mb-3">{report.companyName} Shortlist Breakdown</h4>
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                  <table className="min-w-full divide-y divide-slate-200">
                                      <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                                          <tr>
                                              <th className="px-4 py-2 text-left">#</th>
                                              <th className="px-4 py-2 text-left">Candidate Name</th>
                                              <th className="px-4 py-2 text-left">Score</th>
                                              <th className="px-4 py-2 text-left">CGPA</th>
                                              <th className="px-4 py-2 text-left">Status</th>
                                              <th className="px-4 py-2 text-left">AI Reasoning</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-sm">
                                          {report.candidates.map((c: any) => (
                                              <tr key={c.studentId}>
                                                  <td className="px-4 py-2 font-medium">{c.rank}</td>
                                                  <td className="px-4 py-2">
                                                      <div>{c.name}</div>
                                                      <div className="text-xs text-slate-400">{c.email}</div>
                                                  </td>
                                                  <td className="px-4 py-2 font-bold text-blue-600">{Number(c.totalScore).toFixed(1)}</td>
                                                  <td className="px-4 py-2 text-slate-600">{Number(c.cgpa || 0).toFixed(1)}/10</td>
                                                  <td className="px-4 py-2">{getStatusBadge(c.status)}</td>
                                                  <td className="px-4 py-2 text-xs text-slate-500 max-w-xs truncate" title={c.reason}>{c.reason}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
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
