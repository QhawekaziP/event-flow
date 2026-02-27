import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Edit, QrCode, Trash2, UserCheck } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import RsvpCard from "@/components/ManageEvent/RsvpCard";
import HostManager from "@/components/ManageEvent/HostManager";
import EditEventDialog from "@/components/ManageEvent/EditEventDialog";
import DeleteEventDialog from "@/components/ManageEvent/DeleteEventDialog";

const ManageEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [isHostOrOwner, setIsHostOrOwner] = useState(false);
  const [scanResult, setScanResult] = useState<{ name: string; email: string; location?: string; success: boolean; message: string } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!user) return;

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!eventData) {
      navigate("/my-events");
      return;
    }

    const isOwner = eventData.user_id === user.id;

    // Check if user is a host
    const { data: hostData } = await supabase
      .from("event_hosts")
      .select("*")
      .eq("event_id", id);
    setHosts(hostData || []);

    const isHost = (hostData || []).some((h) => h.user_id === user.id);

    if (!isOwner && !isHost) {
      navigate("/my-events");
      return;
    }

    setIsHostOrOwner(true);
    setEvent(eventData);

    const { data: rsvpData } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });
    setRsvps(rsvpData || []);

    // Fetch profiles for attendees + hosts
    const allUserIds = [
      ...(rsvpData || []).map((r) => r.user_id),
      ...(hostData || []).map((h) => h.user_id),
    ];
    const uniqueIds = [...new Set(allUserIds)];
    if (uniqueIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", uniqueIds);
      const profileMap = {};
      (profileData || []).forEach((p) => { profileMap[p.user_id] = p; });
      setProfiles(profileMap);
    }

    if (eventData.event_type === "restricted") {
      const { data: qData } = await supabase
        .from("event_questions")
        .select("*")
        .eq("event_id", id)
        .order("sort_order");
      setQuestions(qData || []);

      const rsvpIds = (rsvpData || []).map((r) => r.id);
      if (rsvpIds.length > 0) {
        const { data: ansData } = await supabase
          .from("rsvp_answers")
          .select("*")
          .in("rsvp_id", rsvpIds);
        const ansMap = {};
        (ansData || []).forEach((a) => {
          if (!ansMap[a.rsvp_id]) ansMap[a.rsvp_id] = {};
          ansMap[a.rsvp_id][a.question_id] = a.answer;
        });
        setAnswers(ansMap);
      }
    }

    setLoading(false);
  };

  const updateRsvpStatus = async (rsvpId, status) => {
    await supabase.from("rsvps").update({ status }).eq("id", rsvpId);
    setRsvps((prev) => prev.map((r) => r.id === rsvpId ? { ...r, status } : r));
    toast.success(`RSVP ${status}`);

    // If approving, trigger QR code generation
    if (status === "confirmed") {
      try {
        await supabase.functions.invoke("send-qr-email", {
          body: { rsvp_id: rsvpId },
        });
      } catch (e) {
        console.error("QR email error:", e);
      }
    }
  };

  const checkInGuest = async (rsvpId) => {
    await supabase.from("rsvps").update({ checked_in: true }).eq("id", rsvpId);
    setRsvps((prev) => prev.map((r) => r.id === rsvpId ? { ...r, checked_in: true } : r));
    toast.success("Guest checked in! ✅");
  };

  const handleQrScan = async (data) => {
    const foundRsvp = rsvps.find((r) => r.qr_token === data || r.id === data || r.user_id === data);
    const profile = foundRsvp ? profiles[foundRsvp.user_id] : null;

    if (foundRsvp) {
      if (foundRsvp.checked_in) {
        setScanResult({ name: profile?.name || "Unknown", email: profile?.email || "", location: profile?.location, success: false, message: "Already checked in" });
      } else if (foundRsvp.status === "confirmed") {
        await checkInGuest(foundRsvp.id);
        setScanResult({ name: profile?.name || "Unknown", email: profile?.email || "", location: profile?.location, success: true, message: "Scanned Successfully ✅" });
      } else {
        setScanResult({ name: profile?.name || "Unknown", email: profile?.email || "", location: profile?.location, success: false, message: "Guest is not confirmed" });
      }
    } else {
      setScanResult({ name: "Unknown", email: "", success: false, message: "RSVP not found for this event" });
    }
    setShowScanner(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-muted rounded-lg animate-pulse w-1/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isOwner = event?.user_id === user?.id;
  const pendingRsvps = rsvps.filter((r) => r.status === "pending");
  const confirmedRsvps = rsvps.filter((r) => r.status === "confirmed");
  const deniedRsvps = rsvps.filter((r) => r.status === "denied");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 py-6 space-y-6"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{event?.title}</h1>
          <p className="text-sm text-muted-foreground">{rsvps.length} RSVPs</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)} className="gap-1">
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} className="gap-1">
            <QrCode className="h-4 w-4" /> Scan
          </Button>
        </div>
      </div>

      {/* Edit & Delete Dialogs */}
      {isOwner && event && (
        <>
          <EditEventDialog
            event={event}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onUpdated={fetchData}
          />
          <DeleteEventDialog
            eventId={event.id}
            eventTitle={event.title}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          />
        </>
      )}

      {showScanner && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">QR Check-in</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>Close</Button>
          </div>
          <QrScanner onScan={handleQrScan} />
        </div>
      )}

      {/* Scan Result Overlay */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border rounded-xl p-5 space-y-2 text-center ${
            scanResult.success
              ? "bg-success/10 border-success"
              : "bg-destructive/10 border-destructive"
          }`}
        >
          <p className={`text-lg font-bold ${scanResult.success ? "text-success" : "text-destructive"}`}>
            {scanResult.message}
          </p>
          <p className="font-medium text-foreground">{scanResult.name}</p>
          {scanResult.email && <p className="text-sm text-muted-foreground">{scanResult.email}</p>}
          {scanResult.location && <p className="text-sm text-muted-foreground">📍 {scanResult.location}</p>}
          <Button variant="outline" size="sm" onClick={() => { setScanResult(null); setShowScanner(true); }} className="mt-3">
            Scan Another
          </Button>
        </motion.div>
      )}

      {/* Host Management (only for event owner) */}
      {isOwner && (
        <HostManager
          eventId={id}
          hosts={hosts}
          profiles={profiles}
          onUpdate={fetchData}
        />
      )}

      {/* Pending (for restricted events) */}
      {event?.event_type === "restricted" && pendingRsvps.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            Pending Requests <Badge variant="outline">{pendingRsvps.length}</Badge>
          </h2>
          {pendingRsvps.map((rsvp) => (
            <RsvpCard
              key={rsvp.id}
              rsvp={rsvp}
              profile={profiles[rsvp.user_id]}
              questions={questions}
              rsvpAnswers={answers[rsvp.id]}
              onApprove={() => updateRsvpStatus(rsvp.id, "confirmed")}
              onDeny={() => updateRsvpStatus(rsvp.id, "denied")}
            />
          ))}
        </div>
      )}

      {/* Confirmed */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          Confirmed <Badge variant="secondary">{confirmedRsvps.length}</Badge>
        </h2>
        {confirmedRsvps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No confirmed guests yet.</p>
        ) : (
          confirmedRsvps.map((rsvp) => (
            <div
              key={rsvp.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {profiles[rsvp.user_id]?.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">{profiles[rsvp.user_id]?.email}</p>
                {profiles[rsvp.user_id]?.location && (
                  <p className="text-xs text-muted-foreground">📍 {profiles[rsvp.user_id].location}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rsvp.checked_in ? (
                  <Badge className="bg-success text-success-foreground gap-1">
                    <UserCheck className="h-3 w-3" /> Checked in
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => checkInGuest(rsvp.id)} className="gap-1">
                    <Check className="h-3 w-3" /> Check in
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Denied */}
      {deniedRsvps.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Denied ({deniedRsvps.length})</h2>
          {deniedRsvps.map((rsvp) => (
            <div
              key={rsvp.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between opacity-60"
            >
              <p className="text-sm text-foreground">{profiles[rsvp.user_id]?.name || "Unknown"}</p>
              <Badge variant="outline">Denied</Badge>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ManageEvent;
