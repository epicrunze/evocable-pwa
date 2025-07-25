import { RouteGuard } from '@/components/common/RouteGuard';
import { Dashboard } from '@/components/features/dashboard/Dashboard';

export default function Home() {
  return (
    <RouteGuard>
      <Dashboard />
    </RouteGuard>
  );
}
