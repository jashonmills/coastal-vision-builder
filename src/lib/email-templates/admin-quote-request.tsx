import React from 'react'
import {
  Body,
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

interface Pick {
  category: string
  item_name: string
  quantity: number
  reason?: string
}

interface Props {
  requestId?: string
  requestType?: 'rental' | 'venue'
  customerName?: string
  customerEmail?: string
  customerPhone?: string | null
  preferredContact?: string
  eventType?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  guestCount?: number | null
  customerNote?: string | null
  venue?: string | null
  headline?: string | null
  recommendedTent?: string | null
  layoutCaption?: string | null
  picks?: Pick[]
  weatherNotes?: string[]
  savedRecommendationId?: string | null
  adminUrl?: string
}

function formatDate(d?: string | null): string {
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

const Email = ({
  requestId,
  requestType = 'rental',
  customerName,
  customerEmail,
  customerPhone,
  preferredContact,
  eventType,
  eventDate,
  eventLocation,
  guestCount,
  customerNote,
  venue,
  headline,
  recommendedTent,
  layoutCaption,
  picks,
  weatherNotes,
  adminUrl,
}: Props) => {
  const isVenue = requestType === 'venue'
  const picksByCat = new Map<string, Pick[]>()
  for (const p of picks ?? []) {
    const arr = picksByCat.get(p.category) ?? []
    arr.push(p)
    picksByCat.set(p.category, arr)
  }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`New ${isVenue ? 'venue inquiry' : 'quote request'} from ${customerName ?? 'a customer'}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            New {isVenue ? 'Venue Inquiry' : 'Quote Request'}
          </Heading>
          <Text style={lede}>
            {customerName ?? 'A customer'} just submitted a request through
            pacificnorthrentals.com.
          </Text>

          <Section style={card}>
            <Heading as="h2" style={h2}>Customer</Heading>
            <Row label="Name" value={customerName} />
            <Row label="Email" value={customerEmail} />
            <Row label="Phone" value={customerPhone ?? undefined} />
            <Row label="Preferred contact" value={preferredContact} />
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Event</Heading>
            {isVenue && <Row label="Venue" value={venue === 'beacon-on-broadway' ? 'Beacon on Broadway' : venue ?? undefined} />}
            <Row label="Event type" value={eventType ?? undefined} />
            <Row label="Event date" value={formatDate(eventDate)} />
            <Row label="Location" value={eventLocation ?? undefined} />
            <Row label="Guest count" value={guestCount ? String(guestCount) : undefined} />
          </Section>

          {customerNote && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Customer note</Heading>
              <Text style={noteText}>{customerNote}</Text>
            </Section>
          )}

          {(headline || recommendedTent || (picks && picks.length > 0)) && (
            <>
              <Hr style={hr} />
              <Section style={card}>
                <Heading as="h2" style={h2}>AI Planner Recommendation</Heading>
                {headline && <Row label="Headline" value={headline} />}
                {recommendedTent && <Row label="Recommended tent" value={recommendedTent} />}
                {layoutCaption && <Row label="Layout" value={layoutCaption} />}

                {picksByCat.size > 0 && (
                  <>
                    <Text style={sectionLabel}>Equipment checklist</Text>
                    {Array.from(picksByCat.entries()).map(([cat, list]) => (
                      <div key={cat} style={{ marginBottom: '10px' }}>
                        <Text style={catLabel}>{cat}</Text>
                        {list.map((p, i) => (
                          <Text key={i} style={pickLine}>
                            • {p.quantity}× {p.item_name}
                            {p.reason ? ` — ${p.reason}` : ''}
                          </Text>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {weatherNotes && weatherNotes.length > 0 && (
                  <>
                    <Text style={sectionLabel}>Weather / setup notes</Text>
                    {weatherNotes.map((n, i) => (
                      <Text key={i} style={pickLine}>• {n}</Text>
                    ))}
                  </>
                )}
              </Section>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Request ID: {requestId ?? '—'}
            {adminUrl ? ` · View in admin: ${adminUrl}` : ''}
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

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const p = data as Props
    const parts = [
      p.requestType === 'venue' ? 'Venue Inquiry' : 'Quote Request',
      p.eventType,
      p.guestCount ? `${p.guestCount} guests` : null,
      p.eventDate ? formatDate(p.eventDate) : null,
    ].filter(Boolean)
    return `New ${parts.join(' · ')}`
  },
  displayName: 'Admin: Quote Request',
  previewData: {
    requestId: '00000000-0000-0000-0000-000000000000',
    requestType: 'rental',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '(555) 123-4567',
    preferredContact: 'email',
    eventType: 'Wedding',
    eventDate: '2026-08-15',
    eventLocation: 'Seaside, OR',
    guestCount: 120,
    customerNote: 'Reception under a tent on the lawn.',
  } satisfies Props,
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '620px', margin: '0 auto', padding: '32px 24px' }
const h1 = { color: '#0f2c4a', fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }
const h2 = { color: '#0f2c4a', fontSize: '15px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const lede = { color: '#4a5568', fontSize: '15px', lineHeight: '22px', margin: '0 0 20px' }
const card = { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px', margin: '0 0 14px' }
const rowStyle = { fontSize: '14px', lineHeight: '20px', margin: '4px 0', color: '#1f2937' }
const rowLabel = { color: '#6b7280', fontWeight: 600 }
const rowValue = { color: '#111827' }
const noteText = { fontSize: '14px', lineHeight: '22px', color: '#1f2937', whiteSpace: 'pre-wrap' as const, margin: 0 }
const sectionLabel = { fontSize: '13px', fontWeight: 700, color: '#0f2c4a', margin: '14px 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const catLabel = { fontSize: '13px', fontWeight: 700, color: '#0f2c4a', margin: '8px 0 2px' }
const pickLine = { fontSize: '13px', lineHeight: '19px', color: '#1f2937', margin: '2px 0 2px 6px' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }
