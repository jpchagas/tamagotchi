import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { firebaseApp } from '../firebase'

const storage = getStorage(firebaseApp)

async function uploadFile(storagePath, file, onProgress) {
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file)

  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      reject,
      resolve
    )
  })

  const fileUrl = await getDownloadURL(uploadTask.snapshot.ref)
  return { fileUrl, storagePath }
}

// These three paths are exactly what the Cloud Function (functions/index.js)
// pattern-matches on to decide which extraction routine to run — the doc
// must already exist (see conductsService/examsService/examReviewService)
// before calling these, since the path embeds its real Firestore id.
export function uploadConductPrescriptionFile(patientUid, conductId, file, onProgress) {
  return uploadFile(`users/${patientUid}/conducts/${conductId}/prescription-${file.name}`, file, onProgress)
}

export function uploadExamRequestFile(patientUid, examId, file, onProgress) {
  return uploadFile(`users/${patientUid}/exams/${examId}/request-${file.name}`, file, onProgress)
}

export function uploadExamResultFile(patientUid, examId, file, onProgress) {
  return uploadFile(`users/${patientUid}/exams/${examId}/result-${file.name}`, file, onProgress)
}
