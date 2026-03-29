import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret to prevent unauthorized invocations
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Get all active investments that haven't been paid today
    const { data: investments, error: fetchError } = await supabase
      .from("investments")
      .select("*, products(duration_days)")
      .eq("status", "active");

    if (fetchError) throw fetchError;
    if (!investments || investments.length === 0) {
      return new Response(JSON.stringify({ message: "No active investments" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;

    for (const inv of investments) {
      // Skip if already paid today (idempotency)
      if (inv.last_roi_date === today) {
        skipped++;
        continue;
      }

      const durationDays = inv.products?.duration_days || 30;
      const dailyRoi = Math.floor(inv.roi / durationDays);
      const remaining = inv.roi - (inv.roi_paid || 0);

      if (remaining <= 0) {
        // Fully paid, mark completed
        await supabase
          .from("investments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", inv.id);
        continue;
      }

      // Credit is either dailyRoi or remaining (whichever is smaller)
      const credit = Math.min(dailyRoi, remaining);
      const newRoiPaid = (inv.roi_paid || 0) + credit;
      const isComplete = newRoiPaid >= inv.roi;

      // Atomically credit balance
      const { error: balErr } = await supabase.rpc("atomic_credit_balance", {
        p_user_id: inv.user_id,
        p_amount: credit,
      });

      if (balErr) {
        console.error(`Balance credit failed for investment ${inv.id}:`, balErr.message);
        continue;
      }

      // Update investment record
      const updateData: Record<string, unknown> = {
        roi_paid: newRoiPaid,
        last_roi_date: today,
      };
      if (isComplete) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updErr } = await supabase
        .from("investments")
        .update(updateData)
        .eq("id", inv.id);

      if (updErr) {
        console.error(`Investment update failed for ${inv.id}:`, updErr.message);
      } else {
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${processed}, skipped ${skipped}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-daily-roi error:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
