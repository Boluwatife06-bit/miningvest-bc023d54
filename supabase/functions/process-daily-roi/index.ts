import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    // Auth check: require CRON_SECRET
    const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (cronSecret !== Deno.env.get("CRON_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Get all active investments with their product duration
    const { data: investments, error: fetchError } = await supabase
      .from("investments")
      .select("*, products(duration_days)")
      .eq("status", "active");

    if (fetchError) throw fetchError;
    if (!investments || investments.length === 0) {
      return new Response(JSON.stringify({ message: "No active investments" }), { status: 200 });
    }

    let processed = 0;

    for (const inv of investments) {
      // Idempotency: skip if already paid today
      if (inv.last_roi_date === today) continue;

      const durationDays = inv.products?.duration_days || 30;
      const dailyRoi = Math.floor(inv.roi / durationDays);
      const remaining = inv.roi - (inv.roi_paid || 0);

      if (remaining <= 0) {
        await supabase
          .from("investments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", inv.id);
        continue;
      }

      const credit = Math.min(dailyRoi, remaining);
      const newRoiPaid = (inv.roi_paid || 0) + credit;
      const isComplete = newRoiPaid >= inv.roi;

      // Atomically credit balance
      const { error: balErr } = await supabase.rpc("admin_adjust_balance", {
        p_user_id: inv.user_id,
        p_amount: credit,
      });

      // Fallback: direct update if RPC not callable with service role
      if (balErr) {
        const { error: directErr } = await supabase
          .from("profiles")
          .update({ balance: supabase.rpc ? undefined : undefined })
          .eq("user_id", inv.user_id);
        // Use raw SQL-style atomic update via service role
        await supabase
          .from("profiles")
          .update({ balance: (await supabase.from("profiles").select("balance").eq("user_id", inv.user_id).single()).data?.balance + credit })
          .eq("user_id", inv.user_id);
      }

      const updateData: Record<string, unknown> = {
        roi_paid: newRoiPaid,
        last_roi_date: today,
      };
      if (isComplete) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from("investments").update(updateData).eq("id", inv.id);
      processed++;
    }

    return new Response(JSON.stringify({ message: `Processed ${processed} investments` }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
