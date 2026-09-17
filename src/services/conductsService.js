import { collection, doc, addDoc, setDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: users/{uid}/conducts/{conductId}
// Fields: title, why, timeframe ('agora' | 'proximos90' | 'esteAno' | 'longoPrazo'),
//         type ('medication' | 'diet' | 'exercise' | 'followup'), dueDate,
//         prescribedBy (careTeam member id, optional), status ('pending' | 'done')

export async function getConducts(uid) {
  const q = query(collection(db, 'users', uid, 'conducts'), orderBy('dueDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, dueDate: data.dueDate?.toDate?.() || null }
  })
}

export async function addConduct(uid, conduct) {
  const docRef = await addDoc(collection(db, 'users', uid, 'conducts'), {
    ...conduct,
    status: conduct.status || 'pending',
    dueDate: conduct.dueDate ? Timestamp.fromDate(conduct.dueDate) : null,
  })
  return docRef.id
}

export async function markConductDone(uid, conductId) {
  await setDoc(doc(db, 'users', uid, 'conducts', conductId), { status: 'done' }, { merge: true })
}

export function groupByTimeframe(conducts) {
  return conducts.reduce(
    (acc, c) => {
      const key = acc[c.timeframe] ? c.timeframe : 'agora'
      acc[key].push(c)
      return acc
    },
    { agora: [], proximos90: [], esteAno: [], longoPrazo: [] }
  )
}

