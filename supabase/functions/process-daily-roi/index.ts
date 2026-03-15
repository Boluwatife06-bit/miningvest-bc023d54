import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const durationDays = inv.products?.duration_days || 30;
      const dailyRoi = Math.floor(inv.roi / durationDays);
      const remaining = inv.roi - (inv.roi_paid || 0);

      if (remaining <= 0) {
        // Already fully paid, mark completed
        await supabase
          .from("investments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", inv.id);
        continue;
      }

      // Credit is either dailyRoi or remaining (whichever is smaller, to not overpay)
      const credit = Math.min(dailyRoi, remaining);
      const newRoiPaid = (inv.roi_paid || 0) + credit;
      const isComplete = newRoiPaid >= inv.roi;

      // Get user's current balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", inv.user_id)
        .single();

      if (!profile) continue;

      // Credit balance and update roi_paid
      const { error: balErr } = await supabase
        .from("profiles")
        .update({ balance: profile.balance + credit })
        .eq("user_id", inv.user_id);

      if (balErr) continue;

      const updateData: Record<string, unknown> = { roi_paid: newRoiPaid };
      if (isComplete) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from("investments").update(updateData).eq("id", inv.id);
      processed++;
    }

    return new Response(JSON.stringify({ message: `Processed ${processed} investments` }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
