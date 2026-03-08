import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { NextResponse } from 'next/server'

export async function GET() {
  const shortlists = await getDocs(
    collection(db, 'shortlists')
  )
  const students = await getDocs(
    collection(db, 'students')  
  )
  const companies = await getDocs(
    collection(db, 'companies')
  )
  
  return NextResponse.json({
    shortlistsCount: shortlists.size,
    studentsCount: students.size,
    companiesCount: companies.size,
    shortlists: shortlists.docs.map(d => ({
      id: d.id,
      ...d.data()
    })),
    companies: companies.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))
  })
}
