import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { draftQuoteCoverLetter, sendQuoteEmail } from "@/lib/quote-email.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  onSent?: () => void;
}

export function EmailCustomerDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  customerName,
  customerEmail,
  totalCents,
  onSent,
}: Props) {
  const draftFn = useServerFn(draftQuoteCoverLetter);
  const sendFn = useServerFn(sendQuoteEmail);

  const [to, setTo] = useState(customerEmail);
  const [subject, setSubject] = useState(`Your Pacific North Events Quote ${quoteNumber}`);
  const [letter, setLetter] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  async function loadDraft() {
    setDrafting(true);
    try {
      const res = await draftFn({ data: { quote_id: quoteId } });
      setSubject(res.subject);
      setLetter(res.coverLetter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to draft cover letter.");
    } finally {
      setDrafting(false);
    }
  }

  useEffect(() => {
    if (open && !letter) {
      void loadDraft();
    }
    if (open) {
      setTo(customerEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSend() {
    if (!to || !subject.trim() || !letter.trim()) {
      toast.error("Please fill in recipient, subject, and cover letter.");
      return;
    }
    setSending(true);
    try {
      await sendFn({
        data: {
          quote_id: quoteId,
          to_email: to,
          subject: subject.trim(),
          cover_letter: letter.trim(),
        },
      });
      toast.success(`Quote emailed to ${to}.`);
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email Customer
          </DialogTitle>
          <DialogDescription>
            Send quote {quoteNumber} directly to the customer. Total ${(totalCents / 100).toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cover letter
              </label>
              <button
                type="button"
                onClick={loadDraft}
                disabled={drafting}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {drafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate with AI
              </button>
            </div>
            <Textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={12}
              placeholder={drafting ? "Drafting cover letter…" : "Write a cover letter for the customer."}
              disabled={drafting}
              className="min-h-[220px] font-normal"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The quote line items and totals are appended automatically below your letter.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Addressed to {customerName}. Sending will mark the quote as sent.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || drafting}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
