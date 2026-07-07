// Server-only helper: renders a registered template and enqueues it directly
// into the transactional_emails pgmq queue via supabaseAdmin. This bypasses the
// user-JWT-gated /lovable/email/transactional/send route so unauthenticated
// public form submissions can still notify the admin inbox.
import * as React from 'react'
import { render } from '@react-email/render'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Pacific North Events & Tents'
const SENDER_DOMAIN = 'notify.pacificnorthrentals.com'
const FROM_DOMAIN = 'notify.pacificnorthrentals.com'
const ADMIN_EMAIL = 'info@pacificnorthrentals.com'

function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local[0]}***@${domain}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SendAdminEmailArgs {
  templateName: string
  templateData: Record<string, any>
  idempotencyKey: string
  recipient?: string
}

/**
 * Renders a registered template and enqueues it. Errors are logged and
 * swallowed so a failing notification never blocks the customer-facing flow.
 */
export async function sendAdminEmail(args: SendAdminEmailArgs): Promise<void> {
  const { templateName, templateData, idempotencyKey } = args
  const recipient = (args.recipient ?? ADMIN_EMAIL).toLowerCase()
  const messageId = crypto.randomUUID()

  console.log('[sendAdminEmail] start', {
    templateName,
    recipient_redacted: redactEmail(recipient),
    idempotencyKey,
  })



  try {
    const template = TEMPLATES[templateName]
    if (!template) {
      console.error('[sendAdminEmail] template not found', { templateName })
      return
    }

    // Suppression check — skip if the admin address has ever unsubscribed/bounced
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', recipient)
      .maybeSingle()

    if (suppressed) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'suppressed',
      })
      console.warn('[sendAdminEmail] admin recipient is suppressed', {
        recipient_redacted: redactEmail(recipient),
      })
      return
    }

    // Get-or-create unsubscribe token
    let unsubscribeToken: string
    const { data: existing } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', recipient)
      .maybeSingle()

    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token
    } else {
      unsubscribeToken = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert(
          { token: unsubscribeToken, email: recipient },
          { onConflict: 'email', ignoreDuplicates: true },
        )
      const { data: stored } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', recipient)
        .maybeSingle()
      if (stored?.token) unsubscribeToken = stored.token
    }

    // Render
    const element = React.createElement(template.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof template.subject === 'function'
        ? template.subject(templateData)
        : template.subject

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'pending',
    })

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('[sendAdminEmail] enqueue failed', { enqueueError, templateName })
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return
    }

    console.log('[sendAdminEmail] queued', {
      templateName,
      recipient_redacted: redactEmail(recipient),
    })
  } catch (err) {
    console.error('[sendAdminEmail] unexpected error', {
      templateName,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Send a transactional email to any recipient using the same rendered-template
 * + pgmq-enqueue pipeline as sendAdminEmail. Recipient is required.
 */
export async function sendTransactionalEmail(
  args: SendAdminEmailArgs & { recipient: string },
): Promise<void> {
  return sendAdminEmail(args)
}

/**
 * Auto-acknowledgement email to the customer when a quote/planner request is
 * submitted. Best-effort — logs and swallows errors so a bad address never
 * blocks the submission flow.
 */
export async function sendCustomerAcknowledgement(args: {
  requestId: string
  recipient: string
  customerName?: string | null
  eventType?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  requestType: 'rental' | 'beacon' | 'catering' | 'planner' | 'venue'
}): Promise<void> {
  if (!args.recipient) return
  return sendAdminEmail({
    templateName: 'customer-request-acknowledgement',
    idempotencyKey: `customer-ack-${args.requestId}`,
    recipient: args.recipient,
    templateData: {
      customerName: args.customerName ?? null,
      eventType: args.eventType ?? null,
      eventDate: args.eventDate ?? null,
      eventLocation: args.eventLocation ?? null,
      requestType: args.requestType,
    },
  })
}
