import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { firebaseApp } from '../firebase'

const storage = getStorage(firebaseApp)

// Uploads a prescription PDF to users/{patientUid}/prescriptions/{id}-{fileName}
// and returns { fileUrl, storagePath }. No Cloud Function involved — this is
// just a file + a Firestore field pointing at it, so client-side upload with
// Storage security rules is enough (a doctor may only write here if a
// confirmed careTeam link with that patient exists — see storage.rules).
export async function uploadPrescriptionFile(patientUid, id, file, onProgress) {
  const storagePath = `users/${patientUid}/prescriptions/${id}-${file.name}`
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
