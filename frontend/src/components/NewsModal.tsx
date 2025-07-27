'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconClock, IconTag, IconShare } from '@tabler/icons-react'
import { NewsArtikel } from '@/types/strapi'
import Image from 'next/image'
import { getApiUrl } from '@/lib/apiConfig'

interface NewsModalProps {
  article: NewsArtikel | null
  isOpen: boolean
  onClose: () => void
}

export default function NewsModal({ article, isOpen, onClose }: NewsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Render article content
  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return (
        <div className="prose prose-lg max-w-none">
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )
    }
    
    // Handle Strapi blocks format
    if (Array.isArray(content)) {
      return (
        <div className="prose prose-lg max-w-none">
          {content.map((block: any, index: number) => {
            if (block.type === 'paragraph') {
              return (
                <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {block.children?.map((child: any) => child.text).join('') || ''}
                </p>
              )
            }
            return null
          })}
        </div>
      )
    }

    return (
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {content.toString()}
        </p>
      </div>
    )
  }

  if (!article) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 border border-white/20 hover:border-white/30 rounded-full transition-colors duration-300"
            >
              <IconX className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Modal Content */}
            <div 
              className="overflow-y-auto max-h-[90vh]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) rgb(243 244 246)'
              }}
            >
              {/* Header Image */}
              {((article.titelbild && article.titelbild.url) || (article.attributes?.titelbild?.data)) && (
                <div className="relative h-48 md:h-64 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden">
                  <Image
                    src={`${getApiUrl()}${
                      article.titelbild?.url || article.attributes?.titelbild?.data?.attributes?.url
                    }`}
                    alt={
                      article.titelbild?.alternativeText || 
                      article.attributes?.titelbild?.data?.attributes?.alternativeText || 
                      article.titel || 
                      article.attributes?.titel || 
                      'News Artikel'
                    }
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Article Content */}
              <div className="p-6 md:p-8 space-y-6">
                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <IconClock className="w-4 h-4 mr-2 text-viktoria-blue dark:text-viktoria-yellow" />
                    <span>
                      {new Date(article.datum || article.attributes?.datum || '').toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  
                  {((article.kategorie && article.kategorie.name) || (article.attributes?.kategorie?.data)) && (
                    <div className="flex items-center">
                      <IconTag className="w-4 h-4 mr-2 text-viktoria-blue dark:text-viktoria-yellow" />
                      <span className="bg-viktoria-yellow/20 dark:bg-viktoria-yellow/10 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                        {article.kategorie?.name || article.attributes?.kategorie?.data?.attributes?.name || 'Keine Kategorie'}
                      </span>
                    </div>
                  )}

                  <button className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <IconShare className="w-4 h-4 mr-2 text-viktoria-blue dark:text-viktoria-yellow" />
                    <span>Teilen</span>
                  </button>
                </div>

                {/* Title */}
                <h1 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide leading-tight">
                  {article.titel || article.attributes?.titel || 'Unbekannter Titel'}
                </h1>

                {/* Content */}
                <div className="space-y-4">
                  {renderContent(article.inhalt || article.attributes?.inhalt)}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 