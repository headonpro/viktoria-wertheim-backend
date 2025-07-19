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

// Mock data as fallback (updated for Strapi 5 format)
const mockNewsArticles: NewsArtikel[] = [
    {
      id: 1,
      documentId: 'mock-1',
      titel: 'Viktoria Wertheim gewinnt Derby mit 3:1',
      inhalt: 'Ein spannendes Spiel endete mit einem verdienten Sieg für unsere Mannschaft. Die Tore fielen in der zweiten Halbzeit, als unser Team das Tempo erhöhte und die Kontrolle übernahm.\n\nDie Zuschauer sahen eine kämpferische Leistung und wurden mit einem tollen Fußballabend belohnt. Bereits in der 15. Minute gingen wir durch einen schönen Angriff über die rechte Seite in Führung.\n\nIn der zweiten Halbzeit erhöhten wir das Tempo und konnten durch zwei weitere Treffer den verdienten Sieg einfahren. Die Mannschaft zeigte eine geschlossene Leistung und kämpfte bis zur letzten Minute.',
      datum: '2024-12-08',
      kategorie: {
        id: 1,
        documentId: 'mock-cat-1',
        name: 'Spielberichte',
        createdAt: '2024-12-08T10:00:00.000Z',
        updatedAt: '2024-12-08T10:00:00.000Z',
        publishedAt: '2024-12-08T10:00:00.000Z'
      },
      publishedAt: '2024-12-08T10:00:00.000Z',
      createdAt: '2024-12-08T10:00:00.000Z',
      updatedAt: '2024-12-08T10:00:00.000Z'
    },
    {
      id: 2,
      attributes: {
        titel: 'Neuer Trainer für die Jugend',
        inhalt: 'Ab sofort wird unser Jugendbereich von einem erfahrenen Trainer geleitet. Mit seiner langjährigen Erfahrung im Nachwuchsbereich wird er unsere jungen Talente optimal fördern und weiterentwickeln.\n\nDer neue Trainer bringt moderne Trainingsmethoden mit und legt großen Wert auf die individuelle Förderung der Spieler. Wir freuen uns auf die Zusammenarbeit und sind gespannt auf die Entwicklung unserer Nachwuchstalente.',
        datum: '2024-12-05',
        kategorie: {
          data: {
            attributes: {
              name: 'Vereinsnachrichten'
            }
          }
        },
        publishedAt: '2024-12-05T10:00:00.000Z',
        createdAt: '2024-12-05T10:00:00.000Z',
        updatedAt: '2024-12-05T10:00:00.000Z'
      }
    },
    {
      id: 3,
      attributes: {
        titel: 'Saisonrückblick 2024',
        inhalt: 'Die Saison 2024 war geprägt von vielen Höhepunkten und Erfolgen. Unser Team hat sich kontinuierlich verbessert und konnte wichtige Siege einfahren.\n\nBesonders stolz sind wir auf die Entwicklung unserer jungen Spieler, die sich perfekt in die Mannschaft integriert haben. Die Zusammenarbeit zwischen erfahrenen und jungen Spielern funktioniert hervorragend.\n\nWir blicken stolz auf die erreichten Leistungen zurück und freuen uns bereits auf die kommende Saison, in der wir an diese Erfolge anknüpfen möchten.',
        datum: '2024-12-01',
        kategorie: {
          data: {
            attributes: {
              name: 'Allgemein'
            }
          }
        },
        publishedAt: '2024-12-01T10:00:00.000Z',
        createdAt: '2024-12-01T10:00:00.000Z',
        updatedAt: '2024-12-01T10:00:00.000Z'
      }
    }
  ]

// Mock data for detailed articles (with full content)
const mockDetailedArticles: { [key: string]: NewsArtikel } = {
  '1': {
    id: 1,
    attributes: {
      titel: 'Viktoria Wertheim gewinnt Derby mit 3:1',
      inhalt: 'Ein spannendes Spiel endete mit einem verdienten Sieg für unsere Mannschaft. Die Tore fielen in der zweiten Halbzeit, als unser Team das Tempo erhöhte und die Kontrolle übernahm.\n\nDie Zuschauer sahen eine kämpferische Leistung und wurden mit einem tollen Fußballabend belohnt. Bereits in der 15. Minute gingen wir durch einen schönen Angriff über die rechte Seite in Führung.\n\nIn der zweiten Halbzeit erhöhten wir das Tempo und konnten durch zwei weitere Treffer den verdienten Sieg einfahren. Die Mannschaft zeigte eine geschlossene Leistung und kämpfte bis zur letzten Minute.',
      datum: '2024-12-08',
      kategorie: {
        data: {
          attributes: {
            name: 'Spielberichte'
          }
        }
      },
      publishedAt: '2024-12-08T10:00:00.000Z',
      createdAt: '2024-12-08T10:00:00.000Z',
      updatedAt: '2024-12-08T10:00:00.000Z'
    }
  },
  '2': {
    id: 2,
    attributes: {
      titel: 'Neuer Trainer für die Jugend',
      inhalt: 'Ab sofort wird unser Jugendbereich von einem erfahrenen Trainer geleitet. Mit seiner langjährigen Erfahrung im Nachwuchsbereich wird er unsere jungen Talente optimal fördern und weiterentwickeln.\n\nDer neue Trainer bringt moderne Trainingsmethoden mit und legt großen Wert auf die individuelle Förderung der Spieler. Wir freuen uns auf die Zusammenarbeit und sind gespannt auf die Entwicklung unserer Nachwuchstalente.',
      datum: '2024-12-05',
      kategorie: {
        data: {
          attributes: {
            name: 'Vereinsnachrichten'
          }
        }
      },
      publishedAt: '2024-12-05T10:00:00.000Z',
      createdAt: '2024-12-05T10:00:00.000Z',
      updatedAt: '2024-12-05T10:00:00.000Z'
    }
  },
  '3': {
    id: 3,
    attributes: {
      titel: 'Saisonrückblick 2024',
      inhalt: 'Die Saison 2024 war geprägt von vielen Höhepunkten und Erfolgen. Unser Team hat sich kontinuierlich verbessert und konnte wichtige Siege einfahren.\n\nBesonders stolz sind wir auf die Entwicklung unserer jungen Spieler, die sich perfekt in die Mannschaft integriert haben. Die Zusammenarbeit zwischen erfahrenen und jungen Spielern funktioniert hervorragend.\n\nWir blicken stolz auf die erreichten Leistungen zurück und freuen uns bereits auf die kommende Saison, in der wir an diese Erfolge anknüpfen möchten.',
      datum: '2024-12-01',
      kategorie: {
        data: {
          attributes: {
            name: 'Allgemein'
          }
        }
      },
      publishedAt: '2024-12-01T10:00:00.000Z',
      createdAt: '2024-12-01T10:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z'
    }
  }
}

const mockCategories: Kategorie[] = [
  {
    id: 1,
    attributes: {
      name: 'Spielberichte',
      publishedAt: '2024-12-01T10:00:00.000Z',
      createdAt: '2024-12-01T10:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z'
    },
    publishedAt: '2024-12-01T10:00:00.000Z',
    createdAt: '2024-12-01T10:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z'
  },
  {
    id: 2,
    attributes: {
      name: 'Vereinsnachrichten',
      publishedAt: '2024-12-01T10:00:00.000Z',
      createdAt: '2024-12-01T10:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z'
    },
    publishedAt: '2024-12-01T10:00:00.000Z',
    createdAt: '2024-12-01T10:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z'
  },
  {
    id: 3,
    attributes: {
      name: 'Allgemein',
      publishedAt: '2024-12-01T10:00:00.000Z',
      createdAt: '2024-12-01T10:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z'
    },
    publishedAt: '2024-12-01T10:00:00.000Z',
    createdAt: '2024-12-01T10:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z'
  }
]

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

        // Use API data if available, otherwise use mock data
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
        
        setNewsArticles(apiNewsArticles.length > 0 ? apiNewsArticles : mockNewsArticles)
        setCategories(transformedCategories.length > 0 ? transformedCategories : mockCategories)
      } catch (err) {
        console.error('Error fetching news, using mock data:', err)
        // Use mock data as fallback
        setNewsArticles(mockNewsArticles)
        setCategories(mockCategories)
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
      setSelectedArticle(apiArticle || mockDetailedArticles[articleId.toString()] || null)
    } catch (err) {
      console.error('Error fetching article, using mock data:', err)
      // Use mock data as fallback
      const fallbackArticle = mockDetailedArticles[articleId.toString()] || newsArticles.find(article => article.id === articleId)
      console.log('Using fallback article:', fallbackArticle)
      setSelectedArticle(fallbackArticle || null)
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

  // Error state - removed since we use fallback data

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
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg dark:shadow-white/[0.05] ${
                    selectedCategory === category
                      ? 'bg-viktoria-blue text-white shadow-md'
                      : 'bg-white/20 dark:bg-white/[0.02] backdrop-blur-md text-gray-700 dark:text-gray-300 border border-white/40 dark:border-white/[0.08] active:bg-viktoria-blue/10 active:text-viktoria-blue dark:active:text-viktoria-yellow'
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08] ${
                      selectedCategory === category
                        ? 'bg-viktoria-blue text-white shadow-md'
                        : 'bg-white/20 dark:bg-white/[0.02] backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-viktoria-blue/10 hover:text-viktoria-blue dark:hover:text-viktoria-yellow border border-white/40 dark:border-white/[0.08]'
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
              <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/[0.08] p-8 shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08]">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                        className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl border border-white/40 dark:border-white/[0.08] overflow-hidden hover:bg-white/30 dark:hover:bg-white/[0.04] hover:shadow-xl dark:hover:shadow-white/[0.08] transition-all duration-300 cursor-pointer h-full flex flex-col shadow-lg dark:shadow-white/[0.05]"
                        onClick={() => openArticleModal(article.id)}
                      >
                        {/* Image */}
                        <div className="relative h-32 sm:h-48 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden flex-shrink-0">
                          {getArticleImage(article) ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://192.168.178.59:1337'}${(getArticleImage(article) as any)?.url || (getArticleImage(article) as any)?.attributes?.url}`}
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
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-5 flex-grow flex flex-col">
                          {/* Date */}
                          <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                            <IconClock className="w-4 h-4 mr-2" />
                            <span>
                              {new Date(getArticleDate(article)).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow transition-colors line-clamp-2 leading-tight flex-grow">
                            {getArticleTitle(article)}
                          </h3>

                          {/* Content Preview */}
                          <p className="text-gray-600 dark:text-gray-300 line-clamp-2 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
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