'use client'

import { useState } from 'react'
import { IconMenu2, IconX, IconBallFootball, IconNews, IconUsers, IconShirt, IconMail, IconTrophy, IconInfoCircle, IconHistory, IconUserCheck, IconHeart, IconBuilding, IconScale, IconShield, IconFileText, IconLogin, IconLogout, IconUser } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, useAuthStatus } from '@/contexts/AuthContext'
import Image from "next/image";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuth()

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  // Hauptnavigation - erscheint im Desktop-Header und als große Buttons im Hamburger-Menü
  const mainNavigationItems = [
    { href: '/', label: 'Home', icon: IconBallFootball, description: 'Zur Startseite' },
    { href: '/news', label: 'News', icon: IconNews, description: 'Aktuelle Nachrichten' },
    { href: '/teams', label: 'Teams', icon: IconUsers, description: 'Unsere Mannschaften' },
    { href: '/shop', label: 'Shop', icon: IconShirt, description: 'Fanartikel & Mehr' },
    { href: '/kontakt', label: 'Kontakt', icon: IconMail, description: 'Kontaktiere uns' },
  ]

  // Sekundärnavigation - nur als kleine Textlinks im Hamburger-Menü und Footer
  const secondaryNavigationItems = [
    { href: '/ueber-uns', label: 'Über uns', icon: IconInfoCircle },
    { href: '/geschichte', label: 'Geschichte', icon: IconHistory },
    { href: '/vorstand', label: 'Vorstand', icon: IconUserCheck },
    { href: '/mitgliedschaft', label: 'Mitgliedschaft', icon: IconHeart },
    { href: '/sponsoren', label: 'Sponsoren', icon: IconBuilding },
    { href: '/impressum', label: 'Impressum', icon: IconScale },
    { href: '/datenschutz', label: 'Datenschutz', icon: IconShield },
    { href: '/agb', label: 'AGB', icon: IconFileText },
    { href: '/satzung', label: 'Satzung', icon: IconFileText },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-transparent dark:to-transparent dark:bg-white/[0.02] backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="container">
          {/* Mobile Layout - unchanged */}
          <div className="grid grid-cols-3 items-center lg:hidden" style={{ height: '70px' }}>
            {/* Logo - Links */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="flex-shrink-0 logo-container">
                  <Image 
                    src="/viktorialogo.png" 
                    alt="Viktoria Wertheim Logo"
                    width={48}
                    height={48}
                    className="object-contain drop-shadow-lg"
                    style={{ 
                      filter: 'contrast(1.1) brightness(1.05)',
                      width: '48px',
                      height: '48px'
                    }}
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* Titel - Mitte */}
            <div className="flex justify-center">
              <Link href="/" className="flex items-center" style={{ gap: '6px' }}>
                <span className="font-semibold text-viktoria-yellow text-3xl md:text-4xl font-permanent-marker header-text large-sv">SV</span>
                <div className="flex flex-col justify-center stacked-container">
                  <span className="font-semibold text-white text-base md:text-lg font-permanent-marker header-text stacked-text">VIKTORIA</span>
                  <span className="font-semibold text-white text-base md:text-lg font-permanent-marker header-text stacked-text">WERTHEIM</span>
                </div>
              </Link>
            </div>

            {/* Navigation - Rechts */}
            <div className="flex justify-end">
              {/* Hamburger Menu Button - mobile only */}
              <button
                onClick={toggleMenu}
                className="touch-target text-white hover:text-viktoria-yellow transition-colors"
                aria-label="Menü öffnen"
              >
                {isMenuOpen ? <IconX size={24} className="text-white hover:text-viktoria-yellow transition-colors" /> : <IconMenu2 size={24} className="text-white hover:text-viktoria-yellow transition-colors" />}
              </button>
            </div>
          </div>

          {/* Desktop Layout - nur Hauptnavigation */}
          <div className="hidden lg:grid grid-cols-3 items-center" style={{ height: '70px' }}>
            {/* Logo + Brand Text - Left */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Image 
                    src="/viktorialogo.png" 
                    alt="Viktoria Wertheim Logo"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain drop-shadow-sm"
                    style={{ 
                      filter: 'contrast(1.1) brightness(1.05)'
                    }}
                    priority
                  />
                </div>
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <span className="font-semibold text-viktoria-yellow text-2xl font-permanent-marker header-text large-sv">SV</span>
                  <div className="flex flex-col justify-center stacked-container">
                    <span className="font-semibold text-white text-base font-permanent-marker header-text stacked-text">VIKTORIA</span>
                    <span className="font-semibold text-white text-base font-permanent-marker header-text stacked-text">WERTHEIM</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Center Section - Empty */}
            <div></div>

            {/* Desktop Navigation - Right - NUR Hauptnavigation */}
            <div className="flex items-center justify-end space-x-4">
              <nav className="flex items-center space-x-1">
                {mainNavigationItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'text-viktoria-yellow'
                          : 'text-white hover:bg-white/10 hover:text-viktoria-yellow'
                      }`}
                    >
                      <Icon 
                        size={20} 
                        className={`transition-colors duration-300 ${
                          isActive
                            ? 'text-viktoria-yellow'
                            : 'text-white group-hover:text-viktoria-yellow'
                        }`}
                      />
                      <span 
                        className={`font-medium text-sm transition-colors duration-300 ${
                          isActive
                            ? 'text-viktoria-yellow'
                            : 'text-white group-hover:text-viktoria-yellow'
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>

              {/* Auth Section */}
              <div className="flex items-center space-x-2">
                {isAuthenticated ? (
                  <div className="relative flex items-center space-x-2">
                    {/* User Menu */}
                    <div className="relative group">
                      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300">
                        <IconUser size={16} className="text-viktoria-yellow" />
                        <span className="text-white text-sm font-medium">
                          {user?.mitglied?.attributes?.vorname || user?.username || 'Mitglied'}
                        </span>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Invisible bridge to prevent gap */}
                      <div className="absolute right-0 top-full w-48 h-2 z-40"></div>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50" style={{ top: 'calc(100% + 2px)' }}>
                        <div className="py-2">
                          <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span>🏠</span>
                              <span>Dashboard</span>
                            </div>
                          </Link>
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span>👤</span>
                              <span>Mein Profil</span>
                            </div>
                          </Link>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <IconLogout size={16} />
                              <span>Abmelden</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/login"
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-viktoria-yellow transition-all duration-300"
                    >
                      <IconLogin size={16} />
                      <span className="text-sm font-medium">Login</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Glassmorphism Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Enhanced Overlay with Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-black/30 backdrop-blur-md z-40"
            />

            {/* Modern Sidebar */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.6
              }}
              className="fixed top-0 right-0 bottom-0 w-80 z-50"
            >
              {/* Glassmorphism Background */}
              <div className="h-full bg-white/95 dark:bg-viktoria-dark-light/95 backdrop-blur-xl border-l border-white/20 dark:border-viktoria-dark-lighter/50 shadow-2xl">
                
                {/* Header Section */}
                <div className="relative p-4 border-b border-gray-100/50 dark:border-viktoria-dark-lighter/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light dark:from-viktoria-yellow dark:to-viktoria-yellow rounded-lg flex items-center justify-center">
                        <IconTrophy size={16} className="text-viktoria-yellow dark:text-viktoria-dark" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Navigation</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SV Viktoria Wertheim</p>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleMenu}
                      className="w-8 h-8 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-viktoria-dark-lighter/80 dark:hover:bg-viktoria-dark-lighter rounded-lg flex items-center justify-center transition-all duration-200"
                      aria-label="Menü schließen"
                    >
                      <IconX size={16} className="text-gray-600 dark:text-gray-300" />
                    </motion.button>
                  </div>
                </div>

                {/* Hauptnavigation - große Buttons */}
                <div className="p-4 pt-4">
                  <nav className="space-y-0.5">
                    {mainNavigationItems.map((item, index) => {
                      const isActive = pathname === item.href
                      const Icon = item.icon
                      
                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: index * 0.1 + 0.2,
                            duration: 0.5,
                            ease: "easeOut"
                          }}
                        >
                          <Link
                            href={item.href}
                            onClick={toggleMenu}
                            className={`group relative flex items-center p-2.5 rounded-xl transition-all duration-300 ${
                              isActive
                                ? 'bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-viktoria-yellow dark:to-viktoria-yellow text-white dark:text-viktoria-dark shadow-lg shadow-viktoria-blue/25 dark:shadow-viktoria-yellow/25'
                                : 'hover:bg-gray-100/80 dark:hover:bg-viktoria-dark-lighter/80 text-gray-700 dark:text-gray-300 hover:text-viktoria-blue dark:hover:text-viktoria-yellow'
                            }`}
                          >
                            {/* Icon Container */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 ${
                              isActive
                                ? 'bg-white/20 backdrop-blur-sm'
                                : 'bg-gray-100/80 dark:bg-viktoria-dark-lighter/80 group-hover:bg-viktoria-blue/10 dark:group-hover:bg-viktoria-yellow/10'
                            }`}>
                              <Icon 
                                size={16} 
                                className={`transition-all duration-300 ${
                                  isActive
                                    ? 'text-viktoria-yellow dark:text-viktoria-dark'
                                    : 'text-gray-600 dark:text-gray-300 group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow'
                                }`}
                              />
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-sm transition-colors duration-300 ${
                                isActive ? 'text-white dark:text-viktoria-dark' : 'text-gray-800 dark:text-gray-300 group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow'
                              }`}>
                                {item.label}
                              </h3>
                              <p className={`text-xs transition-colors duration-300 ${
                                isActive ? 'text-white/80 dark:text-viktoria-dark/80' : 'text-gray-500 dark:text-gray-400 group-hover:text-viktoria-blue/70 dark:group-hover:text-viktoria-yellow/70'
                              }`}>
                                {item.description}
                              </p>
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                              <motion.div
                                layoutId="activeIndicator"
                                className="absolute right-3 w-2 h-2 bg-viktoria-yellow rounded-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}

                            {/* Hover Arrow */}
                            {!isActive && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-viktoria-blue ml-2">
                                →
                              </div>
                            )}
                          </Link>
                        </motion.div>
                      )
                    })}
                  </nav>
                </div>

                {/* Auth Section */}
                <div className="px-4 pb-3">
                  <div className="border-t border-gray-200/50 dark:border-viktoria-dark-lighter/50 pt-3">
                    {isAuthenticated ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="space-y-3"
                      >
                        {/* User Info */}
                        <div className="flex items-center space-x-3 p-3 bg-viktoria-blue/10 rounded-xl">
                          <div className="w-10 h-10 bg-viktoria-blue rounded-xl flex items-center justify-center">
                            <IconUser size={18} className="text-viktoria-yellow" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-800">
                              {user?.mitglied?.attributes?.vorname && user?.mitglied?.attributes?.nachname
                                ? `${user.mitglied.attributes.vorname} ${user.mitglied.attributes.nachname}`
                                : user?.username || 'Mitglied'
                              }
                            </h3>
                            <p className="text-xs text-gray-500">
                              {user?.mitglied?.attributes?.mitgliedstyp || 'Vereinsmitglied'}
                            </p>
                          </div>
                        </div>

                        {/* Logout Button */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-300"
                        >
                          <IconLogout size={16} />
                          <span className="text-sm font-medium">Abmelden</span>
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="space-y-2"
                      >
                        <Link
                          href="/login"
                          onClick={toggleMenu}
                          className="w-full flex items-center justify-center space-x-2 p-3 bg-viktoria-blue hover:bg-viktoria-blue-light text-white rounded-xl transition-all duration-300"
                        >
                          <IconLogin size={16} />
                          <span className="text-sm font-medium">Anmelden</span>
                        </Link>
                        <Link
                          href="/register"
                          onClick={toggleMenu}
                          className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-300"
                        >
                          <IconUserCheck size={16} />
                          <span className="text-sm font-medium">Registrieren</span>
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Sekundärnavigation - kleine Textlinks unten */}
                <div className="px-4 pb-16">
                  <div className="border-t border-gray-200/50 dark:border-viktoria-dark-lighter/50 pt-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Vereinsinformationen
                    </h3>
                    <div className="grid grid-cols-2 gap-1">
                      {secondaryNavigationItems.map((item, index) => {
                        const isActive = pathname === item.href
                        
                        return (
                          <motion.div
                            key={item.href}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: (mainNavigationItems.length * 0.1) + (index * 0.05) + 0.4,
                              duration: 0.3,
                              ease: "easeOut"
                            }}
                          >
                            <Link
                              href={item.href}
                              onClick={toggleMenu}
                              className={`block px-2 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                                isActive
                                  ? 'text-viktoria-blue dark:text-viktoria-yellow font-medium bg-viktoria-blue/10 dark:bg-viktoria-yellow/10'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-viktoria-blue dark:hover:text-viktoria-yellow hover:bg-gray-100/80 dark:hover:bg-viktoria-dark-lighter/80'
                              }`}
                            >
                              {item.label}
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <div className="w-5 h-5 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-lg flex items-center justify-center">
                        <IconTrophy size={10} className="text-viktoria-yellow" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Seit 1945</span>
                    </div>
                    <p className="text-xs text-gray-500">Tradition • Leidenschaft • Gemeinschaft</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
} 