/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminDeliveryAlertProps {
  affectedEmail?: string
  eventType?: string
  reason?: string
  templateName?: string
  invoiceNumber?: string
  occurredAt?: string
}

const AdminDeliveryAlertEmail = ({
  affectedEmail = '',
  eventType = 'bounce',
  reason = '',
  templateName = '',
  invoiceNumber = '',
  occurredAt = '',
}: AdminDeliveryAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Email delivery problem: ${affectedEmail}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Email delivery problem</Heading>
        <Text style={text}>
          An email to a customer could not be delivered. They will not receive
          it, so please follow up manually (for example, by sending the invoice
          from another address or asking for a different email).
        </Text>
        <Text style={meta}>
          <strong>Recipient:</strong> {affectedEmail}
          <br />
          <strong>Event:</strong> {eventType}
          {reason ? (
            <>
              <br />
              <strong>Reason:</strong> {reason}
            </>
          ) : null}
          {templateName ? (
            <>
              <br />
              <strong>Email type:</strong> {templateName}
            </>
          ) : null}
          {invoiceNumber ? (
            <>
              <br />
              <strong>Invoice:</strong> {invoiceNumber}
            </>
          ) : null}
          {occurredAt ? (
            <>
              <br />
              <strong>When:</strong> {occurredAt}
            </>
          ) : null}
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Automatic alert from LN-RADS Certification.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminDeliveryAlertEmail,
  subject: (data: Record<string, any>) =>
    `Email ${data?.eventType ?? 'delivery'} problem: ${data?.affectedEmail ?? ''}`.trim(),
  displayName: 'Admin delivery alert',
  to: 'cert@lnrads.com',
  previewData: {
    affectedEmail: 'buyer@o2.pl',
    eventType: 'bounce',
    reason: 'Permanent bounce — address invalid or rejected',
    templateName: 'invoice-issued',
    invoiceNumber: 'FV EDU/7/08/2026',
    occurredAt: '2026-08-11 15:26 UTC',
  },
} satisfies TemplateEntry

export default AdminDeliveryAlertEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '32px 28px', borderTop: '4px solid hsl(0, 72%, 45%)' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 16%, 47%)',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const meta = {
  fontSize: '14px',
  color: 'hsl(215, 25%, 15%)',
  lineHeight: '1.7',
  backgroundColor: '#f5f7f7',
  borderRadius: '4px',
  padding: '14px 16px',
  margin: '0 0 24px',
}
const hr = { borderColor: '#eeeeee', margin: '30px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
