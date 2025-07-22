'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

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

interface SponsorCardProps {
  sponsor: Sponsor
  index: number
  isMainSponsor?: boolean
}

export default function SponsorCard({ sponsor, index, isMainSponsor = false }: SponsorCardProps) {
  const { name, logo, website_url, beschreibung, kategorie } = sponsor.attributes
  const logoUrl = logo?.data?.attributes?.url
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

  const handleClick = () => {
    if (website_url) {
      window.open(website_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (isMainSponsor) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        className="relative group cursor-pointer"
        onClick={handleClick}
      >
        <div className="bg-gradient-to-br from-viktoria-yellow/20 to-viktoria-blue/20 backdrop-blur-md rounded-2xl border-2 border-viktoria-yellow/30 p-8 md:p-12 transition-all duration-500 hover:shadow-2xl hover:border-viktoria-yellow/50 hover:scale-[1.02]">
          {/* Hauptsponsor Badge */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-viktoria-yellow text-viktoria-dark px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              HAUPTSPONSOR
            </div>
          </div>

          {/* Logo Container */}
          <div className="relative h-24 md:h-32 mb-6 flex items-center justify-center">
            {logoUrl ? (
              <Image
                src={`${baseUrl}${logoUrl}`}
                alt={logo.data.attributes.alternativeText || name}
                fill
                className="object-contain filter group-hover:brightness-110 transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-viktoria-yellow">{name}</span>
              </div>
            )}
          </div>

          {/* Sponsor Info */}
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{name}</h3>
            {beschreibung && (
              <p className="text-white/80 text-sm md:text-base line-clamp-2">{beschreibung}</p>
            )}
          </div>

          {/* External Link Icon */}
          {website_url && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ExternalLink className="w-5 h-5 text-viktoria-yellow" />
            </div>
          )}

          {/* Hover Glow Effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-viktoria-yellow/10 via-transparent to-viktoria-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative group cursor-pointer"
      onClick={handleClick}
    >
      <div className="bg-white/10 dark:bg-white/[0.02] backdrop-blur-md rounded-xl border border-white/20 dark:border-white/[0.03] p-4 md:p-6 transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/[0.04] shadow-xl hover:shadow-2xl shadow-black/15 hover:shadow-black/25 dark:shadow-white/[0.20] dark:hover:shadow-white/[0.30] hover:scale-[1.02] hover:border-viktoria-yellow/30">
        {/* Category Badge */}
        {kategorie === 'premium' && (
          <div className="absolute -top-2 -right-2">
            <div className="bg-viktoria-blue text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
              PREMIUM
            </div>
          </div>
        )}

        {/* Logo Container */}
        <div className="relative h-16 md:h-20 mb-3 flex items-center justify-center">
          {logoUrl ? (
            <Image
              src={`${baseUrl}${logoUrl}`}
              alt={logo.data.attributes.alternativeText || name}
              fill
              className="object-contain filter group-hover:brightness-110 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-viktoria-yellow">{name}</span>
            </div>
          )}
        </div>

        {/* Sponsor Name */}
        <div className="text-center">
          <h4 className="text-sm md:text-base font-semibold text-white group-hover:text-viktoria-yellow transition-colors duration-300">
            {name}
          </h4>
        </div>

        {/* External Link Icon */}
        {website_url && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ExternalLink className="w-4 h-4 text-viktoria-yellow" />
          </div>
        )}

        {/* Hover Effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-viktoria-yellow/5 to-viktoria-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  )
}