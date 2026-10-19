import { useLocation } from 'react-router-dom';

export function ResolutionLocationProbe({ label }: { label: string }) {
  const location = useLocation();
  return (
    <div>
      {label}
      <span data-testid="state">{JSON.stringify(location.state)}</span>
    </div>
  );
}
