import type { ComponentType } from 'react'
import { template as adminQuoteRequest } from './admin-quote-request'
import { template as adminPlannerSubmission } from './admin-planner-submission'
import { template as customerQuote } from './customer-quote'
import { template as customerRequestAcknowledgement } from './customer-request-acknowledgement'
import { template as adminContractSubmission } from './admin-contract-submission'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-quote-request': adminQuoteRequest,
  'admin-planner-submission': adminPlannerSubmission,
  'customer-quote': customerQuote,
  'customer-request-acknowledgement': customerRequestAcknowledgement,
  'admin-contract-submission': adminContractSubmission,
}
