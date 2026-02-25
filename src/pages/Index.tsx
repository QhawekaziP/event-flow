import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Search, MapPin, CalendarDays, Plus, Zap } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["All", "Tech", "Books", "Sports", "Social"];

const Index = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || e.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [events, search, category]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">EventLink</h1>
        </div>
        <Link to="/create-event">
          <Button size="sm" className="rounded-full gap-1">
            <Plus className="h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Desktop create button */}
      <div className="hidden md:flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Discover Events</h1>
        <Link to="/create-event">
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className="cursor-pointer select-none whitespace-nowrap transition-all"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No events found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/event/${event.id}`} className="block">
                <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className="h-40 bg-muted bg-cover bg-center"
                    style={{
                      backgroundImage: event.image_url ? `url(${event.image_url})` : undefined,
                      backgroundColor: !event.image_url ? "hsl(var(--muted))" : undefined,
                    }}
                  >
                    {!event.image_url && (
                      <div className="h-full flex items-center justify-center">
                        <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                      {event.event_type === "restricted" && (
                        <Badge variant="outline" className="text-xs">Restricted</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-lg leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(event.date), "MMM d, yyyy · h:mm a")}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
