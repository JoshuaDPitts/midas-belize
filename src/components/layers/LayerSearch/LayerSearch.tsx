import { TextInput } from '@/components/ui/TextInput/TextInput';

interface LayerSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export function LayerSearch({ query, onChange }: LayerSearchProps) {
  return <TextInput placeholder="Search layers..." onChange={onChange} />;
}
