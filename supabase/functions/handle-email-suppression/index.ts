import { createClient } from 'npm:@supabase/supabase-js@2'

// Resend delivery-event webhook (Svix-signed).
// Registered in Resend → Webhooks for the events:
//   email.bounced, email.complained, email.delivery_delayed
interface ResendWebhookPayload {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[] | string
    from?: string
    subject?: string
    bounce?: Record<string, unknown>
    [key: string]: unknown
  }
}

type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe'

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Verify a Svix signature (the scheme Resend uses for webhooks).
// Signed content is `${id}.${timestamp}.${body}`; the secret is the base64
// payload after the `whsec_` prefix. Multiple `v1,...` signatures may be sent
// during secret rotation, so any match is accepted.
async function verifySvixSignature(
  req: Request,
  body: string,
  secret: string
): Promise<boolean> {
  const id = req.headers.get('svix-id') ?? req.headers.get('webhook-id')
  const timestamp =
    req.headers.get('svix-timestamp') ?? req.headers.get('webhook-timestamp')
  const signatureHeader =
    req.headers.get('svix-signature') ?? req.headers.get('webhook-signature')

  if (!id || !timestamp || !signatureHeader) return false

  // Reject stale deliveries (5 minute tolerance) to block replay.
  const tsSeconds = Number(timestamp)
  if (!Number.isFinite(tsSeconds)) return false
  if (Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false

  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let keyBytes: Uint8Array
  try {
    keyBytes = base64ToBytes(rawSecret)
  } catch {
    keyBytes = new TextEncoder().encode(rawSecret)
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  return signatureHeader
    .split(' ')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1,'))
    .some((part) => timingSafeEqual(part.slice(3), expected))
}

function mapEventToReason(type: string): SuppressionReason | null {
  switch (type) {
    case 'email.bounced':
      return 'bounce'
    case 'email.complained':
      return 'complaint'
    default:
      return null
  }
}

function mapReasonToStatus(
  reason: SuppressionReason
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: SuppressionReason): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    case 'unsubscribe':
      return 'Recipient unsubscribed'
    default:
      return 'Email suppressed'
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const rawBody = await req.text()

  if (!(await verifySvixSignature(req, rawBody, webhookSecret))) {
    console.error('Invalid or missing Resend webhook signature')
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  let payload: ResendWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const reason = mapEventToReason(payload.type ?? '')
  if (!reason) {
    // Not a suppression-worthy event (delivered, opened, delayed, ...).
    console.log('Ignoring Resend event', { type: payload.type })
    return jsonResponse({ success: true, ignored: payload.type ?? null })
  }

  const recipients = Array.isArray(payload.data?.to)
    ? payload.data?.to
    : payload.data?.to
      ? [payload.data.to]
      : []
  const recipient = recipients[0]

  if (!recipient) {
    console.error('Resend event missing recipient', { type: payload.type })
    return jsonResponse({ error: 'Missing recipient' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = String(recipient).toLowerCase()
  const redacted = normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1]
  const metadata = {
    provider: 'resend',
    event: payload.type,
    email_id: payload.data?.email_id ?? null,
    subject: payload.data?.subject ?? null,
    bounce: payload.data?.bounce ?? null,
  }

  // 1. Upsert to suppressed_emails (idempotent — safe for webhook retries)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: normalizedEmail, reason, metadata }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      error: suppressError,
      email_redacted: redacted,
    })
    return jsonResponse({ error: 'Failed to write suppression' }, 500)
  }

  // 2. Append a log entry for the event (never update existing rows)
  const sendLogMessage = mapReasonToMessage(reason)
  const { error: insertError } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: mapReasonToStatus(reason),
    error_message: sendLogMessage,
    metadata,
  })

  if (insertError) {
    // Non-fatal — the suppression itself was already recorded.
    console.warn('Failed to insert email_send_log', { error: insertError })
  }

  // 3. Alert the admin so a failed customer email never goes unnoticed.
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'admin-delivery-alert',
        idempotencyKey: `delivery-alert-${reason}-${payload.data?.email_id ?? normalizedEmail}`,
        templateData: {
          affectedEmail: normalizedEmail,
          eventType: reason,
          reason: sendLogMessage,
          templateName: String(payload.data?.subject ?? ''),
          occurredAt: payload.created_at ?? new Date().toISOString(),
        },
      },
    })
  } catch (alertError) {
    console.warn('Failed to send admin delivery alert', { alertError })
  }

  console.log('Suppression processed', {
    email_redacted: redacted,
    reason,
    event: payload.type,
  })

  return jsonResponse({ success: true })
})
