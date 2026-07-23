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

interface Props {
  customerName?: string | null
  eventType?: string | null
  eventDate?: string | null
  eventLocation?: string | null
  requestType?: 'rental' | 'beacon' | 'catering' | 'planner' | 'venue' | null
  senderName?: string
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null
  const parsed = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function describeEvent(props: Props): string {
  const type =
    props.requestType === 'beacon' || props.requestType === 'venue'
      ? 'event at Beacon on Broadway'
      : props.requestType === 'catering'
        ? 'catering event'
        : props.requestType === 'planner'
          ? (props.eventType || 'event')
          : (props.eventType || 'event')
  const date = fmtDate(props.eventDate)
  const loc = props.eventLocation && props.requestType !== 'beacon' && props.requestType !== 'venue'
    ? ` in ${props.eventLocation}`
    : ''
  return `your ${type}${date ? ' on ' + date : ''}${loc}`
}

const Email = ({
  customerName,
  senderName = 'Pacific North Events & Tents',
  ...rest
}: Props) => {
  const eventPhrase = describeEvent({ customerName, senderName, ...rest })
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Thanks for reaching out to ${senderName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{senderName}</Heading>

          <Section style={{ margin: '20px 0' }}>
            <Text style={letterText}>Hi {customerName || 'there'},</Text>
            <Text style={letterText}>
              Thanks for reaching out to {senderName} about {eventPhrase}.
            </Text>
            <Text style={letterText}>
              We're preparing your quote now and will follow up shortly. In the meantime,
              feel free to reply with any questions.
            </Text>
            <Text style={letterText}>
              Tip: create a free account to track your quote and sign your rental contract online — we'll link this request to your account automatically.
            </Text>
            <Section style={{ margin: '8px 0 16px' }}>
              <Button href="https://pacificnorthrentals.com/login?mode=signup" style={ctaButton}>
                Create your account
              </Button>
            </Section>
            <Text style={letterText}>— {senderName}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            {senderName} · pacificnorthrentals.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: () => 'Your Pacific North Events Quote Request',
  displayName: 'Customer: Request Acknowledgement',
  previewData: {
    customerName: 'Jane Doe',
    eventType: 'Festival',
    eventDate: '2026-08-19',
    eventLocation: 'Seaside, Oregon',
    requestType: 'rental',
  } satisfies Props,
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }
const h1 = { color: '#0f2c4a', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }
const letterText = { color: '#1f2937', fontSize: '15px', lineHeight: '23px', margin: '0 0 12px' }
const hr = { borderColor: '#e5e7eb', margin: '14px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' as const }
const ctaButton = { backgroundColor: '#0f2c4a', color: '#ffffff', padding: '10px 20px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
