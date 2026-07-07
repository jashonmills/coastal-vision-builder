import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LineItem {
  category?: string | null
  name: string
  description?: string | null
  quantity: number
  unit?: string | null
  unit_price_cents: number
  line_total_cents: number
}

interface Props {
  customerName?: string
  quoteNumber?: string
  coverLetter?: string
  eventType?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  guestCount?: number | null
  items?: LineItem[]
  subtotalCents?: number
  deliveryCents?: number
  cleaningCents?: number
  discountCents?: number
  taxCents?: number
  totalCents?: number
  viewUrl?: string
  senderName?: string
}

function fmtDate(d?: string | null): string {
  if (!d) return 'TBD'
  const parsed = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function money(cents: number | undefined | null): string {
  const n = ((cents ?? 0) / 100)
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

const Email = ({
  customerName,
  quoteNumber,
  coverLetter,
  eventType,
  eventDate,
  eventLocation,
  guestCount,
  items = [],
  subtotalCents = 0,
  deliveryCents = 0,
  cleaningCents = 0,
  discountCents = 0,
  taxCents = 0,
  totalCents = 0,
  viewUrl,
  senderName = 'Pacific North Events & Tents',
}: Props) => {
  const paragraphs = (coverLetter ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your quote ${quoteNumber ?? ''} from ${senderName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{senderName}</Heading>
          {quoteNumber && <Text style={quoteRef}>Quote {quoteNumber}</Text>}

          <Section style={{ margin: '20px 0' }}>
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <Text key={i} style={letterText}>
                  {p.split('\n').map((line, j, arr) => (
                    <React.Fragment key={j}>
                      {line}
                      {j < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </Text>
              ))
            ) : (
              <Text style={letterText}>Hi {customerName ?? 'there'}, please find your quote below.</Text>
            )}
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Event details</Heading>
            <Row label="Event" value={eventType ?? undefined} />
            <Row label="Date" value={fmtDate(eventDate)} />
            <Row label="Location" value={eventLocation ?? undefined} />
            <Row label="Guests" value={guestCount ? String(guestCount) : undefined} />
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Line items</Heading>
            <table cellPadding={0} cellSpacing={0} border={0} width="100%" style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Item</th>
                  <th style={{ ...th, textAlign: 'right', width: '48px' }}>Qty</th>
                  <th style={{ ...th, textAlign: 'right', width: '80px' }}>Unit</th>
                  <th style={{ ...th, textAlign: 'right', width: '90px' }}>Line</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td style={td}>
                      <div style={itemName}>{it.name}</div>
                      {it.category && <div style={itemMeta}>{it.category}</div>}
                      {it.description && <div style={itemMeta}>{it.description}</div>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{it.quantity}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{money(it.unit_price_cents)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(it.line_total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Hr style={hr} />
            <TotalsRow label="Subtotal" value={money(subtotalCents)} />
            {deliveryCents ? <TotalsRow label="Delivery" value={money(deliveryCents)} /> : null}
            {cleaningCents ? <TotalsRow label="Cleaning" value={money(cleaningCents)} /> : null}
            {discountCents ? <TotalsRow label="Discount" value={`-${money(discountCents)}`} /> : null}
            {taxCents ? <TotalsRow label="Tax" value={money(taxCents)} /> : null}
            <TotalsRow label="Total" value={money(totalCents)} bold />
          </Section>

          {viewUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={viewUrl} style={cta}>View full quote</Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            {senderName} · pacificnorthrentals.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <Text style={rowStyle}>
      <span style={rowLabel}>{label}: </span>
      <span style={rowValue}>{value}</span>
    </Text>
  )
}

function TotalsRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} width="100%">
      <tbody>
        <tr>
          <td style={{ ...totalsLabel, fontWeight: bold ? 700 : 500 }}>{label}</td>
          <td style={{ ...totalsValue, fontWeight: bold ? 700 : 500 }}>{value}</td>
        </tr>
      </tbody>
    </table>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    if (typeof data.subject === 'string' && data.subject.trim()) return data.subject.trim()
    const p = data as Props
    return `Your Pacific North Events Quote${p.quoteNumber ? ' ' + p.quoteNumber : ''}`
  },
  displayName: 'Customer: Quote',
  previewData: {
    customerName: 'Jane Doe',
    quoteNumber: 'Q-2026-0006',
    coverLetter:
      "Hi Jane,\n\nThank you for considering Pacific North Events & Tents for your upcoming event. Please find your quote details below.\n\nLet us know if you have any questions — we're happy to adjust anything.\n\n— Pacific North Events & Tents",
    eventType: 'Wedding',
    eventDate: '2026-08-15',
    eventLocation: 'Seaside, OR',
    guestCount: 120,
    items: [
      { category: 'Canopy', name: '20×40 Canopy', quantity: 1, unit: 'each', unit_price_cents: 120000, line_total_cents: 120000 },
      { category: 'Chairs', name: 'Folding Chair - White', quantity: 132, unit: 'each', unit_price_cents: 300, line_total_cents: 39600 },
    ],
    subtotalCents: 159600,
    totalCents: 159600,
    viewUrl: 'https://example.com',
  } satisfies Props,
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }
const h1 = { color: '#0f2c4a', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }
const h2 = { color: '#0f2c4a', fontSize: '14px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const quoteRef = { color: '#6b7280', fontSize: '13px', margin: '0 0 12px', fontFamily: 'Menlo, Consolas, monospace' }
const letterText = { color: '#1f2937', fontSize: '15px', lineHeight: '23px', margin: '0 0 12px', whiteSpace: 'pre-wrap' as const }
const card = { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px', margin: '0 0 14px' }
const rowStyle = { fontSize: '14px', lineHeight: '20px', margin: '4px 0', color: '#1f2937' }
const rowLabel = { color: '#6b7280', fontWeight: 600 }
const rowValue = { color: '#111827' }
const table = { borderCollapse: 'collapse' as const, width: '100%' }
const th = { fontSize: '11px', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb', padding: '6px 4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const td = { fontSize: '13px', color: '#1f2937', borderBottom: '1px solid #f3f4f6', padding: '8px 4px', verticalAlign: 'top' as const }
const itemName = { fontWeight: 600, color: '#111827' }
const itemMeta = { fontSize: '12px', color: '#6b7280', marginTop: '2px' }
const totalsLabel = { fontSize: '14px', color: '#4b5563', padding: '4px 4px', textAlign: 'left' as const }
const totalsValue = { fontSize: '14px', color: '#111827', padding: '4px 4px', textAlign: 'right' as const }
const hr = { borderColor: '#e5e7eb', margin: '14px 0' }
const cta = { backgroundColor: '#0f2c4a', color: '#ffffff', padding: '12px 24px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' as const }
