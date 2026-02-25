import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const MyEvents = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("attending");
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [hostingEvents, setHostingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Attending
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("*, events(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAttendingEvents(rsvps || []);

      // Hosting
      const { data: hosted } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setHostingEvents(hosted || []);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const getStatusBadge = (status) => {
    const colors = {
      confirmed: "bg-success text-success-foreground",
      pending: "bg-warning text-warning-foreground",
      denied: "bg-destructive text-destructive-foreground",
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Events</h1>
        <Link to="/create-event">
          <Button size="sm" variant="outline" className="rounded-full gap-1">
            <Plus className="h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Toggle */}
      <div className="flex bg-secondary rounded-xl p-1">
        {["attending", "hosting"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tab === "attending" ? (
        attendingEvents.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No events yet</p>
            <Link to="/">
              <Button variant="outline" className="mt-2">Discover Events</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {attendingEvents.map((rsvp, i) => (
              <motion.div
                key={rsvp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/event/${rsvp.events?.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 flex gap-4 items-center hover:shadow-sm transition-shadow">
                    <div
                      className="w-16 h-16 rounded-lg bg-muted bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: rsvp.events?.image_url ? `url(${rsvp.events.image_url})` : undefined,
                      }}
                    >
                      {!rsvp.events?.image_url && (
                        <div className="h-full flex items-center justify-center">
                          <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-medium text-foreground truncate">{rsvp.events?.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {rsvp.events?.date && format(new Date(rsvp.events.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isPast(rsvp.events?.date) ? (
                        <Badge variant="outline">Past</Badge>
                      ) : (
                        getStatusBadge(rsvp.status)
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        hostingEvents.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No events created</p>
            <Link to="/create-event">
              <Button variant="outline" className="mt-2">Create your first event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {hostingEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/manage-event/${event.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 flex gap-4 items-center hover:shadow-sm transition-shadow">
                    <div
                      className="w-16 h-16 rounded-lg bg-muted bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: event.image_url ? `url(${event.image_url})` : undefined }}
                    >
                      {!event.image_url && (
                        <div className="h-full flex items-center justify-center">
                          <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="secondary">{event.event_type}</Badge>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default MyEvents;
