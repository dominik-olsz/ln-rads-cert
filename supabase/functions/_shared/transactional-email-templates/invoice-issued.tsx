/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
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
}

const SITE = 'LN-RADS Certification'

const InvoiceIssuedEmail = ({
  invoiceNumber = '',
  docType = 'FV',
  amount = '',
  description = '',
  downloadUrl = 'https://cert.lnrads.com/payments',
  buyerName = '',
}: InvoiceIssuedProps) => {
  const isCorrection = docType === 'FK'
  const title = isCorrection ? 'Your correction invoice' : 'Your VAT invoice'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${title} ${invoiceNumber}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>
            {buyerName ? `Hello ${buyerName},` : 'Hello,'}
          </Text>
          <Text style={text}>
            {isCorrection
              ? 'A correction invoice has been issued for your purchase.'
              : 'Thank you for your purchase. Your VAT invoice is ready.'}
          </Text>

          <Text style={meta}>
            <strong>Invoice:</strong> {invoiceNumber}
            {description ? (
              <>
                <br />
                <strong>Item:</strong> {description}
              </>
            ) : null}
            {amount ? (
              <>
                <br />
                <strong>Total:</strong> {amount}
              </>
            ) : null}
          </Text>

          <Button style={button} href={downloadUrl}>
            Download invoice
          </Button>

          <Text style={text}>
            The link opens <em>My payments</em> in {SITE}, where you can download
            this invoice and all your previous ones at any time. You may be asked
            to sign in first.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Praktyka Lekarska Cezary Chudobiński · Questions? Reply to this email
            or write to cert@lnrads.com.
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
    downloadUrl: 'https://cert.lnrads.com/payments',
    buyerName: 'Dominik Olszewski',
  },
} satisfies TemplateEntry

export default InvoiceIssuedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '32px 28px', borderTop: '4px solid hsl(178, 100%, 16%)' }
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
const button = {
  backgroundColor: 'hsl(178, 100%, 16%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '4px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const hr = { borderColor: '#eeeeee', margin: '30px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
