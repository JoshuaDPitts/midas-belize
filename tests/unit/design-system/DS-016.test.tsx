import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/layout/HeroSection/HeroSection';
import { TeamMemberCard } from '@/components/layout/TeamMemberCard/TeamMemberCard';
import { PublicationCard } from '@/components/layout/PublicationCard/PublicationCard';
import { TimelineDisplay } from '@/components/layout/TimelineDisplay/TimelineDisplay';
import { SiteIdentity } from '@/components/layout/SiteIdentity/SiteIdentity';

describe('DS-016: HeroSection', () => {
  it('renders title', () => {
    render(<HeroSection title="MIDAS Belize" />);
    expect(screen.getByText('MIDAS Belize')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<HeroSection title="MIDAS" subtitle="Marine Decision Support" />);
    expect(screen.getByText('Marine Decision Support')).toBeInTheDocument();
  });
});

describe('DS-016: TeamMemberCard', () => {
  it('renders name, role, and institution', () => {
    render(<TeamMemberCard name="Dr. Jane Doe" role="Lead Scientist" institution="UB" />);
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Lead Scientist')).toBeInTheDocument();
    expect(screen.getByText('UB')).toBeInTheDocument();
  });

  it('renders bio when provided', () => {
    render(<TeamMemberCard name="Jane" role="PI" institution="UB" bio="Marine biologist." />);
    expect(screen.getByText('Marine biologist.')).toBeInTheDocument();
  });
});

describe('DS-016: PublicationCard', () => {
  it('renders title, authors, year, and journal', () => {
    render(<PublicationCard title="Coral Reef Dynamics" authors={['Smith J', 'Doe A']} year={2024} journal="Marine Ecology" />);
    expect(screen.getByText('Coral Reef Dynamics')).toBeInTheDocument();
    expect(screen.getByText(/Smith J/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Marine Ecology/)).toBeInTheDocument();
  });

  it('renders DOI link when provided', () => {
    render(<PublicationCard title="Test" authors={['A']} year={2024} journal="J" doi="10.1234/test" />);
    const link = screen.getByText(/10\.1234/);
    expect(link.closest('a')).toHaveAttribute('href', 'https://doi.org/10.1234/test');
  });
});

describe('DS-016: TimelineDisplay', () => {
  const entries = [
    { date: '2020', title: 'Project Launch', description: 'Initial funding secured' },
    { date: '2022', title: 'Field Campaign', description: 'First data collection' },
  ];

  it('renders all entries', () => {
    render(<TimelineDisplay entries={entries} />);
    expect(screen.getByText('Project Launch')).toBeInTheDocument();
    expect(screen.getByText('Field Campaign')).toBeInTheDocument();
  });

  it('shows dates', () => {
    render(<TimelineDisplay entries={entries} />);
    expect(screen.getByText('2020')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
  });
});

describe('DS-017: SiteIdentity', () => {
  it('renders logo images', () => {
    render(<SiteIdentity logos={[{ src: '/logo.png', alt: 'MIDAS', href: '/' }]} />);
    expect(screen.getByAltText('MIDAS')).toBeInTheDocument();
  });
});
