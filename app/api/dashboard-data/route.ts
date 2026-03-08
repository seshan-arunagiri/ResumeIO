import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  try {
    // 1. Fetch shortlists for this company
    let shortlistsRef = collection(db, "shortlists");
    let shortlistsQuery = companyId ? query(shortlistsRef, where("companyId", "==", companyId)) : shortlistsRef;
    const shortlistsSnap = await getDocs(shortlistsQuery);
    
    const shortlists = shortlistsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    if (shortlists.length === 0) {
      return NextResponse.json({ success: true, candidates: [], stats: { total: 0, eligible: 0, avgScore: 0, top: "-" } });
    }

    // 2. Extract unique student IDs
    const studentIds = [...new Set(shortlists.map(s => s.studentId))];

    // 3. Fetch specific students (chunked in groups of 10 if necessary, but we'll fetch all here for simplicity)
    const studentsSnap = await getDocs(collection(db, "students"));
    const allStudents = studentsSnap.docs.reduce((acc: any, doc) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {});

    // 4. Fetch specific scores mapping
    const scoresSnap = await getDocs(collection(db, "scores"));
    const allScores = scoresSnap.docs.reduce((acc: any, doc) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {});

    // 5. Build merged payload
    const candidates = shortlists.map(sl => {
       const student = allStudents[sl.studentId] || {};
       const scoreDocId = `${sl.studentId}_${sl.companyId}`;
       const scores = allScores[scoreDocId] || {};

       return {
          rank: sl.rank || 0,
          studentId: sl.studentId,
          name: student.name || 'Unknown',
          email: student.email || '',
          cgpa: student.cgpa || 0,
          resumeUrl: student.resumeUrl || '',
          githubUsername: student.githubUsername || '',
          leetcodeUsername: student.leetcodeUsername || '',
          
          totalScore: sl.totalScore || 0,
          status: sl.status || 'Unknown',
          reason: sl.reason || '',
          
          breakdown: {
             resume: scores.resumeScore || 0,
             github: scores.githubScore || 0,
             leetcode: scores.leetcodeScore || 0,
             cgpa: scores.cgpaScore || 0
          }
       };
    }).sort((a, b) => a.rank - b.rank); // Sort sequentially

    // 6. Summary Stats
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
