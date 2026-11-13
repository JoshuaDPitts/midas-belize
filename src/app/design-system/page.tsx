'use client';

import { useState } from 'react';
import { Icon, ICON_REGISTRY } from '@/lib/icons';
import { Button } from '@/components/ui/Button/Button';
import { Toggle } from '@/components/ui/Toggle/Toggle';
import { Slider } from '@/components/ui/Slider/Slider';
import { TextInput } from '@/components/ui/TextInput/TextInput';
import { Select } from '@/components/ui/Select/Select';
import { Dropdown } from '@/components/ui/Dropdown/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip/Tooltip';
import { Modal } from '@/components/ui/Modal/Modal';
import { GraduatedLegend } from '@/components/data/GraduatedLegend/GraduatedLegend';
import { CategoricalLegend } from '@/components/data/CategoricalLegend/CategoricalLegend';
import { DataCard } from '@/components/data/DataCard/DataCard';
import { StatDisplay } from '@/components/data/StatDisplay/StatDisplay';
import { Sparkline } from '@/components/data/Sparkline/Sparkline';
import { LoadingState } from '@/components/data/LoadingState/LoadingState';
import { LayerRow } from '@/components/layers/LayerRow/LayerRow';
import { LayerGroup } from '@/components/layers/LayerGroup/LayerGroup';
import { LayerSearch } from '@/components/layers/LayerSearch/LayerSearch';
import { HoverTooltip } from '@/components/layers/HoverTooltip/HoverTooltip';
import { ClickPopup } from '@/components/layers/ClickPopup/ClickPopup';
import { InspectionPanel } from '@/components/layers/InspectionPanel/InspectionPanel';
import { AttributeTable } from '@/components/layers/AttributeTable/AttributeTable';
import { EBINVisualizer } from '@/components/mimes/EBINVisualizer/EBINVisualizer';
import { FoodWebDiagram } from '@/components/mimes/FoodWebDiagram/FoodWebDiagram';
import { StockFlowIndicator } from '@/components/mimes/StockFlowIndicator/StockFlowIndicator';
import { BiomassChart } from '@/components/mimes/BiomassChart/BiomassChart';
import { TimeSeriesPlayer } from '@/components/mimes/TimeSeriesPlayer/TimeSeriesPlayer';
import { ScenarioSelector } from '@/components/mimes/ScenarioSelector/ScenarioSelector';
import { ComparisonPanel } from '@/components/mimes/ComparisonPanel/ComparisonPanel';
import { DiffOverlayLegend } from '@/components/mimes/DiffOverlayLegend/DiffOverlayLegend';
import { ParameterCard } from '@/components/mimes/ParameterCard/ParameterCard';
import { RadarChart } from '@/components/mimes/RadarChart/RadarChart';
import { ServiceMatrix } from '@/components/mimes/ServiceMatrix/ServiceMatrix';
import { NbSScoreCard } from '@/components/mimes/NbSScoreCard/NbSScoreCard';
import { NavBar } from '@/components/layout/NavBar/NavBar';
import { Footer } from '@/components/layout/Footer/Footer';
import { SiteSelector } from '@/components/layout/SiteSelector/SiteSelector';
import { HeroSection } from '@/components/layout/HeroSection/HeroSection';
import { TeamMemberCard } from '@/components/layout/TeamMemberCard/TeamMemberCard';
import { PublicationCard } from '@/components/layout/PublicationCard/PublicationCard';
import { TimelineDisplay } from '@/components/layout/TimelineDisplay/TimelineDisplay';
import { FloatingToolbar } from '@/components/map/FloatingToolbar/FloatingToolbar';
import { AttributionBar } from '@/components/map/AttributionBar/AttributionBar';
import { CoordinateDisplay } from '@/components/map/CoordinateDisplay/CoordinateDisplay';
import { ZoomControls } from '@/components/map/ZoomControls/ZoomControls';
import styles from './page.module.css';

const SEMANTIC_COLORS = [
  { token: '--color-surface', label: 'Surface' },
  { token: '--color-surface-raised', label: 'Surface Raised' },
  { token: '--color-surface-overlay', label: 'Surface Overlay' },
  { token: '--color-text', label: 'Text' },
  { token: '--color-text-secondary', label: 'Text Secondary' },
  { token: '--color-text-tertiary', label: 'Text Tertiary' },
  { token: '--color-accent', label: 'Accent' },
  { token: '--color-accent-hover', label: 'Accent Hover' },
  { token: '--color-border', label: 'Border' },
  { token: '--color-border-strong', label: 'Border Strong' },
  { token: '--color-status-success', label: 'Success' },
  { token: '--color-status-warning', label: 'Warning' },
  { token: '--color-status-error', label: 'Error' },
  { token: '--color-focus-ring', label: 'Focus Ring' },
];

const VIZ_COLORS = Array.from({ length: 8 }, (_, i) => ({
  token: `--color-viz-${i + 1}`,
  label: `Viz ${i + 1}`,
}));

const DIVERGING_COLORS = [
  { token: '--color-diverge-negative', label: 'Negative' },
  { token: '--color-diverge-neutral', label: 'Neutral' },
  { token: '--color-diverge-positive', label: 'Positive' },
];

const APP_TYPE_SCALE = [
  { token: '--font-size-app-xs',   label: 'xs',   size: 'var(--font-size-app-xs)' },
  { token: '--font-size-app-sm',   label: 'sm',   size: 'var(--font-size-app-sm)' },
  { token: '--font-size-app-base', label: 'base', size: 'var(--font-size-app-base)' },
  { token: '--font-size-app-lg',   label: 'lg',   size: 'var(--font-size-app-lg)' },
  { token: '--font-size-app-xl',   label: 'xl',   size: 'var(--font-size-app-xl)' },
  { token: '--font-size-app-2xl',  label: '2xl',  size: 'var(--font-size-app-2xl)' },
] as const;

const CONTENT_TYPE_SCALE = [
  { token: '--font-size-content-sm',   label: 'sm',   size: 'var(--font-size-content-sm)' },
  { token: '--font-size-content-base', label: 'base', size: 'var(--font-size-content-base)' },
  { token: '--font-size-content-lg',   label: 'lg',   size: 'var(--font-size-content-lg)' },
  { token: '--font-size-content-xl',   label: 'xl',   size: 'var(--font-size-content-xl)' },
  { token: '--font-size-content-2xl',  label: '2xl',  size: 'var(--font-size-content-2xl)' },
  { token: '--font-size-content-3xl',  label: '3xl',  size: 'var(--font-size-content-3xl)' },
  { token: '--font-size-content-4xl',  label: '4xl',  size: 'var(--font-size-content-4xl)' },
] as const;

const RADIUS_STEPS = [
  { token: '--radius-xs',   label: 'xs' },
  { token: '--radius-sm',   label: 'sm' },
  { token: '--radius-md',   label: 'md' },
  { token: '--radius-lg',   label: 'lg' },
  { token: '--radius-xl',   label: 'xl' },
  { token: '--radius-pill', label: 'pill' },
  { token: '--radius-full', label: 'full' },
] as const;

const SHADOW_STEPS = [
  { token: '--shadow-sm',        label: 'sm' },
  { token: '--shadow-md',        label: 'md' },
  { token: '--shadow-lg',        label: 'lg' },
  { token: '--shadow-glass-sm',  label: 'glass-sm' },
  { token: '--shadow-glass-md',  label: 'glass-md' },
] as const;

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className={styles.swatch}>
      <div
        className={styles.swatchColor}
        style={{ backgroundColor: `var(${token})` }}
      />
      <div className={styles.swatchInfo}>
        <span className={styles.swatchLabel}>{label}</span>
        <code className={styles.swatchToken}>{token}</code>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);
  const [sliderVal, setSliderVal] = useState(65);
  const [selectVal, setSelectVal] = useState('marine');
  const [modalOpen, setModalOpen] = useState(false);
  const [layerSearch, setLayerSearch] = useState('');
  const [popupOpen, setPopupOpen] = useState(true);
  const [activeScenario, setActiveScenario] = useState('baseline');
  const [activeSite, setActiveSite] = useState('turneffe');
  const [tsPlaying, setTsPlaying] = useState(false);
  const [tsSpeed, setTsSpeed] = useState(1);
  const [layers, setLayers] = useState([
    { id: 'coral', name: 'Coral Cover', domain: 'marine' as const, type: 'fill' as const, visible: true, opacity: 0.8, interactive: true, attributes: [] },
    { id: 'seagrass', name: 'Seagrass Extent', domain: 'marine' as const, type: 'fill' as const, visible: true, opacity: 0.6, interactive: true, attributes: [] },
    { id: 'fish', name: 'Fish Density', domain: 'marine' as const, type: 'circle' as const, visible: false, opacity: 1, interactive: true, attributes: [] },
    { id: 'mangrove', name: 'Mangrove', domain: 'coastal' as const, type: 'fill' as const, visible: true, opacity: 1, interactive: true, attributes: [] },
  ]);
  const [groups, setGroups] = useState({ marine: true, coastal: false });

  return (
    <div className={styles.page} data-theme={theme}>
      <header className={styles.header}>
        <h1 className={styles.title}>MIDAS Belize — Design Tokens</h1>
        <button
          className={styles.themeToggle}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Semantic Colors</h2>
        <div className={styles.grid}>
          {SEMANTIC_COLORS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Visualization</h2>
        <div className={styles.grid}>
          {VIZ_COLORS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Diverging Scale</h2>
        <div className={styles.grid}>
          {DIVERGING_COLORS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Core UI Components (DS-004)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Button</h3>
          <div className={styles.componentRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="icon" aria-label="Layers"><Icon name="layers" size={18} /></Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Toggle</h3>
          <div className={styles.componentRow}>
            <Toggle label="Layer visible" checked={toggleA} onChange={setToggleA} />
            <Toggle label="Auto-refresh" checked={toggleB} onChange={setToggleB} />
            <Toggle label="Disabled" checked={false} onChange={() => {}} disabled />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Slider</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 320 }}>
            <Slider min={0} max={100} value={sliderVal} onChange={setSliderVal} label="Opacity" />
            <Slider min={0} max={100} value={40} onChange={() => {}} label="Disabled" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Form & Overlay Components (DS-004 pt 2-3)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>TextInput</h3>
          <div style={{ maxWidth: 280 }}>
            <TextInput label="Layer name" placeholder="Enter layer name..." onChange={() => {}} />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Select</h3>
          <div style={{ maxWidth: 280 }}>
            <Select
              label="Domain"
              options={[
                { value: 'watershed', label: 'Watershed' },
                { value: 'coastal', label: 'Coastal' },
                { value: 'marine', label: 'Marine' },
                { value: 'social', label: 'Social' },
              ]}
              value={selectVal}
              onChange={setSelectVal}
            />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Dropdown</h3>
          <Dropdown
            trigger={<Button variant="secondary">Actions</Button>}
            items={[
              { label: 'Export as GeoJSON', onClick: () => {} },
              { label: 'Copy coordinates', onClick: () => {} },
              { label: 'Reset view', onClick: () => {} },
            ]}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Tooltip</h3>
          <div className={styles.componentRow}>
            <Tooltip content="Top tooltip" placement="top">
              <Button variant="secondary">Hover (top)</Button>
            </Tooltip>
            <Tooltip content="Right tooltip" placement="right">
              <Button variant="secondary">Hover (right)</Button>
            </Tooltip>
            <Tooltip content="Bottom tooltip" placement="bottom">
              <Button variant="secondary">Hover (bottom)</Button>
            </Tooltip>
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Modal</h3>
          <Button variant="primary" onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Export Data">
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-app-sm)' }}>
              Choose a format and destination for your layer export. This dialog demonstrates the Modal component with close button, Escape key handling, and backdrop click dismiss.
            </p>
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Export</Button>
            </div>
          </Modal>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Display (DS-005)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>GraduatedLegend</h3>
          <div style={{ maxWidth: 280 }}>
            <GraduatedLegend
              breaks={[0, 5, 10, 15, 20, 25]}
              colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
              label="Coral Cover"
              unit="%"
            />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>CategoricalLegend</h3>
          <div style={{ maxWidth: 200 }}>
            <CategoricalLegend
              label="Habitat Type"
              categories={[
                { label: 'Coral Reef', color: '#EF4444' },
                { label: 'Seagrass', color: '#10B981' },
                { label: 'Mangrove', color: '#F59E0B' },
                { label: 'Sand/Mud', color: '#94A3B8' },
              ]}
            />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>DataCard</h3>
          <div className={styles.componentRow}>
            <DataCard label="Biomass" value={42.5} unit="kg/m²" trend="increasing" />
            <DataCard label="Fish Density" value={18} unit="ind/100m²" trend="decreasing" />
            <DataCard label="pH Level" value={8.1} trend="stable" />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>StatDisplay</h3>
          <div className={styles.componentRow}>
            <StatDisplay label="Total Reef Area" value="1,247" unit="km²" delta={3.2} />
            <StatDisplay label="Mangrove Loss" value="89" unit="ha" delta={-12.4} />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>Sparkline</h3>
          <div className={styles.componentRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-app-xs)', color: 'var(--color-text-secondary)' }}>Biomass trend</span>
              <Sparkline data={[10, 14, 12, 18, 22, 20, 25, 28, 24, 30]} width={120} height={32} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-app-xs)', color: 'var(--color-text-secondary)' }}>Temperature</span>
              <Sparkline data={[26, 27, 28, 29, 28, 27, 26, 25, 26, 27]} width={120} height={32} color="var(--color-viz-4)" />
            </div>
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>LoadingState</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: 280 }}>
            <LoadingState width={280} height={16} />
            <LoadingState width={200} height={16} />
            <LoadingState width={240} height={16} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Layer Controls (DS-009)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>LayerSearch + LayerGroup + LayerRow</h3>
          <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <LayerSearch query={layerSearch} onChange={setLayerSearch} />
            {(['marine', 'coastal'] as const).map((domain) => {
              const domainLayers = layers
                .filter((l) => l.domain === domain)
                .filter((l) => !layerSearch || l.name.toLowerCase().includes(layerSearch.toLowerCase()));
              if (layerSearch && domainLayers.length === 0) return null;
              return (
                <LayerGroup
                  key={domain}
                  group={{ domain, label: domain.charAt(0).toUpperCase() + domain.slice(1), layers: domainLayers, expanded: groups[domain] }}
                  onToggleGroup={() => setGroups((g) => ({ ...g, [domain]: !g[domain] }))}
                >
                  {domainLayers.map((layer) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      onToggle={(id, visible) => setLayers((ls) => ls.map((l) => l.id === id ? { ...l, visible } : l))}
                      onOpacityChange={(id, opacity) => setLayers((ls) => ls.map((l) => l.id === id ? { ...l, opacity } : l))}
                    />
                  ))}
                </LayerGroup>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Layer Interaction (DS-010)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>HoverTooltip + ClickPopup</h3>
          <div style={{ position: 'relative', height: 160, background: 'var(--glass-surface-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            <HoverTooltip
              feature={{ depth: 12.5, name: 'Reef A', cover: 45 }}
              attributes={[
                { field: 'name', label: 'Name', type: 'string' },
                { field: 'depth', label: 'Depth', unit: 'm', type: 'number' },
                { field: 'cover', label: 'Cover', unit: '%', type: 'number' },
              ]}
              position={{ x: 16, y: 16 }}
            />
            {popupOpen && (
              <ClickPopup
                feature={{ depth: 8.2, name: 'Reef B', cover: 62 }}
                attributes={[
                  { field: 'name', label: 'Name', type: 'string' },
                  { field: 'depth', label: 'Depth', unit: 'm', type: 'number' },
                  { field: 'cover', label: 'Cover', unit: '%', type: 'number' },
                ]}
                position={{ x: 220, y: 16 }}
                onClose={() => setPopupOpen(false)}
              />
            )}
            {!popupOpen && (
              <button
                onClick={() => setPopupOpen(true)}
                style={{ position: 'absolute', right: 16, bottom: 16, fontSize: 'var(--font-size-app-xs)', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reopen popup
              </button>
            )}
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>InspectionPanel</h3>
          <div style={{ maxWidth: 320 }}>
            <InspectionPanel
              feature={{ depth: 12.5, name: 'Reef A', cover: 45, substrate: 'Hard coral' }}
              attributes={[
                { field: 'name', label: 'Name', type: 'string' },
                { field: 'depth', label: 'Depth', unit: 'm', type: 'number' },
                { field: 'cover', label: 'Cover', unit: '%', type: 'number' },
                { field: 'substrate', label: 'Substrate', type: 'string' },
              ]}
            />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>AttributeTable</h3>
          <div style={{ maxWidth: 480 }}>
            <AttributeTable
              features={[
                { name: 'Reef A', depth: 12.5, cover: 45 },
                { name: 'Reef B', depth: 8.2, cover: 62 },
                { name: 'Reef C', depth: 18.0, cover: 28 },
                { name: 'Reef D', depth: 5.4, cover: 71 },
              ]}
              attributes={[
                { field: 'name', label: 'Name', type: 'string' },
                { field: 'depth', label: 'Depth', unit: 'm', type: 'number' },
                { field: 'cover', label: 'Cover', unit: '%', type: 'number' },
              ]}
              onSort={() => {}}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>MIMES Domain Visualizations (DS-011)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>EBINVisualizer</h3>
          <EBINVisualizer bins={[
            { binLabel: 'Mangrove', minDepth: -2, maxDepth: 0, ecosystemType: 'mangrove' },
            { binLabel: 'Seagrass', minDepth: 0, maxDepth: 5, ecosystemType: 'seagrass' },
            { binLabel: 'Coral', minDepth: 5, maxDepth: 20, ecosystemType: 'coral' },
            { binLabel: 'Deep Sand', minDepth: 20, maxDepth: 30, ecosystemType: 'sand' },
          ]} />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>FoodWebDiagram</h3>
          <FoodWebDiagram guilds={[
            { id: 'phyto', name: 'Phytoplankton', biomass: 50, preyIds: [] },
            { id: 'zoo', name: 'Zooplankton', biomass: 30, preyIds: ['phyto'] },
            { id: 'herb', name: 'Herbivores', biomass: 20, preyIds: ['phyto'] },
            { id: 'fish', name: 'Reef Fish', biomass: 15, preyIds: ['zoo', 'herb'] },
            { id: 'pred', name: 'Predators', biomass: 8, preyIds: ['fish', 'herb'] },
          ]} />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>StockFlowIndicator</h3>
          <div className={styles.componentRow}>
            <StockFlowIndicator label="Biomass" value={42.5} unit="t/km²" direction="increasing" />
            <StockFlowIndicator label="Catch Rate" value={3.1} unit="t/yr" direction="decreasing" />
            <StockFlowIndicator label="Recruitment" value={0.85} unit="index" direction="stable" />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>BiomassChart</h3>
          <BiomassChart
            data={[
              { date: '2018', values: { phyto: 50, zoo: 30, fish: 15 } },
              { date: '2019', values: { phyto: 52, zoo: 28, fish: 18 } },
              { date: '2020', values: { phyto: 48, zoo: 32, fish: 16 } },
              { date: '2021', values: { phyto: 55, zoo: 35, fish: 20 } },
              { date: '2022', values: { phyto: 53, zoo: 33, fish: 22 } },
            ]}
            guildNames={['phyto', 'zoo', 'fish']}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>TimeSeriesPlayer</h3>
          <div style={{ maxWidth: 400 }}>
            <TimeSeriesPlayer
              start="2018-01" end="2022-12" current="2020-06" step="1M"
              onTimeChange={() => {}} onPlayPause={() => setTsPlaying(!tsPlaying)} playing={tsPlaying}
              speed={tsSpeed} onSpeedChange={setTsSpeed}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scenario + Ecosystem Services (DS-012, DS-013)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>ScenarioSelector</h3>
          <ScenarioSelector
            scenarios={[
              { id: 'baseline', name: 'Baseline', description: 'Current conditions', assumptions: { fishing: 'moderate', protection: 30 } },
              { id: 'mpa', name: 'MPA Expansion', description: 'Expand marine protected areas', assumptions: { fishing: 'low', protection: 60 } },
              { id: 'bau', name: 'Business as Usual', description: 'No policy change', assumptions: { fishing: 'high', protection: 10 } },
            ]}
            activeId={activeScenario}
            onChange={setActiveScenario}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>ParameterCard</h3>
          <div style={{ maxWidth: 280 }}>
            <ParameterCard scenario={{ id: 'mpa', name: 'MPA Expansion', description: 'Expand marine protected areas to 60% coverage', assumptions: { fishing: 'low', protection: 60, enforcement: 'high', timeline: '2025-2030' } }} />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>ComparisonPanel</h3>
          <div style={{ maxWidth: 420 }}>
            <ComparisonPanel
              scenarioA={{ id: 'baseline', name: 'Baseline', description: '', assumptions: { fishing: 'moderate', protection: 30 } }}
              scenarioB={{ id: 'mpa', name: 'MPA Expansion', description: '', assumptions: { fishing: 'low', protection: 60 } }}
            />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>DiffOverlayLegend</h3>
          <div style={{ maxWidth: 280 }}>
            <DiffOverlayLegend min={-50} max={50} unit="% change" scenarioA="Baseline" scenarioB="MPA Expansion" />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>RadarChart</h3>
          <RadarChart
            axes={[
              { name: 'Carbon', value: 0.8 },
              { name: 'Biodiversity', value: 0.6 },
              { name: 'Fisheries', value: 0.9 },
              { name: 'Coastal Protection', value: 0.7 },
              { name: 'Tourism', value: 0.5 },
            ]}
            comparisonAxes={[
              { name: 'Carbon', value: 0.5 },
              { name: 'Biodiversity', value: 0.8 },
              { name: 'Fisheries', value: 0.4 },
              { name: 'Coastal Protection', value: 0.9 },
              { name: 'Tourism', value: 0.7 },
            ]}
            labels={['MPA', 'Baseline']}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>ServiceMatrix</h3>
          <ServiceMatrix
            cells={[
              { ecosystemType: 'Coral', service: 'Fisheries', supply: 0.9 },
              { ecosystemType: 'Coral', service: 'Tourism', supply: 0.8 },
              { ecosystemType: 'Coral', service: 'Coastal Protection', supply: 0.7 },
              { ecosystemType: 'Mangrove', service: 'Fisheries', supply: 0.6 },
              { ecosystemType: 'Mangrove', service: 'Tourism', supply: 0.3 },
              { ecosystemType: 'Mangrove', service: 'Coastal Protection', supply: 0.95 },
              { ecosystemType: 'Seagrass', service: 'Fisheries', supply: 0.4 },
              { ecosystemType: 'Seagrass', service: 'Tourism', supply: 0.2 },
              { ecosystemType: 'Seagrass', service: 'Coastal Protection', supply: 0.5 },
            ]}
            ecosystemTypes={['Coral', 'Mangrove', 'Seagrass']}
            services={['Fisheries', 'Tourism', 'Coastal Protection']}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>NbSScoreCard</h3>
          <div style={{ maxWidth: 360 }}>
            <NbSScoreCard score={{ locationName: 'Turneffe Atoll', restorationPotential: 0.82, conservationValue: 0.71, combinedScore: 0.76 }} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Page Layout + Navigation (DS-014, DS-015)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>SiteSelector</h3>
          <SiteSelector
            sites={[
              { slug: 'turneffe', name: 'Turneffe Atoll' },
              { slug: 'lighthouse', name: 'Lighthouse Reef' },
              { slug: 'glover', name: "Glover's Reef" },
            ]}
            activeSite={activeSite}
            onSelect={setActiveSite}
          />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>HeroSection</h3>
          <HeroSection title="MIDAS Belize" subtitle="Marine Integrated Decision Analysis System for the Belize Barrier Reef" />
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>TeamMemberCard</h3>
          <div className={styles.componentRow} style={{ alignItems: 'flex-start' }}>
            <TeamMemberCard name="Dr. Jane Smith" role="Principal Investigator" institution="University of Belize" bio="Marine ecologist specializing in coral reef systems." />
            <TeamMemberCard name="Dr. Carlos Rivera" role="Co-PI, Modeler" institution="WCS Belize" />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>PublicationCard</h3>
          <div style={{ maxWidth: 400 }}>
            <PublicationCard title="Integrated assessment of Belize's coastal ecosystems" authors={['Smith J', 'Rivera C', 'Chen L']} year={2024} journal="Marine Ecology Progress Series" doi="10.3354/meps14123" />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>TimelineDisplay</h3>
          <div style={{ maxWidth: 400 }}>
            <TimelineDisplay entries={[
              { date: '2020', title: 'Project Launch', description: 'NSF COPES funding secured, team assembled' },
              { date: '2021', title: 'Field Campaign', description: 'First data collection across 3 study sites' },
              { date: '2023', title: 'MIMES Model v1', description: 'Coupled ecological-economic model operational' },
              { date: '2024', title: 'Web Platform', description: 'Interactive GIS decision support tool launched' },
            ]} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Map Chrome (DS-006)</h2>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>FloatingToolbar + ZoomControls + CoordinateDisplay</h3>
          <div className={styles.componentRow} style={{ alignItems: 'flex-start', gap: 'var(--space-6)' }}>
            <FloatingToolbar
              actions={[
                { name: 'draw', icon: 'draw', onClick: () => {}, active: true },
                { name: 'measure', icon: 'measure', onClick: () => {} },
                { name: 'export', icon: 'export', onClick: () => {} },
                { name: 'search', icon: 'search', onClick: () => {} },
              ]}
            />
            <ZoomControls zoom={12} onZoomIn={() => {}} onZoomOut={() => {}} />
            <CoordinateDisplay lat={17.49623} lon={-88.18639} />
          </div>
        </div>

        <div className={styles.componentGroup}>
          <h3 className={styles.iconGroupTitle}>AttributionBar</h3>
          <div style={{ position: 'relative', height: 40, background: 'var(--glass-surface-subtle)', borderRadius: 8, overflow: 'hidden' }}>
            <AttributionBar text="© OpenStreetMap contributors | Imagery © Maxar" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Iconography (DS-008)</h2>
        {[
          { group: 'Layer Types', names: ['layers', 'polygon', 'raster', 'point', 'line'] },
          { group: 'Map Tools', names: ['zoom-in', 'zoom-out', 'draw', 'measure', 'export'] },
          { group: 'Navigation', names: ['menu', 'close', 'back', 'external-link', 'search'] },
          { group: 'Domain', names: ['watershed', 'coastal', 'marine', 'social'] },
          { group: 'UI Controls', names: ['eye', 'eye-off', 'chevron-down', 'chevron-right', 'sun', 'moon', 'grip-vertical', 'map'] },
        ].map(({ group, names }) => (
          <div key={group} className={styles.iconGroup}>
            <h3 className={styles.iconGroupTitle}>{group}</h3>
            <div className={styles.iconRow}>
              {names.map((name) => (
                <div key={name} className={styles.iconCell}>
                  <Icon name={name} size={24} />
                  <code className={styles.iconName}>{name}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Typography Split Scale (DS2-005)</h2>
        <div className={styles.typographyGrid}>
          <div className={styles.typographyColumn}>
            <span className={styles.typographyColumnTitle}>App Scale — 14px base (dense)</span>
            {APP_TYPE_SCALE.map((t) => (
              <div key={t.token} className={styles.typographyRow}>
                <code className={styles.typographyToken}>{t.label}</code>
                <span className={styles.typographySample} style={{ fontSize: t.size }}>
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
          <div className={styles.typographyColumn}>
            <span className={styles.typographyColumnTitle}>Content Scale — 16px base (fluid)</span>
            {CONTENT_TYPE_SCALE.map((t) => (
              <div key={t.token} className={styles.typographyRow}>
                <code className={styles.typographyToken}>{t.label}</code>
                <span className={styles.typographySample} style={{ fontSize: t.size }}>
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Radius (DS2-006)</h2>
        <div className={styles.radiusGrid}>
          {RADIUS_STEPS.map((r) => (
            <div key={r.token} className={styles.radiusCell}>
              <div className={styles.radiusBox} style={{ borderRadius: `var(${r.token})` }} />
              <code className={styles.radiusToken}>{r.label}</code>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Shadow (DS2-006)</h2>
        <div className={styles.shadowGrid}>
          {SHADOW_STEPS.map((s) => (
            <div key={s.token} className={styles.shadowCell}>
              <div className={styles.shadowBox} style={{ boxShadow: `var(${s.token})` }} />
              <code className={styles.shadowToken}>{s.label}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
