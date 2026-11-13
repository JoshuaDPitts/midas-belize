import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentContainer } from '@/components/layout/ContentContainer/ContentContainer';
import { NavBar } from '@/components/layout/NavBar/NavBar';
import { Footer } from '@/components/layout/Footer/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu/MobileMenu';
import { SiteSelector } from '@/components/layout/SiteSelector/SiteSelector';

const navItems = [
  { label: 'Map', href: '/map' },
  { label: 'About', href: '/about' },
  { label: 'Data', href: '/data' },
];

describe('DS-014: ContentContainer', () => {
  it('renders children with max-width wrapper', () => {
    const { container } = render(<ContentContainer><p>Content</p></ContentContainer>);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('accepts className prop', () => {
    const { container } = render(<ContentContainer className="custom">Child</ContentContainer>);
    expect(container.firstChild).toHaveClass('custom');
  });
});

describe('DS-014: NavBar', () => {
  it('renders nav links', () => {
    render(<NavBar navItems={navItems} currentPath="/map" />);
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('uses <a> elements for links', () => {
    render(<NavBar navItems={navItems} currentPath="/map" />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it('highlights current path', () => {
    render(<NavBar navItems={navItems} currentPath="/about" />);
    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toHaveAttribute('data-active', 'true');
  });

  it('fires onToggleTheme when theme button clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<NavBar navItems={navItems} currentPath="/" onToggleTheme={handler} theme="light" />);
    await user.click(screen.getByRole('button', { name: /theme/i }));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('DS-014: Footer', () => {
  it('renders nav links and copyright', () => {
    render(<Footer navItems={navItems} logos={[]} />);
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText(/MIDAS/)).toBeInTheDocument();
  });
});

describe('DS-015: MobileMenu', () => {
  it('renders items when open', () => {
    render(<MobileMenu open={true} onClose={vi.fn()} items={navItems} />);
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MobileMenu open={false} onClose={vi.fn()} items={navItems} />);
    expect(screen.queryByText('Map')).not.toBeInTheDocument();
  });

  it('fires onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<MobileMenu open={true} onClose={handler} items={navItems} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('DS-015: SiteSelector', () => {
  const sites = [
    { slug: 'turneffe', name: 'Turneffe Atoll' },
    { slug: 'lighthouse', name: 'Lighthouse Reef' },
    { slug: 'glover', name: "Glover's Reef" },
  ];

  it('renders all sites', () => {
    render(<SiteSelector sites={sites} activeSite="turneffe" onSelect={vi.fn()} />);
    expect(screen.getByText('Turneffe Atoll')).toBeInTheDocument();
    expect(screen.getByText('Lighthouse Reef')).toBeInTheDocument();
  });

  it('fires onSelect when a site is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<SiteSelector sites={sites} activeSite="turneffe" onSelect={handler} />);
    await user.click(screen.getByText('Lighthouse Reef'));
    expect(handler).toHaveBeenCalledWith('lighthouse');
  });
});
