import { useState } from 'react';
import { useTrips } from '@/hooks/useTrips';
import { AppLayout } from '@/components/layout/AppLayout';
import { FirstTimeHome } from '@/components/dashboard/FirstTimeHome';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { AlertCircle } from 'lucide-react';
import { CreateTripModal } from '@/components/modals/CreateTripModal';
import { InviteCrewModal } from '@/components/modals/InviteCrewModal';

export default function Dashboard() {
  const { trips, isLoading, isError, error, refetch } = useTrips();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [postCreateInvite, setPostCreateInvite] = useState<{ name: string; code: string } | null>(null);

  const openCreateModal = () => {
    setModalTab('create');
    setIsModalOpen(true);
  };

  const openJoinModal = () => {
    setModalTab('join');
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="w-full max-w-5xl mx-auto px-6 py-10 space-y-12 pb-32">
          {/* Search bar skeleton */}
          <div className="flex justify-center">
            <Skeleton className="h-12 w-full max-w-lg rounded-full" />
          </div>

          {/* Active Escapes skeleton */}
          <section className="space-y-6">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[220px] md:h-[250px] w-full rounded-[32px]" />
              ))}
            </div>
          </section>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load trips"
          description={error?.message || 'Something went wrong while fetching your adventures.'}
          actionLabel="Try Again"
          onAction={() => refetch()}
          isLoading={isLoading}
        />
      </AppLayout>
    );
  }

  // Empty state — single source of truth: trips.length === 0
  if (trips.length === 0) {
    return (
      <AppLayout>
        <FirstTimeHome 
          onCreateTrip={openCreateModal} 
          onJoinTrip={openJoinModal}
        />
        <CreateTripModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTripCreated={(trip) => {
            setIsModalOpen(false);
            setPostCreateInvite({ name: trip.name, code: trip.invite_code });
          }}
          defaultTab={modalTab}
        />
        <InviteCrewModal
          isOpen={!!postCreateInvite}
          onClose={() => setPostCreateInvite(null)}
          tripName={postCreateInvite?.name || ''}
          inviteCode={postCreateInvite?.code || ''}
          mode="create-flow"
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <DashboardView
        activeTrips={trips}
        archivedTrips={[]} // TODO: Implement archived trips when trips have a status/completed_at field
        onCreateTrip={openCreateModal}
        onJoinTrip={openJoinModal}
      />
      <CreateTripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTripCreated={(trip) => {
          setIsModalOpen(false);
          setPostCreateInvite({ name: trip.name, code: trip.invite_code });
        }}
        defaultTab={modalTab}
      />
      <InviteCrewModal
        isOpen={!!postCreateInvite}
        onClose={() => setPostCreateInvite(null)}
        tripName={postCreateInvite?.name || ''}
        inviteCode={postCreateInvite?.code || ''}
        mode="create-flow"
      />
    </AppLayout>
  );
}
