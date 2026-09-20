import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { firebaseApp } from '../firebase'

const storage = getStorage(firebaseApp)

// Generic upload helper: uploads a file to an exact Storage path and returns
// { fileUrl, storagePath }. No Cloud Function involved anywhere this is used
// — it's just a file + a Firestore field pointing at it, so client-side
// upload with Storage security rules is enough.
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

// A doctor may only write here if a confirmed careTeam link with that
// patient exists (enforced by Storage security rules, not by this code).
export function uploadPrescriptionFile(patientUid, id, file, onProgress) {
  return uploadFile(`users/${patientUid}/prescriptions/${id}-${file.name}`, file, onProgress)
}

// A patient uploads their own exam result here — Storage rules should only
// allow patientUid === request.auth.uid to write to this path.
export function uploadExamResultFile(patientUid, id, file, onProgress) {
  return uploadFile(`users/${patientUid}/examResults/${id}-${file.name}`, file, onProgress)
}
