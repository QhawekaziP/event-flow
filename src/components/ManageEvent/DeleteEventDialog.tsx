import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteEventDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeleteEventDialog = ({ eventId, eventTitle, open, onOpenChange }: DeleteEventDialogProps) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    // Delete related data first, then the event
    await supabase.from("rsvp_answers").delete().in(
      "rsvp_id",
      (await supabase.from("rsvps").select("id").eq("event_id", eventId)).data?.map((r) => r.id) || []
    );
    await supabase.from("rsvps").delete().eq("event_id", eventId);
    await supabase.from("event_questions").delete().eq("event_id", eventId);
    await supabase.from("event_hosts").delete().eq("event_id", eventId);

    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      toast.error("Failed to delete event");
      setDeleting(false);
      return;
    }

    toast.success("Event deleted");
    navigate("/my-events");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{eventTitle}"</strong>? This will remove all RSVPs and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Event"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEventDialog;
