# Dark Mode Implementation Plan

## Phase 1: Core Infrastructure Setup

- [x] 1. Create ThemeContext and ThemeProvider


  - Create `src/contexts/ThemeContext.tsx` with theme state management
  - Implement localStorage persistence for theme preference
  - Add theme toggle functionality with proper TypeScript interfaces
  - _Requirements: 1.1, 1.4, 5.1, 5.2_



- [ ] 2. Configure Tailwind CSS for dark mode
  - Update `tailwind.config.js` to enable class-based dark mode strategy
  - Define dark mode color variants using #000814 as primary dark color


  - Extend existing color palette with dark mode equivalents
  - _Requirements: 3.1, 3.2_

- [ ] 3. Create DarkModeToggle component
  - Build toggle button component with sun/moon icons using Tabler Icons


  - Position component to be placed below news ticker on homepage
  - Add smooth transition animations and hover effects
  - Implement proper ARIA labels for accessibility
  - _Requirements: 2.1, 2.2_

- [x] 4. Integrate ThemeProvider into application root


  - Wrap main App component with ThemeProvider
  - Apply theme class to document root element
  - Test basic theme switching functionality
  - _Requirements: 1.1, 1.2, 1.3_



## Phase 2: Component Theme Integration

- [ ] 5. Update PageLayout component for theme support
  - Modify PageLayout to consume ThemeContext
  - Apply theme-specific background and text classes
  - Ensure Header and Footer inherit theme properly
  - _Requirements: 4.2, 4.3_

- [ ] 6. Update Header component with dark mode styles
  - Apply dark mode classes to header background and navigation
  - Ensure logo and navigation items are visible in dark mode
  - Maintain existing responsive behavior and animations


  - _Requirements: 3.3, 4.2_

- [x] 7. Update homepage components for dark mode



  - Apply dark mode styles to NewsTicker component
  - Update TeamStatus component with dark mode colors
  - Modify GameCards component for dark theme compatibility
  - Update LeagueTable component with appropriate dark colors
  - _Requirements: 3.3, 4.1, 4.2_

- [ ] 8. Add DarkModeToggle to homepage
  - Position toggle button below NewsTicker component
  - Ensure proper spacing and alignment with existing layout
  - Test toggle functionality on homepage
  - _Requirements: 2.1, 2.3_

## Phase 3: Page-Specific Dark Mode Implementation

- [ ] 9. Implement dark mode for News page
  - Update news article cards with dark mode styling
  - Apply dark theme to category filters and search components
  - Ensure news modal component supports dark mode
  - _Requirements: 4.1, 4.2_

- [ ] 10. Implement dark mode for Teams page
  - Update team cards with dark mode background and text colors
  - Apply dark theme to team information sections
  - Maintain card hover effects and animations in dark mode
  - _Requirements: 4.1, 4.2_

- [ ] 11. Implement dark mode for Shop page
  - Update product category cards with dark mode styling
  - Apply dark theme to coming soon banner and newsletter signup
  - Ensure all interactive elements remain visible
  - _Requirements: 4.1, 4.2_

- [ ] 12. Implement dark mode for Contact page
  - Update contact form with dark mode input styling
  - Apply dark theme to contact information cards
  - Ensure map container has appropriate dark mode styling
  - Maintain form validation and submission functionality
  - _Requirements: 4.1, 4.2_

## Phase 4: UI Components and Forms

- [ ] 13. Update form components for dark mode
  - Apply dark mode styles to input fields, textareas, and select elements
  - Ensure form validation messages are visible in dark mode
  - Update button styles to work with dark theme
  - _Requirements: 3.2, 3.4_

- [ ] 14. Update card components and modals
  - Apply dark mode styling to all card components
  - Update modal backgrounds and content for dark theme
  - Ensure proper contrast for all text and interactive elements
  - _Requirements: 3.2, 4.2_

- [ ] 15. Update navigation and footer components
  - Apply dark mode styles to mobile navigation
  - Update footer component with dark theme colors
  - Ensure all links and social media icons are visible
  - _Requirements: 4.2, 4.3_

## Phase 5: Testing and Refinement

- [ ] 16. Implement comprehensive theme persistence testing
  - Test localStorage functionality across browser sessions
  - Verify theme preference survives page refreshes
  - Test behavior when localStorage is unavailable
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 17. Validate accessibility and contrast ratios
  - Test color contrast ratios meet WCAG guidelines
  - Verify keyboard navigation works in both themes
  - Ensure screen reader compatibility with theme toggle
  - _Requirements: 3.2, 2.2_

- [ ] 18. Cross-page theme consistency testing
  - Test theme switching on all pages (Home, News, Teams, Shop, Contact)
  - Verify theme persistence when navigating between pages
  - Ensure all components inherit theme properly
  - _Requirements: 4.1, 4.3_

- [ ] 19. Performance optimization and final polish
  - Optimize theme switching performance to minimize re-renders
  - Add smooth transition animations for theme changes
  - Test across different devices and browsers
  - _Requirements: 3.4_

- [ ] 20. Create comprehensive documentation
  - Document theme usage for future development
  - Create style guide for dark mode color usage
  - Add comments to theme-related code for maintainability
  - _Requirements: All requirements covered_