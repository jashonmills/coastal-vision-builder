import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
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
  recommendationId?: string
  title?: string
  customerName?: string | null
  customerEmail?: string | null
  eventType?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  guestCount?: number | null
  headline?: string | null
  recommendedTent?: string | null
  tentSize?: string | null
  layoutCaption?: string | null
  picks?: Pick[]
  weatherNotes?: string[]
  blueprintImage?: string | null
  perspectiveImage?: string | null
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
  recommendationId,
  title,
  customerName,
  customerEmail,
  eventType,
  eventDate,
  eventLocation,
  guestCount,
  headline,
  recommendedTent,
  tentSize,
  layoutCaption,
  picks,
  weatherNotes,
  blueprintImage,
  perspectiveImage,
  adminUrl,
}: Props) => {
  const picksByCat = new Map<string, Pick[]>()
  for (const p of picks ?? []) {
    const arr = picksByCat.get(p.category) ?? []
    arr.push(p)
    picksByCat.set(p.category, arr)
  }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`New AI Tent Plan: ${headline ?? title ?? 'saved plan'}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New AI Tent Plan Saved</Heading>
          <Text style={lede}>
            {customerName ? `${customerName} ` : 'A customer '}just saved a plan
            with the AI Tent Planner.
          </Text>

          <Section style={card}>
            <Heading as="h2" style={h2}>Customer</Heading>
            <Row label="Name" value={customerName ?? undefined} />
            <Row label="Email" value={customerEmail ?? undefined} />
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Event</Heading>
            <Row label="Event type" value={eventType ?? undefined} />
            <Row label="Event date" value={formatDate(eventDate)} />
            <Row label="Location" value={eventLocation ?? undefined} />
            <Row label="Guest count" value={guestCount ? String(guestCount) : undefined} />
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Recommendation</Heading>
            <Row label="Headline" value={headline ?? undefined} />
            <Row label="Recommended tent" value={recommendedTent ?? undefined} />
            <Row label="Tent size" value={tentSize ?? undefined} />
            <Row label="Layout" value={layoutCaption ?? undefined} />
          </Section>

          {picksByCat.size > 0 && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Equipment checklist</Heading>
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
            </Section>
          )}

          {weatherNotes && weatherNotes.length > 0 && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Weather / setup notes</Heading>
              {weatherNotes.map((n, i) => (
                <Text key={i} style={pickLine}>• {n}</Text>
              ))}
            </Section>
          )}

          {blueprintImage && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Blueprint</Heading>
              <Img src={blueprintImage} alt="Blueprint" style={imgStyle} />
            </Section>
          )}

          {perspectiveImage && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Perspective render</Heading>
              <Img src={perspectiveImage} alt="Perspective render" style={imgStyle} />
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Plan ID: {recommendationId ?? '—'}
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
      'AI Tent Plan',
      p.eventType,
      p.guestCount ? `${p.guestCount} guests` : null,
      p.eventDate ? formatDate(p.eventDate) : null,
    ].filter(Boolean)
    return `New ${parts.join(' · ')}`
  },
  displayName: 'Admin: AI Planner Submission',
  previewData: {
    recommendationId: '00000000-0000-0000-0000-000000000000',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    eventType: 'Wedding',
    eventDate: '2026-08-15',
    eventLocation: 'Seaside, OR',
    guestCount: 120,
    headline: 'Coastal Elegance for 120',
    recommendedTent: '40x60 Frame Tent',
    tentSize: '40x60',
    layoutCaption: 'Rounds for dining with dance floor centered',
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
const catLabel = { fontSize: '13px', fontWeight: 700, color: '#0f2c4a', margin: '8px 0 2px' }
const pickLine = { fontSize: '13px', lineHeight: '19px', color: '#1f2937', margin: '2px 0 2px 6px' }
const imgStyle = { width: '100%', maxWidth: '560px', height: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }
