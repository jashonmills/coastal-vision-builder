import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface FieldRow { label: string; value: string }

interface Props {
  contractTitle?: string
  contractType?: string
  submissionId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  eventDate?: string | null
  fields?: FieldRow[]
  typedSignature?: string
  pdfUrl?: string | null
  signatureUrl?: string | null
  submittedAt?: string
}

const Email = ({
  contractTitle,
  contractType,
  submissionId,
  customerName,
  customerEmail,
  customerPhone,
  eventDate,
  fields,
  typedSignature,
  pdfUrl,
  signatureUrl,
  submittedAt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Signed ${contractTitle ?? 'contract'} from ${customerName ?? 'a customer'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Signed contract received</Heading>
        <Text style={lede}>
          {customerName ?? 'A customer'} just completed and signed the{' '}
          <strong>{contractTitle ?? contractType ?? 'contract'}</strong> on pacificnorthrentals.com.
        </Text>

        {pdfUrl && (
          <Section style={cta}>
            <Link href={pdfUrl} style={ctaBtn}>Download signed PDF</Link>
            <Text style={ctaHint}>Link expires in 7 days.</Text>
          </Section>
        )}

        <Section style={card}>
          <Heading as="h2" style={h2}>Customer</Heading>
          <Row label="Name" value={customerName} />
          <Row label="Email" value={customerEmail} />
          <Row label="Phone" value={customerPhone} />
          {eventDate && <Row label="Event date" value={eventDate} />}
        </Section>

        {fields && fields.length > 0 && (
          <Section style={card}>
            <Heading as="h2" style={h2}>Contract details</Heading>
            {fields.map((f, i) => (
              <Row key={i} label={f.label} value={f.value} />
            ))}
          </Section>
        )}

        <Section style={card}>
          <Heading as="h2" style={h2}>Signature</Heading>
          <Row label="Typed signature" value={typedSignature} />
          {signatureUrl && (
            <Text style={rowStyle}>
              <span style={rowLabel}>Drawn signature: </span>
              <Link href={signatureUrl} style={{ color: '#0f2c4a' }}>View image</Link>
            </Text>
          )}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Submission ID: {submissionId ?? '—'}
          {submittedAt ? ` · Submitted ${submittedAt}` : ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <Text style={rowStyle}>
      <span style={rowLabel}>{label}: </span>
      <span style={rowValue}>{value}</span>
    </Text>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const p = data as Props
    return `Signed: ${p.contractTitle ?? 'Contract'} — ${p.customerName ?? 'Customer'}`
  },
  displayName: 'Admin: Signed Contract',
  previewData: {
    contractTitle: 'Rental Contract',
    contractType: 'rental-contract',
    submissionId: '00000000-0000-0000-0000-000000000000',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '(555) 123-4567',
    eventDate: '2026-08-15',
    fields: [
      { label: 'Event location', value: 'Seaside, OR' },
      { label: 'Delivery date', value: '2026-08-14' },
    ],
    typedSignature: 'Jane Doe',
  } satisfies Props,
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '620px', margin: '0 auto', padding: '32px 24px' }
const h1 = { color: '#0f2c4a', fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }
const h2 = { color: '#0f2c4a', fontSize: '15px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const lede = { color: '#4a5568', fontSize: '15px', lineHeight: '22px', margin: '0 0 20px' }
const card = { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px', margin: '0 0 14px' }
const cta = { textAlign: 'center' as const, margin: '0 0 20px' }
const ctaBtn = { display: 'inline-block', backgroundColor: '#c99a3b', color: '#1a1a1a', padding: '12px 22px', borderRadius: '9999px', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }
const ctaHint = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }
const rowStyle = { fontSize: '14px', lineHeight: '20px', margin: '4px 0', color: '#1f2937' }
const rowLabel = { color: '#6b7280', fontWeight: 600 }
const rowValue = { color: '#111827' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }
