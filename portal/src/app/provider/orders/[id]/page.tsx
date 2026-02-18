// Server component wrapper for static export compatibility
import DeploymentDetailLoader from './DeploymentDetailLoader';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function DeploymentDetailPage() {
  return <DeploymentDetailLoader />;
}
