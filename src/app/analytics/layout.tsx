import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workout Analytics - Workout Warrior',
  description: 'View your workout progress and analytics.',
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // You can add specific layout structure for the analytics section if needed
    // For now, it just passes children through.
    <section>{children}</section>
  );
}
