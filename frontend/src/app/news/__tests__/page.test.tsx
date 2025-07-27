import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import NewsPage from '../page'

// Mock the strapi service
jest.mock('@/lib/strapi', () => ({
  strapi: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: []
      }
    })
  }
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

// Mock components
jest.mock('@/components/PageLayout', () => {
  return function MockPageLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-layout">{children}</div>
  }
})

jest.mock('@/components/AnimatedSection', () => {
  return function MockAnimatedSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="animated-section">{children}</div>
  }
})

jest.mock('@/components/NewsModal', () => {
  return function MockNewsModal() {
    return <div data-testid="news-modal" />
  }
})

describe('News Page Design Standards', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  test('renders news page with loading state initially', async () => {
    render(<NewsPage />)
    
    // Should show loading state initially
    expect(screen.getByText('Nachrichten werden geladen...')).toBeInTheDocument()
  })

  test('applies standardized card title styling', async () => {
    // Mock news articles data
    const mockArticles = [
      {
        id: 1,
        titel: 'Test Article',
        inhalt: 'Test content',
        datum: '2024-01-01',
        kategorie: { name: 'Test Category' },
        titelbild: null
      }
    ]

    const mockStrapi = require('@/lib/strapi')
    mockStrapi.strapi.get.mockResolvedValue({
      data: {
        data: mockArticles
      }
    })

    render(<NewsPage />)

    // Wait for the component to load
    await screen.findByText('Test Article')

    // Check if the title has the correct classes for standardized styling
    const titleElement = screen.getByText('Test Article')
    expect(titleElement).toHaveClass('text-sm', 'md:text-base', 'font-semibold', 'uppercase', 'tracking-wide')
    expect(titleElement).toHaveClass('text-gray-800', 'dark:text-gray-100')
  })

  test('applies Viktoria color palette to category filters', async () => {
    const mockCategories = [
      { id: 1, attributes: { name: 'Sport' } },
      { id: 2, attributes: { name: 'News' } }
    ]

    const mockStrapi = require('@/lib/strapi')
    mockStrapi.strapi.get
      .mockResolvedValueOnce({ data: { data: [] } }) // news articles
      .mockResolvedValueOnce({ data: { data: mockCategories } }) // categories

    render(<NewsPage />)

    // Wait for categories to load
    await screen.findByText('Sport')

    // Check if category buttons use Viktoria colors
    const sportButton = screen.getByText('Sport')
    expect(sportButton.className).toContain('bg-white/10')
    expect(sportButton.className).toContain('backdrop-blur-sm')
  })

  test('uses glassmorphism container styling for empty state', async () => {
    const mockStrapi = require('@/lib/strapi')
    mockStrapi.strapi.get.mockResolvedValue({
      data: {
        data: []
      }
    })

    render(<NewsPage />)

    // Wait for empty state to appear
    await screen.findByText('Keine News-Artikel gefunden')

    // Check if empty state container uses glassmorphism styling
    const emptyStateContainer = screen.getByText('Keine News-Artikel gefunden').closest('div')
    expect(emptyStateContainer).toHaveClass('bg-gray-100/11', 'dark:bg-white/[0.012]', 'backdrop-blur-xl')
  })
})