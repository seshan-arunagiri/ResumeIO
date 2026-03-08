import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  try {
    let shortlistsRef = collection(db, "shortlists");
    let shortlistsQuery = companyId 
      ? query(shortlistsRef, where("companyId", "==", companyId), orderBy("totalScore", "desc")) 
      : query(shortlistsRef, orderBy("totalScore", "desc"));
      
    const shortlistsSnap = await getDocs(shortlistsQuery);
    const shortlists = shortlistsSnap.docs.map(doc => doc.data());
    
    console.log("Company ID received:", companyId);
    console.log("Shortlists found:", shortlists.length);
    console.log("First shortlist:", shortlists[0]);
    
    const candidates = shortlists.map(sl => {
      return {
          rank: sl.rank || 0,
          studentId: sl.studentId,
          name: sl.studentName || 'Unknown',
          email: sl.studentEmail || '',
          cgpa: sl.cgpa !== undefined ? sl.cgpa : 0,
          resumeUrl: sl.resumeUrl || '',
          githubUsername: sl.githubUsername || '',
          leetcodeUsername: sl.leetcodeUsername || '',
          
          totalScore: sl.totalScore || 0,
          status: sl.status || 'Unknown',
          reason: sl.reason || '',
          
          breakdown: {
             resume: sl.resumeScore || 0,
             github: sl.githubScore || 0,
             leetcode: sl.leetcodeScore || 0,
             cgpa: sl.cgpaScore || 0
          }
      };
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, candidates: [], stats: { total: 0, eligible: 0, avgScore: 0, top: "-" } });
    }

    const eligibleCount = candidates.filter(c => c.status === "Recommended" || c.status === "Highly Recommended").length;
    const avgScore = candidates.reduce((sum, c) => sum + c.totalScore, 0) / candidates.length;
    const topCandidate = candidates.length > 0 ? candidates[0].name : "-";

    const stats = {
      total: candidates.length,
      eligible: eligibleCount,
      avgScore: avgScore.toFixed(1),
      top: topCandidate
    };

    return NextResponse.json({ success: true, candidates, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
