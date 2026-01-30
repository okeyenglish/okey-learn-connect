import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/typedClient";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";
import { getErrorMessage } from '@/lib/errorUtils';
import { useAuth } from "@/hooks/useAuth";

interface TestResult {
  name: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  details?: string;
}

export default function MultitenancyTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { user, profile } = useAuth();

  // Build currentUser object from auth context
  const currentUser = user ? {
    ...user,
    profile: profile ? {
      organization_id: (profile as any)?.organization_id,
      first_name: (profile as any)?.first_name,
      last_name: (profile as any)?.last_name,
    } : null
  } : null;

  const { data: organizationInfo } = useQuery({
    queryKey: ["organization-info"],
    queryFn: async () => {
      if (!currentUser?.profile?.organization_id) return null;

      const { data } = await supabase.from("organizations")
        .select("*")
        .eq("id", currentUser.profile.organization_id)
        .single();

      return data;
    },
    enabled: !!currentUser?.profile?.organization_id,
  });

  const runTests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Check user authentication
      testResults.push({
        name: "User Authentication",
        status: currentUser ? "success" : "error",
        message: currentUser 
          ? `Authenticated as ${currentUser.profile?.first_name} ${currentUser.profile?.last_name}`
          : "Not authenticated",
      });

      // Test 2: Check organization assignment
      testResults.push({
        name: "Organization Assignment",
        status: currentUser?.profile?.organization_id ? "success" : "error",
        message: currentUser?.profile?.organization_id
          ? `Organization ID: ${currentUser.profile.organization_id}`
          : "No organization assigned",
        details: organizationInfo?.name || undefined,
      });

      // Test 3: Check get_user_organization_id() function
      try {
        const orgId = await getCurrentOrganizationId();
        testResults.push({
          name: "get_user_organization_id() Function",
          status: orgId ? "success" : "error",
          message: orgId ? `Returns: ${orgId}` : "Function failed",
        });
      } catch (error: unknown) {
        testResults.push({
          name: "get_user_organization_id() Function",
          status: "error",
          message: getErrorMessage(error),
        });
      }

      // Test 4: Check leads RLS - can view only own organization's leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, organization_id")
        .limit(10);

      if (leadsError) {
        testResults.push({
          name: "Leads RLS - SELECT",
          status: "error",
          message: leadsError.message,
        });
      } else {
        const allSameOrg = leads?.every(
          (l) => l.organization_id === currentUser?.profile?.organization_id
        );
        testResults.push({
          name: "Leads RLS - SELECT",
          status: allSameOrg ? "success" : "warning",
          message: allSameOrg
            ? `All ${leads?.length || 0} leads belong to your organization`
            : `Found leads from other organizations!`,
          details: `Checked ${leads?.length || 0} leads`,
        });
      }

      // Test 5: Try to create a test lead
      const testLeadPhone = `+7${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      const { data: newLead, error: createError } = await supabase
        .from("leads")
        .insert({
          first_name: "Тест",
          last_name: "Multitenancy",
          phone: testLeadPhone,
          branch: "Окская",
          organization_id: currentUser?.profile?.organization_id,
        })
        .select("id, organization_id")
        .single();

      if (createError) {
        testResults.push({
          name: "Leads RLS - INSERT",
          status: "error",
          message: createError.message,
        });
      } else {
        const correctOrg =
          newLead.organization_id === currentUser?.profile?.organization_id;
        testResults.push({
          name: "Leads RLS - INSERT",
          status: correctOrg ? "success" : "error",
          message: correctOrg
            ? "Lead created with correct organization_id"
            : "Lead created with wrong organization_id!",
          details: `Lead ID: ${newLead.id}`,
        });

        // Clean up test lead
        await supabase.from("leads").delete().eq("id", newLead.id);
      }

      // Test 6: Check Event Bus events for created lead
      const { data: events, error: eventsError } = await supabase
        .from("event_bus")
        .select("*")
        .eq("event_type", "lead.created")
        .order("created_at", { ascending: false })
        .limit(5);

      if (eventsError) {
        testResults.push({
          name: "Event Bus - lead.created",
          status: "warning",
          message: eventsError.message,
        });
      } else {
        testResults.push({
          name: "Event Bus - lead.created",
          status: events && events.length > 0 ? "success" : "warning",
          message:
            events && events.length > 0
              ? `Found ${events.length} lead.created events`
              : "No lead.created events found yet",
        });
      }

      // Test 7: Try to read another organization's lead (should fail)
      const { data: allOrgs } = await supabase
        .from("organizations")
        .select("id")
        .neq("id", currentUser?.profile?.organization_id || "")
        .limit(1);

      if (allOrgs && allOrgs.length > 0) {
        const { data: otherOrgLeads, error: otherOrgError } = await supabase
          .from("leads")
          .select("*")
          .eq("organization_id", allOrgs[0].id)
          .limit(1);

        testResults.push({
          name: "Cross-Organization Access Test",
          status: otherOrgLeads && otherOrgLeads.length === 0 ? "success" : "error",
          message:
            otherOrgLeads && otherOrgLeads.length === 0
              ? "Cannot access other organization's leads ✓"
              : "Security breach: Can access other organization's data!",
        });
      } else {
        testResults.push({
          name: "Cross-Organization Access Test",
          status: "warning",
          message: "No other organizations to test against",
        });
      }

      setResults(testResults);
      toast.success("Tests completed");
    } catch (error: unknown) {
      toast.error(`Test failed: ${getErrorMessage(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants: Record<TestResult["status"], "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      pending: "outline",
    };
    return variants[status];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Multitenancy & Event Bus Test</h1>
          <p className="text-muted-foreground mt-1">
            Проверка изоляции данных между организациями и работы Event Bus
          </p>
        </div>
        <Button onClick={runTests} disabled={testing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testing..." : "Run Tests"}
        </Button>
      </div>

      {/* Current User Info */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
        <div className="space-y-2">
          <div>
            <span className="text-muted-foreground">User ID:</span>{" "}
            <code className="text-sm bg-muted px-2 py-1 rounded">{currentUser?.id || "Not authenticated"}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Name:</span>{" "}
            {currentUser?.profile?.first_name} {currentUser?.profile?.last_name}
          </div>
          <div>
            <span className="text-muted-foreground">Organization ID:</span>{" "}
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {currentUser?.profile?.organization_id || "None"}
            </code>
          </div>
          {organizationInfo && (
            <div>
              <span className="text-muted-foreground">Organization Name:</span>{" "}
              <Badge>{organizationInfo.name}</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={getStatusBadge(result.status)}>{result.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground ml-7 mt-1">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {results.filter((r) => r.status === "success").length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {results.filter((r) => r.status === "error").length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {results.filter((r) => r.status === "warning").length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {results.length}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
