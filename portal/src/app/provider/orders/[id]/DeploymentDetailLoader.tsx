'use client';

import dynamic from 'next/dynamic';

const DeploymentDetailClient = dynamic(() => import('./DeploymentDetailClient'), {
  ssr: false,
  loading: () => (
    <div className="container py-8">
      <p>Loading...</p>
    </div>
  ),
});

export default function DeploymentDetailLoader() {
  return <DeploymentDetailClient />;
}
