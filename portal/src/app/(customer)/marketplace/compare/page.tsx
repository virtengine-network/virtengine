import dynamic from 'next/dynamic';

const CompareClient = dynamic(() => import('./CompareClient'), {
  loading: () => (
    <div className="container py-8">
      <p>Loading comparison...</p>
    </div>
  ),
});

export default function ComparePage() {
  return <CompareClient />;
}
