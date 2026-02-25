import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

const HostManager = ({ eventId, hosts, profiles, onUpdate }) => {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const addHost = async () => {
    if (!email.trim()) return;
    setAdding(true);

    // Find profile by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .eq("email", email.trim())
      .single();

    if (!profile) {
      toast.error("No user found with that email");
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("event_hosts")
      .insert({ event_id: eventId, user_id: profile.user_id });

    if (error) {
      toast.error("Failed to add host (may already be added)");
    } else {
      toast.success(`${profile.name || profile.email} added as host`);
      setEmail("");
      onUpdate();
    }
    setAdding(false);
  };

  const removeHost = async (hostId: string) => {
    await supabase.from("event_hosts").delete().eq("id", hostId);
    toast.success("Host removed");
    onUpdate();
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground flex items-center gap-2">
        <Users className="h-4 w-4" /> Hosts
        <Badge variant="outline">{hosts.length}</Badge>
      </h2>
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add host by email..."
          className="flex-1"
        />
        <Button size="sm" onClick={addHost} disabled={adding} className="gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {hosts.map((host) => (
        <div
          key={host.id}
          className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {profiles[host.user_id]?.name || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              {profiles[host.user_id]?.email}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => removeHost(host.id)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default HostManager;
