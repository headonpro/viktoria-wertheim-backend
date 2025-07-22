'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SponsorCard from './SponsorCard'

interface Sponsor {
  id: number
  attributes: {
    name: string
    logo: {
      data: {
        attributes: {
          url: string
          alternativeText?: string
        }
      }
    }
    website_url?: string
    beschreibung?: string
    kategorie: 'hauptsponsor' | 'premium' | 'partner'
    reihenfolge: number
  }
}

interface SponsorCarouselProps {
  sponsors: Sponsor[]
}

export default function SponsorCarousel({ sponsors }: SponsorCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || sponsors.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsors.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, sponsors.length])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sponsors.length)
    setIsAutoPlaying(false)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + sponsors.length) % sponsors.length)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  if (sponsors.length === 0) return null

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full"
          >
            <SponsorCard 
              sponsor={sponsors[currentIndex]} 
              index={0}
              isMainSponsor={sponsors[currentIndex].attributes.kategorie === 'hauptsponsor'}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {sponsors.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-300 hover:scale-110"
            aria-label="Vorheriger Sponsor"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-300 hover:scale-110"
            aria-label="Nächster Sponsor"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sponsors.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {sponsors.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-viktoria-yellow scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Zu Sponsor ${index + 1} wechseln`}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      {isAutoPlaying && sponsors.length > 1 && (
        <div className="absolute top-2 right-2">
          <div className="bg-viktoria-yellow/20 backdrop-blur-sm rounded-full px-2 py-1">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-viktoria-yellow rounded-full animate-pulse" />
              <span className="text-xs text-viktoria-yellow font-medium">AUTO</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}