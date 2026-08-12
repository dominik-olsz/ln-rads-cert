/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface InvoiceIssuedProps {
  invoiceNumber?: string
  docType?: string
  amount?: string
  description?: string
  downloadUrl?: string
  buyerName?: string
  originalInvoiceNumber?: string
  correctedTotal?: string
}

const SITE = 'LN-RADS Certification'
// Every link in our email must stay on the canonical app domain.
const CANONICAL_PAYMENTS_URL = 'https://cert.lnrads.com/payments'

// Deliberately plain, document-style markup. o2.pl / wp.pl rejected the earlier
// version as spam (554 5.3.0) because of the coloured call-to-action button,
// the shaded amount box and the invisible preview-padding block that
// <Preview> emits. Keep this template free of those elements.
const InvoiceIssuedEmail = ({
  invoiceNumber = '',
  docType = 'FV',
  amount = '',
  description = '',
  downloadUrl = CANONICAL_PAYMENTS_URL,
  buyerName = '',
  originalInvoiceNumber = '',
  correctedTotal = '',
}: InvoiceIssuedProps) => {
  const isCorrection = docType === 'FK'
  const title = isCorrection ? 'Your correction invoice' : 'Your VAT invoice'
  const href = downloadUrl.startsWith('https://cert.lnrads.com')
    ? downloadUrl
    : CANONICAL_PAYMENTS_URL

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>

          <Text style={text}>{buyerName ? `Hello ${buyerName},` : 'Hello,'}</Text>

          <Text style={text}>
            {isCorrection
              ? originalInvoiceNumber
                ? `A correction invoice has been issued: ${invoiceNumber} correcting ${originalInvoiceNumber}.`
                : `A correction invoice has been issued: ${invoiceNumber}.`
              : 'Thank you for your purchase. Your VAT invoice is ready.'}
          </Text>

          <Text style={text}>
            {isCorrection ? 'Correction number' : 'Invoice number'}: {invoiceNumber}
            {isCorrection && originalInvoiceNumber ? (
              <>
                <br />
                Corrected document: {originalInvoiceNumber}
              </>
            ) : null}
            {description ? (
              <>
                <br />
                Item: {description}
              </>
            ) : null}
            {amount ? (
              <>
                <br />
                {isCorrection ? 'Corrected amount' : 'Total'}: {amount}
              </>
            ) : null}
            {isCorrection && correctedTotal ? (
              <>
                <br />
                Total after correction: {correctedTotal}
              </>
            ) : null}
          </Text>

          <Text style={text}>
            {isCorrection
              ? 'Both the invoice and the correction are available for download here:'
              : 'You can download the invoice document here:'}
            <br />
            <Link href={href} style={link}>
              {href}
            </Link>
          </Text>

          <Text style={text}>
            That page lists {isCorrection ? 'this correction' : 'this invoice'} and
            all your earlier documents in {SITE}. You may be asked to sign in
            first. The PDF is also sent to you separately by our invoicing
            system.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Praktyka Lekarska Cezary Chudobiński. Questions? Reply to this
            message or write to cert@lnrads.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InvoiceIssuedEmail,
  subject: (data: Record<string, any>) =>
    `${data?.docType === 'FK' ? 'Correction invoice' : 'Invoice'} ${data?.invoiceNumber ?? ''}`.trim(),
  displayName: 'Invoice issued',
  previewData: {
    invoiceNumber: 'FV EDU/6/08/2026',
    docType: 'FV',
    amount: '59.04 EUR',
    description: 'LN-RADS Certification',
    downloadUrl: CANONICAL_PAYMENTS_URL,
    buyerName: 'Dominik Olszewski',
  },
} satisfies TemplateEntry

export default InvoiceIssuedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 24px' }
const h1 = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#1a2430',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: '#00534f', fontSize: '14px' }
const hr = { borderColor: '#dddddd', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#777777', margin: '0' }
