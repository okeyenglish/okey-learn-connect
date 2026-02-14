import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/types.ts";

/**
 * Persona A/B Test Manager
 * 
 * Actions:
 * - assign: Assign a client to an active A/B test group
 * - track_outcome: Record conversion/interaction for a client in a test
 * - summary: Get aggregate results for a test
 * - auto_complete: Check if test reached target sample and declare winner
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    switch (action) {
      case 'assign':
        return await handleAssign(supabase, params);
      case 'track_outcome':
        return await handleTrackOutcome(supabase, params);
      case 'summary':
        return await handleSummary(supabase, params);
      case 'auto_complete':
        return await handleAutoComplete(supabase, params);
      case 'resolve_persona':
        return await handleResolvePersona(supabase, params);
      case 'promote_winner':
        return await handlePromoteWinner(supabase, params);
      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[persona-ab-test] Error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

/**
 * Assign client to A/B test group.
 * If client is already assigned, returns existing assignment.
 * If multiple tests are running, assigns to all of them.
 */
async function handleAssign(supabase: any, params: any) {
  const { client_id, organization_id } = params;
  if (!client_id || !organization_id) {
    return jsonResponse({ success: false, error: "client_id and organization_id required" }, 400);
  }

  // Find running tests for this org
  const { data: tests } = await supabase
    .from("persona_ab_tests")
    .select("id")
    .eq("organization_id", organization_id)
    .eq("status", "running");

  if (!tests || tests.length === 0) {
    return jsonResponse({ success: true, assignments: [], message: "No running tests" });
  }

  const assignments = [];
  for (const test of tests) {
    const { data } = await supabase
      .rpc("assign_client_to_ab_test", {
        p_test_id: test.id,
        p_client_id: client_id,
      });
    if (data && data.length > 0) {
      assignments.push({ test_id: test.id, ...data[0] });
    }
  }

  return jsonResponse({ success: true, assignments });
}

/**
 * Track outcome for a client in a test.
 */
async function handleTrackOutcome(supabase: any, params: any) {
  const { client_id, converted, conversion_event, feedback_score, health_score, messages_increment } = params;
  if (!client_id) {
    return jsonResponse({ success: false, error: "client_id required" }, 400);
  }

  // Find all assignments for this client
  const { data: assignments } = await supabase
    .from("persona_ab_assignments")
    .select("id, messages_count, avg_feedback_score, avg_health_score")
    .eq("client_id", client_id);

  if (!assignments || assignments.length === 0) {
    return jsonResponse({ success: true, updated: 0 });
  }

  let updated = 0;
  for (const a of assignments) {
    const updateData: any = {
      last_interaction_at: new Date().toISOString(),
    };

    if (converted !== undefined) {
      updateData.converted = converted;
      if (conversion_event) updateData.conversion_event = conversion_event;
    }

    if (messages_increment) {
      updateData.messages_count = (a.messages_count || 0) + messages_increment;
    }

    if (feedback_score !== undefined) {
      // Running average
      const count = a.messages_count || 1;
      const currentAvg = a.avg_feedback_score || 0;
      updateData.avg_feedback_score = Math.round(((currentAvg * count + feedback_score) / (count + 1)) * 100) / 100;
    }

    if (health_score !== undefined) {
      const count = a.messages_count || 1;
      const currentAvg = a.avg_health_score || 0;
      updateData.avg_health_score = Math.round(((currentAvg * count + health_score) / (count + 1)) * 100) / 100;
    }

    const { error } = await supabase
      .from("persona_ab_assignments")
      .update(updateData)
      .eq("id", a.id);

    if (!error) updated++;
  }

  return jsonResponse({ success: true, updated });
}

/**
 * Get summary/results for a test.
 */
async function handleSummary(supabase: any, params: any) {
  const { test_id } = params;
  if (!test_id) {
    return jsonResponse({ success: false, error: "test_id required" }, 400);
  }

  const { data: summary } = await supabase
    .rpc("get_ab_test_summary", { p_test_id: test_id });

  // Get test metadata
  const { data: test } = await supabase
    .from("persona_ab_tests")
    .select(`
      id, name, status, traffic_split, target_sample_size, target_metric,
      started_at, completed_at, winner_persona_id, winner_confidence,
      persona_a:persona_a_id(id, name, slug),
      persona_b:persona_b_id(id, name, slug)
    `)
    .eq("id", test_id)
    .maybeSingle();

  // Calculate statistical significance (simplified z-test for proportions)
  let confidence = 0;
  if (summary && summary.length === 2) {
    const a = summary.find((s: any) => s.variant === 'A');
    const b = summary.find((s: any) => s.variant === 'B');
    if (a && b && a.total_clients > 0 && b.total_clients > 0) {
      confidence = calculateConfidence(
        Number(a.converted_clients), Number(a.total_clients),
        Number(b.converted_clients), Number(b.total_clients)
      );
    }
  }

  return jsonResponse({
    success: true,
    test,
    summary: summary || [],
    confidence: Math.round(confidence * 100) / 100,
  });
}

/**
 * Auto-complete test if sample size reached and declare winner.
 */
async function handleAutoComplete(supabase: any, params: any) {
  const { organization_id } = params;
  if (!organization_id) {
    return jsonResponse({ success: false, error: "organization_id required" }, 400);
  }

  // Find running tests
  const { data: tests } = await supabase
    .from("persona_ab_tests")
    .select("id, target_sample_size, target_metric, persona_a_id, persona_b_id")
    .eq("organization_id", organization_id)
    .eq("status", "running");

  if (!tests || tests.length === 0) {
    return jsonResponse({ success: true, completed: [] });
  }

  const completed = [];

  for (const test of tests) {
    const { data: summary } = await supabase
      .rpc("get_ab_test_summary", { p_test_id: test.id });

    if (!summary || summary.length < 2) continue;

    const a = summary.find((s: any) => s.variant === 'A');
    const b = summary.find((s: any) => s.variant === 'B');

    if (!a || !b) continue;

    // Check if both variants reached target sample size
    const targetReached = Number(a.total_clients) >= test.target_sample_size &&
                          Number(b.total_clients) >= test.target_sample_size;

    if (!targetReached) continue;

    // Calculate confidence
    const confidence = calculateConfidence(
      Number(a.converted_clients), Number(a.total_clients),
      Number(b.converted_clients), Number(b.total_clients)
    );

    // Declare winner if confidence >= 95%
    if (confidence >= 95) {
      const aRate = Number(a.conversion_rate);
      const bRate = Number(b.conversion_rate);
      const winnerId = aRate >= bRate ? test.persona_a_id : test.persona_b_id;

      await supabase
        .from("persona_ab_tests")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_persona_id: winnerId,
          winner_confidence: confidence,
        })
        .eq("id", test.id);

      completed.push({ test_id: test.id, winner_persona_id: winnerId, confidence });
    }
  }

  return jsonResponse({ success: true, completed });
}

/**
 * Resolve which persona to use for a client, considering active A/B tests.
 * Returns the test-assigned persona if client is in a test, otherwise null.
 */
async function handleResolvePersona(supabase: any, params: any) {
  const { client_id, organization_id } = params;
  if (!client_id || !organization_id) {
    return jsonResponse({ success: false, error: "client_id and organization_id required" }, 400);
  }

  // Check if client has any active A/B assignment
  const { data: assignments } = await supabase
    .from("persona_ab_assignments")
    .select(`
      assigned_persona_id,
      variant,
      test:test_id(id, status)
    `)
    .eq("client_id", client_id);

  if (!assignments || assignments.length === 0) {
    // Try to assign to running tests
    const { data: tests } = await supabase
      .from("persona_ab_tests")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("status", "running");

    if (tests && tests.length > 0) {
      for (const test of tests) {
        const { data } = await supabase
          .rpc("assign_client_to_ab_test", {
            p_test_id: test.id,
            p_client_id: client_id,
          });
        if (data && data.length > 0) {
          return jsonResponse({
            success: true,
            persona_id: data[0].assigned_persona_id,
            variant: data[0].variant,
            test_id: test.id,
            newly_assigned: true,
          });
        }
      }
    }

    return jsonResponse({ success: true, persona_id: null });
  }

  // Find assignment with a running test
  const activeAssignment = assignments.find((a: any) => a.test?.status === 'running');
  if (activeAssignment) {
    return jsonResponse({
      success: true,
      persona_id: activeAssignment.assigned_persona_id,
      variant: activeAssignment.variant,
      test_id: (activeAssignment as any).test?.id,
    });
  }

  return jsonResponse({ success: true, persona_id: null });
}

/**
 * Promote the winning persona to be the default for the organization.
 * Sets is_default=true on the winner and is_default=false on all others.
 */
async function handlePromoteWinner(supabase: any, params: any) {
  const { test_id } = params;
  if (!test_id) {
    return jsonResponse({ success: false, error: "test_id required" }, 400);
  }

  // Get the completed test
  const { data: test, error: testErr } = await supabase
    .from("persona_ab_tests")
    .select("id, status, winner_persona_id, organization_id")
    .eq("id", test_id)
    .maybeSingle();

  if (testErr || !test) {
    return jsonResponse({ success: false, error: "Test not found" }, 404);
  }

  if (test.status !== 'completed' || !test.winner_persona_id) {
    return jsonResponse({ success: false, error: "Test has no winner yet" }, 400);
  }

  // Remove default from all personas in this org
  await supabase
    .from("ai_personas")
    .update({ is_default: false })
    .eq("organization_id", test.organization_id);

  // Set winner as default
  const { error: updateErr } = await supabase
    .from("ai_personas")
    .update({ is_default: true })
    .eq("id", test.winner_persona_id);

  if (updateErr) {
    return jsonResponse({ success: false, error: updateErr.message }, 500);
  }

  console.log(`[persona-ab-test] Promoted persona ${test.winner_persona_id} as default for org ${test.organization_id}`);

  return jsonResponse({
    success: true,
    promoted_persona_id: test.winner_persona_id,
    organization_id: test.organization_id,
  });
}

/**
 * Calculate statistical confidence using z-test for two proportions.
 */
function calculateConfidence(successA: number, totalA: number, successB: number, totalB: number): number {
  if (totalA === 0 || totalB === 0) return 0;

  const pA = successA / totalA;
  const pB = successB / totalB;
  const pPool = (successA + successB) / (totalA + totalB);

  if (pPool === 0 || pPool === 1) return 0;

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / totalA + 1 / totalB));
  if (se === 0) return 0;

  const z = Math.abs(pA - pB) / se;

  // Approximate p-value to confidence using normal distribution CDF
  // Using Abramowitz and Stegun approximation
  const confidence = (1 - normalCDF(-z)) * 2 - 1;
  return Math.max(0, Math.min(100, confidence * 100));
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
