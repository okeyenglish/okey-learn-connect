import { StaffActivityFeed } from '@/components/crm/staff-activity/StaffActivityFeed';

export default function StaffActivityPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <StaffActivityFeed 
        showHeader={true}
        showFilters={true}
        limit={100}
      />
    </div>
  );
}
