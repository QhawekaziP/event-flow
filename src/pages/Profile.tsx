import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, MapPin, Mail, Edit2, Trash2 } from "lucide-react";

const INTEREST_OPTIONS = ["Tech", "Music", "Sports", "Art", "Books", "Food", "Travel", "Social", "Fitness", "Gaming"];

const Profile = () => {
  const { user, profile, signOut, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [interests, setInterests] = useState(profile?.interests || []);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        email: user.email,
        name,
        location,
        interests,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      fetchProfile(user.id);
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 py-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
            <Edit2 className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {/* Avatar area */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
          {(profile?.name || user?.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{profile?.name || "No name"}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" /> {user?.email}
          </p>
          {profile?.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.location}
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
          </div>
          <div className="space-y-2">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <Badge
                  key={interest}
                  variant={interests.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer select-none transition-all"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Interests */}
          {profile?.interests?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Interests</Label>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">{interest}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-border space-y-3">
        <Button variant="outline" onClick={handleSignOut} className="w-full gap-2 text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
        <DeleteAccountSection />
      </div>
    </motion.div>
  );
};

const DeleteAccountSection = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      toast.error("Failed to delete account");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    toast.success("Account deleted");
    navigate("/login");
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="w-full gap-2 text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" /> Delete Account
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete your account, all your events, RSVPs, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Profile;
