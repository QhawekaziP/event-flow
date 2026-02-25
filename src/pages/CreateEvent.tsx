import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Tech", "Books", "Sports", "Social"];

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Social");
  const [isRestricted, setIsRestricted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const updateQuestion = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setLoading(true);

    const { data: eventData, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title,
        description,
        date: new Date(date).toISOString(),
        location,
        image_url: imageUrl,
        category,
        event_type: isRestricted ? "restricted" : "general",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create event");
      setLoading(false);
      return;
    }

    // Insert questions for restricted events
    if (isRestricted && questions.filter(Boolean).length > 0) {
      const questionRows = questions
        .filter(Boolean)
        .map((q, i) => ({ event_id: eventData.id, question: q, sort_order: i }));
      await supabase.from("event_questions").insert(questionRows);
    }

    toast.success("Event created! 🎉");
    navigate(`/event/${eventData.id}`);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 py-6 space-y-6"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Create Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Event Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your event a name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date & Time</Label>
          <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where is it happening?" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image URL</Label>
          <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people about your event..." rows={4} />
        </div>

        {/* Restricted toggle */}
        <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-4">
          <div>
            <p className="font-medium text-sm text-foreground">Restricted Event</p>
            <p className="text-xs text-muted-foreground">Require approval for RSVPs</p>
          </div>
          <Switch checked={isRestricted} onCheckedChange={setIsRestricted} />
        </div>

        {/* Questions for restricted events */}
        {isRestricted && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Screening Questions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  placeholder={`Question ${i + 1}`}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(i)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Event"}
        </Button>
      </form>
    </motion.div>
  );
};

export default CreateEvent;
