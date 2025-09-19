import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminScheduleManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule Management</h1>
        <p className="text-muted-foreground">Manage class schedules and timetables</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Schedule Editor</CardTitle>
          <CardDescription>Configure class schedules for different branches</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Schedule management functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}