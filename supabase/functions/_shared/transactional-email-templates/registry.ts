/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { template as invoiceIssued } from './invoice-issued.tsx'
import { template as adminDeliveryAlert } from './admin-delivery-alert.tsx'

export type TemplateEntry = {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'invoice-issued': invoiceIssued,
  'admin-delivery-alert': adminDeliveryAlert,
}
