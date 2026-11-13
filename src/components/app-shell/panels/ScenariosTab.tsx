'use client';
import { useFeatures } from '../hooks/useFeatures';

export function ScenariosTab() {
  const features = useFeatures();
  const contribs = features.filter((f) => f.scenariosContent);
  if (contribs.length === 0) return null;
  return (
    <div data-testid="panel-scenarios">
      {contribs.map((f) => {
        const C = f.scenariosContent!;
        return <C key={f.id} />;
      })}
    </div>
  );
}
