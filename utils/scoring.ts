import { getScore, updateScore, createScore } from '@/lib/db';

export async function calculateScore(student: any, githubData: any, leetcodeData: any, company: any) {
  // --- RESUME SCORE ---
  let resumeScore = 0;
  let matchedSkillsCount = 0;
  const missingSkills: string[] = [];

  const studentSkills = (student?.skills || []).map((s: string) => s.toLowerCase());
  const requiredSkills = company?.requiredSkills || [];

  if (requiredSkills.length > 0) {
    requiredSkills.forEach((reqSkill: string) => {
      if (studentSkills.includes(reqSkill.toLowerCase())) {
        matchedSkillsCount++;
      } else {
        missingSkills.push(reqSkill);
      }
    });
    resumeScore = (matchedSkillsCount / requiredSkills.length) * 100;
  } else {
    resumeScore = 100; // No requirements = perfect score
  }

  // --- GITHUB SCORE ---
  // repos(30%) + commitsPerWeek(40%) + streak(30%)
  // Normalize based on assumed healthy maximums (e.g. 15 repos, 20 commits/wk, 30 day streak)
  const repos = githubData?.totalRepos || 0;
  const commits = githubData?.averageCommitsPerWeek || 0;
  const streak = githubData?.longestStreak || 0;

  const repoNorm = Math.min((repos / 15) * 100, 100);
  const commitsNorm = Math.min((commits / 20) * 100, 100);
  const streakNorm = Math.min((streak / 30) * 100, 100);

  const githubScore = (repoNorm * 0.3) + (commitsNorm * 0.4) + (streakNorm * 0.3);

  // --- LEETCODE SCORE ---
  // easy×1 + medium×3 + hard×5
  const easy = leetcodeData?.easySolved || 0;
  const medium = leetcodeData?.mediumSolved || 0;
  const hard = leetcodeData?.hardSolved || 0;

  const lcPoints = (easy * 1) + (medium * 3) + (hard * 5);
  // Assuming 1 medium problem roughly = 2 solved total (for minLeetcodeSolved estimation)
  // Let minimum points required = minLeetcodeSolved * 2
  const minPointsReq = (company?.minLeetcodeSolved || 50) * 2;
  const leetcodeScore = Math.min((lcPoints / minPointsReq) * 100, 100);

  // --- CGPA SCORE ---
  const cgpaRaw = student?.cgpa || 0;
  const cgpaScore = (cgpaRaw / 10) * 100;

  // --- FINAL TOTAL SCORE ---
  const weights = company?.weights || { resume: 35, leetcode: 30, github: 20, cgpa: 15 };
  
  const finalScore = 
    (resumeScore * (weights.resume / 100)) +
    (leetcodeScore * (weights.leetcode / 100)) +
    (githubScore * (weights.github / 100)) +
    (cgpaScore * (weights.cgpa / 100));

  // --- STATUS ---
  let status = "Not Recommended";
  if (finalScore >= 80) status = "Highly Recommended";
  else if (finalScore >= 60) status = "Recommended";

  // --- REASON ---
  const reasons: string[] = [];
  if (missingSkills.length > 0) {
    reasons.push(`Missing skills: ${missingSkills.join(', ')}`);
  }
  if (cgpaRaw < (company?.minCgpa || 3.0)) {
    reasons.push("CGPA below minimum");
  }
  if (lcPoints < minPointsReq) {
    reasons.push("LeetCode points below competitive minimum");
  }
  if (githubData?.hasOnlyForks) {
      reasons.push("GitHub contains predominantly fork repositories");
  }

  const reasonDesc = reasons.length > 0 ? reasons.join(' | ') : "Meets all baseline requirements.";

  // --- SAVE TO FIRESTORE ---
  // The student and company payloads passed might be the raw DB objects which may not contain ".id" directly inside.
  // Assuming the caller injects it or it's named studentId/companyId based on the earlier processSingleResume.
  const sId = student?.studentId || student?.id || "unknown_student";
  const cId = company?.companyId || company?.id || "unknown_company";
  
  const scoreId = `${sId}_${cId}`;
  const scorePayload = {
    studentId: sId,
    resumeScore,
    githubScore,
    leetcodeScore,
    cgpaScore,
    totalScore: finalScore,
    updatedAt: new Date().toISOString()
  };

  try {
    const existing = await getScore(scoreId);
    if (existing) {
      await updateScore(scoreId, scorePayload);
    } else {
      await createScore(scoreId, scorePayload);
    }
  } catch (err) {
    console.error("Error saving score to DB:", err);
  }

  return { 
    finalScore, 
    breakdown: { resumeScore, githubScore, leetcodeScore, cgpaScore },
    status, 
    reason: reasonDesc 
  };
}
