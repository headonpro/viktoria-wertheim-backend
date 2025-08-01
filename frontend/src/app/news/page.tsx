'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PageLayout from '@/components/PageLayout'
import AnimatedSection from '@/components/AnimatedSection'
import NewsModal from '@/components/NewsModal'
import { IconClock, IconTag, IconEye, IconArrowRight, IconFilter, IconChevronDown } from '@tabler/icons-react'
import { strapi } from '@/lib/strapi'
import { NewsArtikel, Kategorie, StrapiBlock } from '@/types/strapi'
import Image from 'next/image'
import { getApiUrl } from '@/lib/apiConfig'



// Utility functions for handling both Strapi 5 and legacy formats
function getKategorieName(article: NewsArtikel): string {
  if (!article) {
    return 'Keine Kategorie';
  }
  
  // Handle Strapi 5 format (direct properties)
  if (article.kategorie && typeof article.kategorie === 'object' && 'name' in article.kategorie) {
    return article.kategorie.name || 'Unbekannt';
  }
  
  // Handle legacy format (attributes wrapper)
  if (article.attributes && article.attributes.kategorie) {
    const kategorie = article.attributes.kategorie;
    if (kategorie.data && kategorie.data.attributes && kategorie.data.attributes.name) {
      return kategorie.data.attributes.name;
    }
  }
  
  return 'Keine Kategorie';
}

function getArticleTitle(article: NewsArtikel): string {
  return article.titel || (article.attributes && article.attributes.titel) || '';
}

function getArticleContent(article: NewsArtikel): string {
  const content = article.inhalt || (article.attributes && article.attributes.inhalt);
  
  // Handle Strapi 5 blocks format
  if (Array.isArray(content)) {
    return content
      .map(block => {
        if (block.children && Array.isArray(block.children)) {
          return block.children.map(child => child.text || '').join('');
        }
        return '';
      })
      .join('\n\n');
  }
  
  // Handle string content
  return typeof content === 'string' ? content : '';
}

function getArticleDate(article: NewsArtikel): string {
  return article.datum || (article.attributes && article.attributes.datum) || '';
}

function getArticleImage(article: NewsArtikel) {
  // Handle Strapi 5 format
  if (article.titelbild && typeof article.titelbild === 'object' && 'url' in article.titelbild) {
    return article.titelbild;
  }
  
  // Handle legacy format
  if (article.attributes && article.attributes.titelbild && article.attributes.titelbild.data) {
    return article.attributes.titelbild.data;
  }
  
  return null;
}

export default function NewsPage() {
  const [newsArticles, setNewsArticles] = useState<NewsArtikel[]>([])
  const [categories, setCategories] = useState<Kategorie[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<NewsArtikel | null>(null)
  const [articleLoading, setArticleLoading] = useState(false)

  // Fetch news articles and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch news articles with category relation using Strapi 5 format
        const [newsResponse, categoriesResponse] = await Promise.all([
          strapi.get('/news-artikels', {
            params: {
              populate: '*', // Populate all relations
              sort: ['datum:desc']
            }
          }),
          strapi.get('/kategorien')
        ])

        // Use API data
        const apiNewsArticles = newsResponse.data.data || []
        const apiCategories = categoriesResponse.data.data || []
        
        // Debug logging
        console.log('API News Articles:', apiNewsArticles)
        console.log('API Categories:', apiCategories)
        
        // Transform categories to match expected format
        const transformedCategories = apiCategories.map((cat: any) => ({
          id: cat.id,
          attributes: {
            name: cat.name,
            publishedAt: cat.publishedAt,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
          }
        }))
        
        setNewsArticles(apiNewsArticles)
        setCategories(transformedCategories)
      } catch (err) {
        console.error('Error fetching news:', err)
        // Show empty state
        setNewsArticles([])
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Open article modal
  const openArticleModal = async (articleId: number) => {
    console.log('Opening article modal for ID:', articleId)
    setArticleLoading(true)
    setIsModalOpen(true)
    
    try {
      // First, try to find the article in the already loaded articles
      const existingArticle = newsArticles.find(article => article.id === articleId)
      if (existingArticle) {
        console.log('Using existing article:', existingArticle)
        setSelectedArticle(existingArticle)
        setArticleLoading(false)
        return
      }
      
      // Try to fetch full article from API with Strapi 5 format
      console.log('Fetching article from API...')
      const response = await strapi.get(`/news-artikels/${articleId}`, {
        params: {
          populate: '*'
        }
      })
      
      const apiArticle = response.data.data
      console.log('API Article response:', apiArticle)
      setSelectedArticle(apiArticle || null)
    } catch (err) {
      console.error('Error fetching article:', err)
      // Try to use existing article from list if available
      const existingArticle = newsArticles.find(article => article.id === articleId)
      if (existingArticle) {
        console.log('Using existing article from list:', existingArticle)
        setSelectedArticle(existingArticle)
      } else {
        console.log('Article not found')
        setSelectedArticle(null)
      }
    } finally {
      setArticleLoading(false)
    }
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedArticle(null)
  }

  // Filter articles by category - updated for Strapi 5 format
  const filteredArticles = selectedCategory === 'Alle' 
    ? newsArticles.filter(article => article && getArticleTitle(article))
    : newsArticles
        .filter(article => article && getArticleTitle(article))
        .filter(article => getKategorieName(article) === selectedCategory)

  // Kategorien-Filter (Dropdown und Chips) - robuste Verarbeitung
  const categoryNames = ['Alle', ...categories
    .filter(cat => cat && cat.attributes && cat.attributes.name)
    .map(cat => cat.attributes?.name || 'Unbekannt')];

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <main className="pt-8 pb-6">
          <AnimatedSection className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
              <p className="text-gray-600">Nachrichten werden geladen...</p>
            </div>
          </AnimatedSection>
        </main>
      </PageLayout>
    )
  }



  return (
    <PageLayout>


      <main className="pt-8 pb-6">
        <div className="container space-y-4 lg:space-y-8 lg:max-w-5xl lg:mx-auto">
          
          {/* Mobile Category Filter - Compact Horizontal Scroll */}
        <AnimatedSection delay={0.2}>
          <div className="mb-4 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {categoryNames.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-viktoria-yellow text-gray-800 shadow-sm shadow-viktoria-yellow/20'
                      : 'bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/15 hover:text-gray-600 dark:hover:text-white border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Category Filter - Compact */}
          <div className="hidden lg:block mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-2">
                {categoryNames.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-viktoria-yellow text-gray-800 shadow-sm shadow-viktoria-yellow/20'
                        : 'bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/15 hover:text-gray-600 dark:hover:text-white border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 ml-4">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'Artikel' : 'Artikel'}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* News Articles Grid */}
        <AnimatedSection delay={0.3}>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconEye className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                  {selectedCategory === 'Alle' 
                    ? 'Keine News-Artikel gefunden' 
                    : `Keine Artikel in der Kategorie "${selectedCategory}" gefunden`}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Versuchen Sie eine andere Kategorie oder schauen Sie später wieder vorbei.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Articles Grid - Clean Design */}
              <div className="space-y-9 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8">
                {filteredArticles
                  .filter(article => article && getArticleTitle(article)) // Filter valid articles
                  .map((article, index) => {
                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group"
                    >
                      <div 
                        className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] hover:transform hover:translateY(-2px) h-full flex flex-col before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
                        onClick={() => openArticleModal(article.id)}
                      >
                        {/* Image */}
                        <div className="relative h-32 sm:h-48 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden flex-shrink-0">
                          {getArticleImage(article) ? (
                            <Image
                              src={`${getApiUrl()}${(getArticleImage(article) as any)?.url || (getArticleImage(article) as any)?.attributes?.url}`}
                              alt={(getArticleImage(article) as any)?.alternativeText || (getArticleImage(article) as any)?.attributes?.alternativeText || getArticleTitle(article)}
                              fill
                              className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 bg-viktoria-yellow/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <IconEye className="w-8 h-8 text-viktoria-yellow" />
                                </div>
                                <p className="text-sm text-viktoria-yellow/80">SV Viktoria Wertheim</p>
                              </div>
                            </div>
                          )}
                          {/* Category Badge */}
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                            <span className="bg-viktoria-yellow text-gray-900 text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium shadow-sm">
                              {getKategorieName(article)}
                            </span>
                          </div>
                          {/* Date Badge */}
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                            <div className="flex items-center bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">
                              <IconClock className="w-3 h-3 mr-1" />
                              <span>
                                {new Date(getArticleDate(article)).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-5 flex-grow flex flex-col">
                          {/* Title */}
                          <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2 sm:mb-3 group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow transition-colors line-clamp-2 leading-tight flex-grow">
                            {getArticleTitle(article)}
                          </h3>

                          {/* Content Preview */}
                          <p className="text-gray-600 dark:text-gray-300 line-clamp-2 text-sm leading-relaxed mb-3 sm:mb-4">
                            {getArticleContent(article) || 'Artikel ansehen...'}
                          </p>

                          {/* Read More */}
                          <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors group/btn mt-auto">
                            <span className="text-xs sm:text-sm">Artikel lesen</span>
                            <IconArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover/btn:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </AnimatedSection>
        </div>
      </main>
      
      {/* News Modal */}
      <NewsModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </PageLayout>
  )
} 
