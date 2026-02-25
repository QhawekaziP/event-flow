import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, User, Clock, Shield } from "lucide-react";
import { format } from "date-fns";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [host, setHost] = useState(null);
  const [rsvp, setRsvp] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      setEvent(eventData);

      if (eventData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", eventData.user_id)
          .single();
        setHost(profileData);

        // Fetch questions for restricted events
        if (eventData.event_type === "restricted") {
          const { data: qData } = await supabase
            .from("event_questions")
            .select("*")
            .eq("event_id", id)
            .order("sort_order");
          setQuestions(qData || []);
        }

        // Check if user already RSVP'd
        if (user) {
          const { data: rsvpData } = await supabase
            .from("rsvps")
            .select("*")
            .eq("event_id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          setRsvp(rsvpData);
        }
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id, user]);

  const handleRsvp = async () => {
    if (!user) { navigate("/login"); return; }
    setRsvpLoading(true);

    const isRestricted = event.event_type === "restricted";
    const status = isRestricted ? "pending" : "confirmed";

    const { data: newRsvp, error } = await supabase
      .from("rsvps")
      .insert({ user_id: user.id, event_id: event.id, status })
      .select()
      .single();

    if (error) {
      toast.error("Could not RSVP. You may have already registered.");
      setRsvpLoading(false);
      return;
    }

    // Save answers for restricted events
    if (isRestricted && questions.length > 0) {
      const answerRows = questions.map((q) => ({
        rsvp_id: newRsvp.id,
        question_id: q.id,
        answer: answers[q.id] || "",
      }));
      await supabase.from("rsvp_answers").insert(answerRows);
    }

    setRsvp(newRsvp);
    toast.success(isRestricted ? "Access requested! The host will review." : "RSVP confirmed! 🎉");
    setRsvpLoading(false);
  };

  const handleCancelRsvp = async () => {
    await supabase.from("rsvps").delete().eq("id", rsvp.id);
    setRsvp(null);
    toast.success("RSVP cancelled");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-60 bg-muted rounded-2xl animate-pulse mb-6" />
        <div className="space-y-3">
          <div className="h-8 bg-muted rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded-lg animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  const isHost = user?.id === event.user_id;
  const isPast = new Date(event.date) < new Date();

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "denied": return "bg-destructive text-destructive-foreground";
      default: return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      {/* Hero image */}
      <div
        className="h-56 md:h-72 bg-muted bg-cover bg-center relative"
        style={{
          backgroundImage: event.image_url ? `url(${event.image_url})` : undefined,
        }}
      >
        {!event.image_url && (
          <div className="h-full flex items-center justify-center">
            <CalendarDays className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-full p-2 border border-border"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Title & badges */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{event.category}</Badge>
            {event.event_type === "restricted" && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" /> Restricted
              </Badge>
            )}
            {isPast && <Badge variant="outline">Past</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{event.title}</h1>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{format(new Date(event.date), "h:mm a")}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{event.location}</span>
            </div>
          )}
          {host && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <span>Hosted by {host.name || "Unknown"}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">About</h2>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* RSVP Section */}
        {!isHost && !isPast && (
          <div className="space-y-4 pt-2">
            {rsvp ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(rsvp.status)}>{rsvp.status}</Badge>
                </div>
                {rsvp.status !== "denied" && (
                  <Button variant="outline" onClick={handleCancelRsvp} className="w-full">
                    Cancel RSVP
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Questions for restricted events */}
                {event.event_type === "restricted" && questions.length > 0 && (
                  <div className="space-y-4 bg-secondary/50 rounded-xl p-4">
                    <p className="text-sm font-medium text-foreground">Please answer these questions:</p>
                    {questions.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <Label className="text-sm">{q.question}</Label>
                        <Textarea
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="Your answer..."
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleRsvp} disabled={rsvpLoading} className="w-full" size="lg">
                  {rsvpLoading
                    ? "Submitting..."
                    : event.event_type === "restricted"
                    ? "Request Access"
                    : "RSVP Now"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Host actions */}
        {isHost && (
          <div className="space-y-2 pt-2">
            <Button onClick={() => navigate(`/manage-event/${event.id}`)} className="w-full">
              Manage Event
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EventDetails;
