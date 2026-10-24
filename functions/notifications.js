// In-app notifications + push. Firestore triggers turn data changes into
// notifications/{id} docs (the recipient's notification center reads them
// live), and every new notification is pushed to the recipient's devices
// through Firebase Cloud Messaging.
//
// Notification ids are deterministic ("exam_<id>_reviewed"), created with
// .create(): trigger retries and toggles (a doctor un-marking and
// re-marking a result as reviewed) never notify twice.
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

// Opened when a push notification is tapped.
const APP_URL = defineString('APP_URL', { default: 'https://tamagotchi-459a6.web.app' })

// Firestore is in nam5, so its triggers run in us-central1.
const REGION = 'us-central1'

// The app is initialized in index.js, which requires this module after.
const db = () => getFirestore()

// type: what happened (the app picks the icon and where a tap goes)
// target: { kind: 'exam' | 'conduct', id, patientId }
async function notify(id, { recipientId, type, title, body, target, actorName = '' }) {
  if (!recipientId) return
  try {
    await db().collection('notifications').doc(id).create({
      recipientId,
      type,
      title,
      body,
      target,
      actorName,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    if (err.code !== 6) throw err // 6 = ALREADY_EXISTS: already notified
  }
}

const listExams = (exam) => exam.title || 'exame'

// Values outside the reference range printed on the report (functions/index.js).
const outOfRange = (exam) => (exam.extractedValues || []).filter((v) => v.flag === 'low' || v.flag === 'high')

// "Glicose acima da referência · Ferritina em queda (-56%) · +1"
function attentionSummary(flagged, trends) {
  const items = [
    ...flagged.map((v) => `${v.label} ${v.flag === 'high' ? 'acima' : 'abaixo'} da referência`),
    ...trends.map((t) => `${t.label} em ${t.direction === 'down' ? 'queda' : 'alta'} (${t.percent > 0 ? '+' : ''}${t.percent}%)`),
  ]
  return [...items.slice(0, 2), items.length > 2 && `+${items.length - 2}`].filter(Boolean).join(' · ')
}

// --- Exams & results -------------------------------------------------------

exports.notifyExamCreated = onDocumentCreated({ document: 'exams/{examId}', region: REGION }, async (event) => {
  const exam = event.data?.data()
  if (!exam) return
  const examId = event.params.examId
  const target = { kind: 'exam', id: examId, patientId: exam.patientId }

  // Doctor asked the patient to do an exam.
  if (exam.kind !== 'result' && exam.doctorId) {
    await notify(`exam_${examId}_requested`, {
      recipientId: exam.patientId,
      type: 'exam_requested',
      title: 'Novo exame pedido',
      body: `${exam.doctorName || 'Seu médico'} pediu: ${listExams(exam)}`,
      target,
      actorName: exam.doctorName,
    })
  }

  // Patient sent a result for the doctor to review.
  if (exam.kind === 'result' && exam.doctorId) {
    await notify(`exam_${examId}_submitted`, {
      recipientId: exam.doctorId,
      type: 'result_submitted',
      title: 'Novo resultado para revisar',
      body: `${exam.patientName || 'Um paciente'} enviou ${listExams(exam)}`,
      target,
      actorName: exam.patientName,
    })
  }
})

exports.notifyExamUpdated = onDocumentUpdated({ document: 'exams/{examId}', region: REGION }, async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || after.kind !== 'result') return
  const examId = event.params.examId
  const target = { kind: 'exam', id: examId, patientId: after.patientId }

  // The extraction (functions/index.js) finished reading the patient's result.
  if (before.processingStatus !== 'completed' && after.processingStatus === 'completed') {
    const count = (after.extractedValues || []).length
    await notify(`exam_${examId}_read`, {
      recipientId: after.patientId,
      type: 'result_read',
      title: 'Seu exame foi lido',
      body: count > 0
        ? `${listExams(after)}: ${count} ${count > 1 ? 'valores identificados' : 'valor identificado'}`
        : `${listExams(after)}: nenhum valor numérico encontrado`,
      target,
    })

    // Out-of-range values and trends go to the doctor only; the patient
    // sees the flags once the doctor has reviewed the result.
    const flagged = outOfRange(after)
    const trends = after.trendAlerts || []
    if (after.doctorId && (flagged.length > 0 || trends.length > 0)) {
      await notify(`exam_${examId}_attention`, {
        recipientId: after.doctorId,
        type: 'result_attention',
        title: `Resultado com alterações: ${after.patientName || 'paciente'}`,
        body: attentionSummary(flagged, trends),
        target,
        actorName: after.patientName,
      })
    }
  }
  if (before.processingStatus !== 'failed' && after.processingStatus === 'failed' && after.processingError !== 'upload_failed') {
    await notify(`exam_${examId}_failed`, {
      recipientId: after.patientId,
      type: 'result_failed',
      title: 'Não conseguimos ler seu exame',
      body: `${listExams(after)}: o arquivo continua disponível para seu médico.`,
      target,
    })
  }

  if (before.reviewStatus !== 'reviewed' && after.reviewStatus === 'reviewed') {
    const flagged = outOfRange(after).length
    await notify(`exam_${examId}_reviewed`, {
      recipientId: after.patientId,
      type: 'result_reviewed',
      title: `${after.doctorName || 'Seu médico'} revisou seu exame`,
      body: flagged > 0
        ? `${listExams(after)}: ${flagged} ${flagged > 1 ? 'valores fora' : 'valor fora'} da referência. Veja os detalhes no Plano.`
        : listExams(after),
      target,
      actorName: after.doctorName,
    })
  }
})

// --- Plan changes ----------------------------------------------------------

exports.notifyConductCreated = onDocumentCreated({ document: 'conducts/{conductId}', region: REGION }, async (event) => {
  const conduct = event.data?.data()
  if (!conduct?.doctorId) return // the patient's own items don't notify
  const conductId = event.params.conductId
  await notify(`conduct_${conductId}_created`, {
    recipientId: conduct.patientId,
    type: 'conduct_created',
    title: `Nova orientação de ${conduct.doctorName || 'seu médico'}`,
    body: conduct.title,
    target: { kind: 'conduct', id: conductId, patientId: conduct.patientId },
    actorName: conduct.doctorName,
  })
})

// --- Push ------------------------------------------------------------------

// FCM error codes that mean the token will never work again.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

exports.pushNotification = onDocumentCreated({ document: 'notifications/{notificationId}', region: REGION }, async (event) => {
  const notification = event.data?.data()
  if (!notification) return

  // deviceTokens/{token}: { userId, createdAt, userAgent }, written by the app.
  const tokensSnapshot = await db().collection('deviceTokens').where('userId', '==', notification.recipientId).get()
  const tokens = tokensSnapshot.docs.map((d) => d.id)
  if (tokens.length === 0) return

  // FCM isn't emulated; log instead of failing locally.
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.info('Push skipped in the emulator', { recipientId: notification.recipientId, tokens: tokens.length, title: notification.title })
    return
  }

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: notification.title, body: notification.body },
    data: { notificationId: event.params.notificationId, type: notification.type },
    webpush: {
      notification: { icon: '/icon-192.png', badge: '/icon-192.png', tag: event.params.notificationId },
      fcmOptions: { link: APP_URL.value() },
    },
  })

  // Forget devices that uninstalled the app or revoked permission.
  const dead = response.responses
    .map((r, i) => (!r.success && DEAD_TOKEN_CODES.has(r.error?.code) ? tokens[i] : null))
    .filter(Boolean)
  if (dead.length > 0) {
    const batch = db().batch()
    dead.forEach((token) => batch.delete(db().collection('deviceTokens').doc(token)))
    await batch.commit()
  }
  logger.info('Push sent', { recipientId: notification.recipientId, success: response.successCount, failed: response.failureCount, removed: dead.length })
})
