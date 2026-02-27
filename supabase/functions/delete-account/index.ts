import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user's data
    // rsvp_answers for user's rsvps
    const { data: rsvps } = await adminClient.from("rsvps").select("id").eq("user_id", user.id);
    if (rsvps?.length) {
      await adminClient.from("rsvp_answers").delete().in("rsvp_id", rsvps.map((r) => r.id));
    }
    await adminClient.from("rsvps").delete().eq("user_id", user.id);
    await adminClient.from("event_hosts").delete().eq("user_id", user.id);

    // Delete events owned by user (and their related data)
    const { data: events } = await adminClient.from("events").select("id").eq("user_id", user.id);
    if (events?.length) {
      const eventIds = events.map((e) => e.id);
      const { data: eventRsvps } = await adminClient.from("rsvps").select("id").in("event_id", eventIds);
      if (eventRsvps?.length) {
        await adminClient.from("rsvp_answers").delete().in("rsvp_id", eventRsvps.map((r) => r.id));
      }
      await adminClient.from("rsvps").delete().in("event_id", eventIds);
      await adminClient.from("event_questions").delete().in("event_id", eventIds);
      await adminClient.from("event_hosts").delete().in("event_id", eventIds);
      await adminClient.from("events").delete().in("id", eventIds);
    }

    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
