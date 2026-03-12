import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    // Idempotent function — safe to call multiple times per day

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
    const errors: string[] = [];

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

      // Credit balance using service role (bypasses RLS)
      const { data: profile, error: fetchProfileErr } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", inv.user_id)
        .single();

      if (fetchProfileErr || !profile) {
        errors.push(`Profile not found for user ${inv.user_id}`);
        continue;
      }

      const { error: balErr } = await supabase
        .from("profiles")
        .update({ balance: profile.balance + credit, updated_at: new Date().toISOString() })
        .eq("user_id", inv.user_id);

      if (balErr) {
        errors.push(`Balance update failed for user ${inv.user_id}: ${balErr.message}`);
        continue;
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

    return new Response(
      JSON.stringify({ message: `Processed ${processed} investments`, errors }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
