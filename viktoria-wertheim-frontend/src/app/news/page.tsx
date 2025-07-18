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
    setArticleLoading(true)
    setIsModalOpen(true)
    
    try {
      // Try to fetch full article from API with Strapi 5 format
      const response = await strapi.get(`/news-artikels/${articleId}`, {
        params: {
          populate: '*'
        }
      })
      
      const apiArticle = response.data.data
      setSelectedArticle(apiArticle || mockDetailedArticles[articleId.toString()] || null)
    } catch (err) {
      console.error('Error fetching article, using mock data:', err)
      // Use mock data as fallback
      setSelectedArticle(mockDetailedArticles[articleId.toString()] || null)
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


      <main className="pt-4 pb-6">
        <div className="container space-y-4 lg:space-y-8 lg:max-w-5xl lg:mx-auto">
          
          {/* Mobile Category Filter - Compact Horizontal Scroll */}
        <AnimatedSection delay={0.2}>
          <div className="mb-4 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {categoryNames.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-viktoria-blue text-white shadow-md'
                      : 'bg-white/60 text-gray-700 hover:bg-viktoria-blue/10 border border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Category Filter - Compact */}
          <div className="hidden lg:block mb-6">
            <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/30 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">Kategorien</h2>
                <div className="text-sm text-gray-600">
                  {filteredArticles.length} {filteredArticles.length === 1 ? 'Artikel' : 'Artikel'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryNames.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-viktoria-blue text-white shadow-sm'
                        : 'bg-white/60 text-gray-700 hover:bg-viktoria-blue/10 hover:text-viktoria-blue border border-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* News Articles Grid */}
        <AnimatedSection delay={0.3}>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconEye className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg font-medium">
                  {selectedCategory === 'Alle' 
                    ? 'Keine News-Artikel gefunden' 
                    : `Keine Artikel in der Kategorie "${selectedCategory}" gefunden`}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Versuchen Sie eine andere Kategorie oder schauen Sie später wieder vorbei.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Featured Article - Clean Modern Design */}
              {filteredArticles.length > 0 && filteredArticles[0] && getArticleTitle(filteredArticles[0]) && (
                <div className="mb-8">
                  <div 
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => openArticleModal(filteredArticles[0].id)}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Featured Image */}
                      <div className="relative h-64 lg:h-72 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden">
                        {getArticleImage(filteredArticles[0]) ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://192.168.178.59:1337'}${(getArticleImage(filteredArticles[0]) as any)?.url || (getArticleImage(filteredArticles[0]) as any)?.attributes?.url}`}
                            alt={(getArticleImage(filteredArticles[0]) as any)?.alternativeText || (getArticleImage(filteredArticles[0]) as any)?.attributes?.alternativeText || getArticleTitle(filteredArticles[0])}
                            fill
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-20 h-20 bg-viktoria-yellow/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <IconEye className="w-10 h-10 text-viktoria-yellow" />
                              </div>
                              <p className="text-viktoria-yellow font-semibold">SV Viktoria Wertheim</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Category Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="bg-viktoria-yellow text-gray-900 text-sm px-3 py-1.5 rounded-full font-semibold shadow-sm">
                            {getKategorieName(filteredArticles[0])}
                          </span>
                        </div>
                      </div>

                      {/* Featured Content */}
                      <div className="p-6 lg:p-8 flex flex-col justify-center">
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <IconClock className="w-4 h-4 mr-2" />
                          <span>
                            {new Date(getArticleDate(filteredArticles[0])).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 group-hover:text-viktoria-blue transition-colors leading-tight">
                          {getArticleTitle(filteredArticles[0])}
                        </h1>

                        <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">
                          {getArticleContent(filteredArticles[0]) || 'Lesen Sie den vollständigen Artikel für alle Details...'}
                        </p>

                        <div className="inline-flex items-center text-viktoria-blue font-semibold hover:text-viktoria-blue-light transition-colors group/btn">
                          <span>Vollständigen Artikel lesen</span>
                          <IconArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Articles Grid - Clean Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(filteredArticles.length > 1 ? filteredArticles.slice(1) : filteredArticles)
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
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col"
                        onClick={() => openArticleModal(article.id)}
                      >
                        {/* Image */}
                        <div className="relative h-48 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden flex-shrink-0">
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
                          <div className="absolute top-3 left-3">
                            <span className="bg-viktoria-yellow text-gray-900 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                              {getKategorieName(article)}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-grow flex flex-col">
                          {/* Date */}
                          <div className="flex items-center text-sm text-gray-500 mb-3">
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
                          <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-viktoria-blue transition-colors line-clamp-2 leading-tight flex-grow">
                            {getArticleTitle(article)}
                          </h3>

                          {/* Content Preview */}
                          <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed mb-4">
                            {getArticleContent(article) || 'Artikel ansehen...'}
                          </p>

                          {/* Read More */}
                          <div className="flex items-center text-viktoria-blue font-semibold hover:text-viktoria-blue-light transition-colors group/btn mt-auto">
                            <span className="text-sm">Artikel lesen</span>
                            <IconArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
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