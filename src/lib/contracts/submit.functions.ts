import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { z } from 'zod'

const CONTRACT_IDS = [
  'rental-contract',
  'beacon-contract',
  'catering-contract',
  'credit-card-authorization',
] as const

const InputSchema = z.object({
  contractType: z.enum(CONTRACT_IDS),
  formData: z.record(z.string(), z.string()),
  typedSignature: z.string().min(2).max(120),
  signaturePngDataUrl: z.string().nullable().optional(),
  quoteId: z.string().uuid().nullable().optional(),
})

export type SubmitContractInput = z.infer<typeof InputSchema>

/** Look up an auth user by email via paginated listUsers.
 *  Supabase's admin API caps perPage at 1000 and has no direct
 *  getUserByEmail; paginate until found or exhausted. */
async function findAuthUserIdByEmail(
  admin: {
    auth: { admin: { listUsers: (opts: { page: number; perPage: number }) => Promise<{ data: { users: Array<{ id: string; email?: string | null }> }; error: unknown | null }> } }
  },
  email: string,
): Promise<string | null> {

  const target = email.trim().toLowerCase()
  if (!target) return null
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const hit = data?.users?.find((u) => (u.email ?? '').toLowerCase() === target)
    if (hit) return hit.id
    if (!data?.users || data.users.length < 1000) return null
  }
  return null
}


export const submitContract = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { renderSignedContractPdf } = await import('./contract-pdf.server')
    const { CONTRACT_SCHEMAS } = await import('./contract-fields')
    const { sendAdminEmail, sendCustomerAcknowledgement } = await import('@/lib/email/send-admin.server')

    const schema = CONTRACT_SCHEMAS[data.contractType]
    if (!schema) throw new Error('Unknown contract type')

    const fd = data.formData
    const customerName = (fd.customer_name ?? '').trim().slice(0, 120)
    const customerEmail = (fd.customer_email ?? '').trim().slice(0, 200).toLowerCase()
    const customerPhone = (fd.customer_phone ?? '').trim().slice(0, 40) || null
    const eventDateRaw = (fd.event_date ?? '').trim() || null

    if (!customerName) throw new Error('Name is required')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) throw new Error('Valid email is required')

    // Enforce required fields per schema
    for (const g of schema.groups) {
      for (const f of g.fields) {
        if (f.required && !(fd[f.name] ?? '').toString().trim()) {
          throw new Error(`${f.label} is required`)
        }
        // Length cap
        if (f.maxLength && (fd[f.name] ?? '').toString().length > f.maxLength) {
          throw new Error(`${f.label} is too long`)
        }
      }
    }

    // Never persist full card numbers or CVCs — enforce at server, even if
    // client tries. Only last4 (max 4 chars) is allowed.
    if (data.contractType === 'credit-card-authorization') {
      const last4 = (fd.card_last4 ?? '').replace(/\D/g, '').slice(-4)
      if (last4.length !== 4) throw new Error('Enter the last 4 digits of your card')
      fd.card_last4 = last4
      // Strip anything that looks like a full PAN or CVC
      for (const key of Object.keys(fd)) {
        if (key === 'card_last4') continue
        const digits = String(fd[key] ?? '').replace(/\D/g, '')
        if (digits.length >= 12) {
          throw new Error('Please do not enter your full card number online — only the last 4 digits.')
        }
      }
    }

    // Build ordered field list for PDF/email
    const fields: { label: string; value: string }[] = []
    for (const g of schema.groups) {
      for (const f of g.fields) {
        const v = (fd[f.name] ?? '').toString().trim()
        if (v) fields.push({ label: f.label, value: v })
      }
    }

    const submittedAtIso = new Date().toISOString()
    const submissionId = crypto.randomUUID()

    // Upload drawn-signature PNG (if any) to private storage
    let signaturePath: string | null = null
    if (data.signaturePngDataUrl?.startsWith('data:image/png;base64,')) {
      const b64 = data.signaturePngDataUrl.slice('data:image/png;base64,'.length)
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const path = `${data.contractType}/${submissionId}/signature.png`
      const { error } = await supabaseAdmin.storage
        .from('contract-submissions')
        .upload(path, bytes, { contentType: 'image/png', upsert: false })
      if (!error) signaturePath = path
    }

    // Render PDF
    const pdfBytes = await renderSignedContractPdf({
      contractTitle: schema.title,
      agreementSummary: schema.agreementSummary,
      customerName,
      customerEmail,
      fields,
      typedSignature: data.typedSignature,
      signaturePngDataUrl: data.signaturePngDataUrl ?? null,
      submittedAtIso,
      submissionId,
    })

    const pdfPath = `${data.contractType}/${submissionId}/${data.contractType}.pdf`
    const { error: pdfErr } = await supabaseAdmin.storage
      .from('contract-submissions')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: false })
    if (pdfErr) throw new Error('Failed to save signed PDF')

    // Best-effort: link to a customer account. Prefer the signed-in caller's
    // bearer token (attach middleware forwards it); fall back to matching by
    // email in auth.users via paginated listUsers.
    let customerUserId: string | null = null
    try {
      const authHeader = getRequestHeader('authorization') ?? getRequestHeader('Authorization')
      const token = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null
      if (token) {
        const { data: userRes } = await supabaseAdmin.auth.getUser(token)
        if (userRes?.user?.id) customerUserId = userRes.user.id
      }
    } catch {
      /* noop */
    }
    if (!customerUserId) {
      try {
        customerUserId = await findAuthUserIdByEmail(supabaseAdmin, customerEmail)
      } catch {
        customerUserId = null
      }
    }

    // Persist submission row (best-effort; email is the source of truth for admin)
    await supabaseAdmin.from('contract_submissions').insert({
      id: submissionId,
      contract_type: data.contractType,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_user_id: customerUserId,
      quote_id: data.quoteId ?? null,
      event_date: eventDateRaw,
      form_data: fd,
      typed_signature: data.typedSignature,
      signature_image_path: signaturePath,
      pdf_path: pdfPath,
    })

    // 7-day signed URLs
    const { data: pdfSigned } = await supabaseAdmin.storage
      .from('contract-submissions')
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7)
    let sigSignedUrl: string | null = null
    if (signaturePath) {
      const { data: sig } = await supabaseAdmin.storage
        .from('contract-submissions')
        .createSignedUrl(signaturePath, 60 * 60 * 24 * 7)
      sigSignedUrl = sig?.signedUrl ?? null
    }

    // ============================================================
    // Quote lockstep — only when a quoteId is supplied AND the
    // signer's submitted email matches the quote's customer_email.
    // This endpoint is PUBLIC and unauthenticated; we must never let
    // an arbitrary caller mutate a quote they don't own.
    // ============================================================
    let quoteLinked = false
    let quoteTransitioned = false
    if (data.quoteId) {
      try {
        const { data: q } = await supabaseAdmin
          .from('quotes')
          .select('id, status, customer_email, customer_name, quote_request_id')
          .eq('id', data.quoteId)
          .maybeSingle()
        if (q && (q.customer_email ?? '').toLowerCase() === customerEmail) {
          quoteLinked = true
          const skipStates = new Set(['pending_confirmation', 'booked', 'completed', 'cancelled'])
          if (!skipStates.has(String(q.status))) {
            // Firm up inventory. Signing must never fail on availability.
            try {
              const { releaseQuoteHolds, reserveQuoteHolds } = await import(
                '@/lib/reservations.server'
              )
              await releaseQuoteHolds(q.id)
              await reserveQuoteHolds({
                quoteId: q.id,
                holdType: 'firm',
                expiresAt: null,
                allowOverbook: true,
              })
            } catch (e) {
              console.warn('[submitContract] firm-up holds failed', e)
            }
            // Transition the quote
            await supabaseAdmin
              .from('quotes')
              .update({ status: 'pending_confirmation' })
              .eq('id', q.id)
            // Propagate to linked quote_request (use existing 'booked' bucket)
            if (q.quote_request_id) {
              await supabaseAdmin
                .from('quote_requests')
                .update({ status: 'booked' })
                .eq('id', q.quote_request_id)
              // And the associated saved_recommendation, if any
              const { data: reqRow } = await supabaseAdmin
                .from('quote_requests')
                .select('saved_recommendation_id')
                .eq('id', q.quote_request_id)
                .maybeSingle()
              if (reqRow?.saved_recommendation_id) {
                await supabaseAdmin
                  .from('saved_recommendations')
                  .update({ status: 'booked' })
                  .eq('id', reqRow.saved_recommendation_id)
              }
            }
            quoteTransitioned = true
          }
        } else if (q) {
          console.warn('[submitContract] quote email mismatch — refusing to mutate', {
            quoteId: q.id,
          })
        }
      } catch (e) {
        console.warn('[submitContract] quote lockstep failed', e)
      }
    }

    // Notify admin (title reflects whether we advanced the quote)
    await sendAdminEmail({
      templateName: 'admin-contract-submission',
      idempotencyKey: `contract-${submissionId}`,
      templateData: {
        contractTitle: quoteTransitioned
          ? `${schema.title} — pending confirmation`
          : schema.title,
        contractType: data.contractType,
        submissionId,
        customerName,
        customerEmail,
        customerPhone: customerPhone ?? undefined,
        eventDate: eventDateRaw,
        fields,
        typedSignature: data.typedSignature,
        pdfUrl: pdfSigned?.signedUrl ?? null,
        signatureUrl: sigSignedUrl,
        submittedAt: new Date(submittedAtIso).toLocaleString(),
      },
    })

    // Customer acknowledgement — only when we actually transitioned a matched
    // quote; skip when the submission was not linked or was already advanced,
    // to avoid duplicate/misleading emails.
    if (quoteTransitioned) {
      try {
        await sendCustomerAcknowledgement({
          requestId: submissionId,
          recipient: customerEmail,
          customerName: customerName || null,
          eventType: null,
          eventDate: eventDateRaw,
          eventLocation: null,
          requestType: 'rental',
        })
      } catch (e) {
        console.warn('[submitContract] customer ack failed', e)
      }
    }

    return { ok: true as const, submissionId, quoteLinked, quoteTransitioned }
  })
