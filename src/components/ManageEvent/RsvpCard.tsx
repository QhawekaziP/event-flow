import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const RsvpCard = ({ rsvp, profile, questions, rsvpAnswers, onApprove, onDeny }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-foreground text-sm">{profile?.name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{profile?.email}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} className="gap-1">
          <Check className="h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onDeny} className="gap-1">
          <X className="h-3 w-3" /> Deny
        </Button>
      </div>
    </div>
    {questions?.length > 0 && rsvpAnswers && (
      <div className="space-y-2 pt-2 border-t border-border">
        {questions.map((q) => (
          <div key={q.id} className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{q.question}</p>
            <p className="text-sm text-foreground">{rsvpAnswers[q.id] || "No answer"}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default RsvpCard;
