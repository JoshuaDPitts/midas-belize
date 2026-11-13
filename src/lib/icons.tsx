import {
  Layers, Square, Image, Circle, Minus,
  ZoomIn, ZoomOut, Pencil, Ruler, Download,
  Menu, X, ArrowLeft, ExternalLink,
  Droplets, Waves, Fish, Users,
  Eye, EyeOff, ChevronDown, ChevronRight, Search,
  Sun, Moon, GripVertical, Map,
  TrendingUp, TrendingDown,
  Crosshair, Sliders, Sparkles, Info,
  Link, RotateCcw,
  type LucideProps,
} from 'lucide-react';
import { type ComponentType, type SVGAttributes } from 'react';

type IconComponent = ComponentType<LucideProps>;

export const ICON_REGISTRY: Record<string, IconComponent> = {
  layers: Layers, polygon: Square, raster: Image, point: Circle, line: Minus,
  'zoom-in': ZoomIn, 'zoom-out': ZoomOut, draw: Pencil, measure: Ruler, export: Download,
  menu: Menu, close: X, x: X, back: ArrowLeft, 'external-link': ExternalLink,
  watershed: Droplets, coastal: Waves, marine: Fish, social: Users,
  eye: Eye, 'eye-off': EyeOff, 'chevron-down': ChevronDown, 'chevron-right': ChevronRight,
  search: Search, sun: Sun, moon: Moon, 'grip-vertical': GripVertical, map: Map,
  'trending-up': TrendingUp, 'trending-down': TrendingDown,
  crosshair: Crosshair, sliders: Sliders, sparkles: Sparkles, info: Info,
  link: Link, 'rotate-ccw': RotateCcw,
};

interface IconProps extends SVGAttributes<SVGSVGElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const Component = ICON_REGISTRY[name];
  if (!Component) return null;
  return <Component width={size} height={size} stroke="currentColor" {...props} />;
}
