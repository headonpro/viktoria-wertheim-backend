'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import PageLayout from '@/components/PageLayout'
import AnimatedSection from '@/components/AnimatedSection'
import { Clock, Tag, ArrowLeft, Share2, Eye } from 'lucide-react'
import { strapi } from '@/lib/strapi'
import { NewsArtikel } from '@/types/strapi'
import Link from 'next/link'
import Image from 'next/image'



export default function NewsArticlePage() {
  const params = useParams()
  const id = params.id as string
  const [article, setArticle] = useState<NewsArtikel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch single news article
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true)
        
        const response = await strapi.get(`/news-artikels/${id}`, {
          params: {
            populate: ['titelbild', 'kategorie']
          }
        })

        // Use API data
        const apiArticle = response.data.data
        setArticle(apiArticle || null)
        if (!apiArticle) {
          setError('Artikel nicht gefunden')
        }
      } catch (err) {
        console.error('Error fetching article:', err)
        setArticle(null)
        setError('Artikel nicht gefunden')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchArticle()
    }
  }, [id])

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <AnimatedSection className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Artikel wird geladen...</p>
          </div>
        </AnimatedSection>
      </PageLayout>
    )
  }

  // Error state
  if (error || !article) {
    return (
      <PageLayout>
        <AnimatedSection className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link 
              href="/news" 
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Nachrichten
            </Link>
          </div>
        </AnimatedSection>
      </PageLayout>
    )
  }

  // Render article content
  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return (
        <div className="prose prose-lg max-w-none">
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
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
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
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
        <p className="text-gray-700 leading-relaxed">
          {content.toString()}
        </p>
      </div>
    )
  }

  return (
    <PageLayout>
      <div className="container space-y-8">
        {/* Back Button */}
        <AnimatedSection delay={0.1}>
          <Link 
            href="/news"
            className="inline-flex items-center text-gray-600 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zu Nachrichten
          </Link>
        </AnimatedSection>

        {/* Article Header */}
        <AnimatedSection delay={0.2}>
          <div className="bg-white/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 space-y-6">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {new Date(article.attributes?.datum || '').toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
              
              {article.attributes?.kategorie?.data && (
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  <span className="bg-gray-700/10 text-gray-700 px-3 py-1 rounded-full">
                    {article.attributes.kategorie.data.attributes.name}
                  </span>
                </div>
              )}

              <button className="flex items-center hover:text-gray-700 transition-colors">
                <Share2 className="w-4 h-4 mr-2" />
                <span>Teilen</span>
              </button>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-permanent-marker text-gray-700 leading-tight">
              {article.attributes?.titel}
            </h1>
          </div>
        </AnimatedSection>

        {/* Article Image */}
        {article.attributes?.titelbild?.data && (
          <AnimatedSection delay={0.3}>
            <div className="relative h-64 md:h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${article.attributes.titelbild.data.attributes.url}`}
                alt={article.attributes.titelbild.data.attributes.alternativeText || article.attributes.titel}
                fill
                className="object-cover"
              />
            </div>
          </AnimatedSection>
        )}

        {/* Article Content */}
        <AnimatedSection delay={0.4}>
          <div className="bg-white/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
            {renderContent(article.attributes?.inhalt)}
          </div>
        </AnimatedSection>

        {/* Back to News Button */}
        <AnimatedSection delay={0.5}>
          <div className="text-center">
            <Link 
              href="/news"
              className="inline-flex items-center bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu allen Nachrichten
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </PageLayout>
  )
} 