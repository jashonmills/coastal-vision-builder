import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { SiteLayout } from '@/components/SiteLayout'
import { SignaturePad } from '@/components/contracts/SignaturePad'
import { CONTRACT_SCHEMAS, type ContractField, type ContractFieldGroup } from '@/lib/contracts/contract-fields'
import { submitContract } from '@/lib/contracts/submit.functions'
import { contracts } from '@/data/contracts'
import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/rental-contract/fill/$contractId')({
  component: FillContractPage,
  loader: ({ params }) => {
    const schema = CONTRACT_SCHEMAS[params.contractId]
    if (!schema) throw notFound()
    return { schema }
  },
  head: ({ params }) => {
    const schema = CONTRACT_SCHEMAS[params.contractId]
    const title = schema ? `Sign ${schema.title} — Pacific North Events & Tents` : 'Sign contract'
    return {
      meta: [
        { title },
        {
          name: 'description',
          content:
            'Fill out and electronically sign your Pacific North Events & Tents contract online — a signed PDF is emailed to our team automatically.',
        },
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
})

function FillContractPage() {
  const { schema } = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const submit = useServerFn(submitContract)
  const doc = contracts.find((c) => c.id === params.contractId)

  const [values, setValues] = useState<Record<string, string>>({})
  const [typedSig, setTypedSig] = useState('')
  const [drawnSig, setDrawnSig] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function setField(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!agree) {
      setError('Please confirm you agree to the contract terms.')
      return
    }
    if (typedSig.trim().length < 2) {
      setError('Please type your full legal name as your signature.')
      return
    }
    if (!drawnSig) {
      setError('Please draw your signature in the box.')
      return
    }
    setSubmitting(true)
    try {
      await submit({
        data: {
          contractType: params.contractId as any,
          formData: values,
          typedSignature: typedSig.trim(),
          signaturePngDataUrl: drawnSig,
        },
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-6 font-serif text-3xl">Contract signed and sent</h1>
          <p className="mt-3 text-muted-foreground">
            Thanks, {values.customer_name || 'there'}! We received your signed{' '}
            {schema.title.toLowerCase()} and emailed a copy to our team. We'll follow up shortly to confirm.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/rental-contract"
              className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
            >
              Back to contracts
            </Link>
            <button
              type="button"
              onClick={() => navigate({ to: '/' })}
              className="rounded-full bg-[color:var(--gold)] px-5 py-2 text-sm font-medium text-[color:var(--ink-on-gold,#1a1a1a)] hover:opacity-90"
            >
              Return home
            </button>
          </div>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <div className="bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sign online</p>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl">{schema.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{schema.agreementSummary}</p>
            {doc && (
              <Link
                to="/rental-contract"
                hash={doc.id}
                className="mt-4 inline-flex items-center gap-2 text-sm text-[color:var(--gold)] underline"
              >
                <FileText className="h-4 w-4" /> Read the full contract text
              </Link>
            )}
          </div>
        </header>

        <form onSubmit={onSubmit} className="mx-auto max-w-3xl px-6 py-10">
          {schema.groups.map((g: ContractFieldGroup) => (
            <fieldset key={g.heading} className="mb-8 rounded-2xl border border-border bg-card p-6">
              <legend className="px-2 text-sm font-semibold uppercase tracking-widest text-[color:var(--gold)]">
                {g.heading}
              </legend>
              <div className="grid gap-5 md:grid-cols-2">
                {g.fields.map((f: ContractField) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    value={values[f.name] ?? ''}
                    onChange={(v) => setField(f.name, v)}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset className="mb-8 rounded-2xl border border-border bg-card p-6">
            <legend className="px-2 text-sm font-semibold uppercase tracking-widest text-[color:var(--gold)]">
              Signature
            </legend>
            <label className="block">
              <span className="text-sm font-medium">Type your full legal name</span>
              <input
                value={typedSig}
                onChange={(e) => setTypedSig(e.target.value)}
                required
                maxLength={120}
                className="mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 font-serif text-lg italic"
                placeholder="Your legal name"
              />
            </label>
            <div className="mt-6">
              <SignaturePad value={drawnSig} onChange={setDrawnSig} />
            </div>
            <label className="mt-6 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                I have read and agree to the terms of the {schema.title.toLowerCase()}. I understand that
                typing my name and drawing my signature above has the same legal effect as a handwritten
                signature.
              </span>
            </label>
          </fieldset>

          {error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Submissions are encrypted in transit and stored privately.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-[color:var(--ink-on-gold,#1a1a1a)] shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Sign & submit contract'}
            </button>
          </div>
        </form>
      </div>
    </SiteLayout>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ContractField
  value: string
  onChange: (v: string) => void
}) {
  const common = {
    id: field.name,
    name: field.name,
    required: field.required,
    maxLength: field.maxLength,
    placeholder: field.placeholder,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
    className:
      'mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40',
  }
  const wide = field.type === 'textarea' || field.name.includes('address') || field.name.includes('rental_items') || field.name.includes('menu_selection')

  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea {...common} rows={3} />
      ) : field.type === 'select' ? (
        <select {...common}>
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={field.type} />
      )}
      {field.helpText && <span className="mt-1 block text-xs text-muted-foreground">{field.helpText}</span>}
    </label>
  )
}
