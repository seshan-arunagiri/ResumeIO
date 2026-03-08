import { NextRequest } from 'next/server';
import { getCompany, createShortlist, updateShortlist, getShortlist } from '@/lib/db';
import { calculateScore } from '@/utils/scoring';

/**
 * Helper to process a single resume end-to-end
 */
async function processSingleResume(resumeUrl: string, company: Record<string, unknown>, studentId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 1. Parse Resume (direct route access for test/server environment)
    const { POST: parsePost } = await import('@/app/api/parse-resume/route');
    const parseReq = new Request(`${baseUrl}/api/parse-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl, studentId })
    });
    const parseRes = await parsePost(parseReq);
    
    if (!parseRes.ok) throw new Error("Parse Resume failed");
    
    // Fetch newly saved student to get usernames
    const { getStudent } = await import('@/lib/db');
    const student = await getStudent(studentId);
    
    if (!student) throw new Error("Student not saved properly");

    // 2. Fetch Profiles (Github + Leetcode)
    const githubUsername = student.githubUsername || "";
    const leetcodeUsername = student.leetcodeUsername || "";
    
    let githubData = {};
    let leetcodeData = {};

    if (githubUsername || leetcodeUsername) {
        const { POST: profilePost } = await import('@/app/api/fetch-profiles/route');
        const profileReq = new Request(`${baseUrl}/api/fetch-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, githubUsername, leetcodeUsername })
        });
        const profileRes = await profilePost(profileReq);
        
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            githubData = profileData.githubStats || {};
            leetcodeData = profileData.leetcodeStats || {};
        }
    }

    // 3. Calculate Score
    const scoreResult = await calculateScore(
        { ...student, studentId }, 
        githubData, 
        leetcodeData, 
        company
    );

    // 4. Save to Shortlists
    const shortlistId = `${studentId}_${company.companyId}`;
    const shortlistPayload = {
      companyId: String(company.companyId),
      studentId,
      rank: 0, // Will be sorted and updated later
      status: scoreResult.status,
      reason: scoreResult.reason,
      totalScore: scoreResult.finalScore
    };

    const existingShortlist = await getShortlist(shortlistId);
    if (existingShortlist) {
        await updateShortlist(shortlistId, shortlistPayload);
    } else {
        await createShortlist(shortlistId, shortlistPayload);
    }

    return {
        studentId,
        name: student.name,
        totalScore: scoreResult.finalScore,
        status: scoreResult.status
    };
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { resumeUrls, companyId } = body;

    if (!resumeUrls || !Array.isArray(resumeUrls) || !companyId) {
        return new Response("Missing required fields", { status: 400 });
    }

    const company = await getCompany(companyId);
    if (!company) {
        return new Response("Invalid companyId", { status: 404 });
    }

    const total = resumeUrls.length;
    let processed = 0;
    const results: Record<string, unknown>[] = [];

    // Set up SSE Stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = (data: unknown) => {
        writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Process asynchronously in background so we can stream responses
    (async () => {
        try {
            // Concurrency limit of 5
            const concurrencyLimit = 5;
            for (let i = 0; i < resumeUrls.length; i += concurrencyLimit) {
                const batch = resumeUrls.slice(i, i + concurrencyLimit);
                
                const batchPromises = batch.map(async (url, idx) => {
                    const studentId = `student_${companyId}_${Date.now()}_${i + idx}`;
                    try {
                        const result = await processSingleResume(url, { ...company, companyId }, studentId);
                        results.push(result);
                    } catch (e: unknown) {
                        const err = e as Error;
                        console.error(`Error processing resume ${idx}:`, err.message);
                        results.push({ studentId, error: err.message, url });
                    } finally {
                        processed++;
                        const percent = Math.round((processed / total) * 100);
                        sendEvent({ type: "progress", processed, total, percent });
                    }
                });

                await Promise.all(batchPromises);
            }

            // Sort results by totalScore descending
            const rankedResults = results
                .filter(r => !r.error)
                .sort((a, b) => (b.totalScore as number) - (a.totalScore as number))
                .map((r, index) => ({ ...r, rank: index + 1 }));

            // Update ranks in Firestore
            for (const r of rankedResults) {
                const slId = `${(r as any).studentId}_${companyId}`;
                await updateShortlist(slId, { rank: (r as any).rank });
            }

            // Send completion event
            sendEvent({ type: "complete", results: rankedResults });

        } catch (error: unknown) {
            const err = error as Error;
            sendEvent({ type: "error", message: err.message });
        } finally {
            writer.close();
        }
    })();

    // Return the response stream
    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
