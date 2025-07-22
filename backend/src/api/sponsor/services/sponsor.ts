/**
 * sponsor service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::sponsor.sponsor', ({ strapi }) => ({
  /**
   * Find active sponsors ordered by category and priority
   */
  async findActiveSponsors(params: any = {}) {
    const { populate, ...otherParams } = params;
    
    return await strapi.entityService.findMany('api::sponsor.sponsor', {
      filters: {
        aktiv: true,
        ...otherParams.filters,
      },
      sort: [
        { kategorie: 'asc' }, // Hauptsponsor first, then Premium, then Partner
        { reihenfolge: 'asc' }, // Then by custom ordering
        { name: 'asc' }, // Finally by name
      ],
      populate: populate || ['logo'],
      ...otherParams,
    });
  },

  /**
   * Find sponsors by category
   */
  async findByCategory(kategorie: string, activeOnly = true) {
    const filters: any = { kategorie };
    
    if (activeOnly) {
      filters.aktiv = true;
    }

    return await strapi.entityService.findMany('api::sponsor.sponsor', {
      filters,
      sort: [
        { reihenfolge: 'asc' },
        { name: 'asc' },
      ],
      populate: ['logo'],
    });
  },

  /**
   * Get sponsors grouped by category for display
   */
  async getSponsorsGroupedByCategory(activeOnly = true) {
    const sponsors = await this.findActiveSponsors({
      filters: activeOnly ? { aktiv: true } : {},
    });

    const grouped = {
      Hauptsponsor: [],
      Premium: [],
      Partner: [],
    };

    sponsors.forEach((sponsor) => {
      if (grouped[sponsor.kategorie]) {
        grouped[sponsor.kategorie].push(sponsor);
      }
    });

    return grouped;
  },

  /**
   * Update sponsor ordering within category
   */
  async updateOrdering(sponsorId: number, newOrder: number) {
    const sponsor = await strapi.entityService.findOne('api::sponsor.sponsor', sponsorId);
    
    if (!sponsor) {
      throw new Error('Sponsor nicht gefunden');
    }

    // Validate ordering range
    if (newOrder < 0 || newOrder > 999) {
      throw new Error('Reihenfolge muss zwischen 0 und 999 liegen');
    }

    return await strapi.entityService.update('api::sponsor.sponsor', sponsorId, {
      data: { reihenfolge: newOrder },
    });
  },

  /**
   * Toggle sponsor active status
   */
  async toggleActiveStatus(sponsorId: number) {
    const sponsor = await strapi.entityService.findOne('api::sponsor.sponsor', sponsorId);
    
    if (!sponsor) {
      throw new Error('Sponsor nicht gefunden');
    }

    return await strapi.entityService.update('api::sponsor.sponsor', sponsorId, {
      data: { aktiv: !sponsor.aktiv },
    });
  },

  /**
   * Get sponsors for homepage showcase with rotation logic
   */
  async getHomepageShowcase(maxSponsors = 6) {
    const groupedSponsors = await this.getSponsorsGroupedByCategory(true);
    
    const showcase = [];
    
    // Always include all Hauptsponsors
    showcase.push(...groupedSponsors.Hauptsponsor);
    
    // Add Premium sponsors if space available
    const remainingSlots = maxSponsors - showcase.length;
    if (remainingSlots > 0) {
      const premiumToAdd = groupedSponsors.Premium.slice(0, remainingSlots);
      showcase.push(...premiumToAdd);
    }
    
    // Fill remaining slots with Partner sponsors
    const finalRemainingSlots = maxSponsors - showcase.length;
    if (finalRemainingSlots > 0) {
      const partnersToAdd = groupedSponsors.Partner.slice(0, finalRemainingSlots);
      showcase.push(...partnersToAdd);
    }
    
    return showcase;
  },

  /**
   * Get rotating sponsor selection for dynamic display
   */
  async getRotatingSponsors(rotationSeed?: number) {
    const allActiveSponsors = await this.findActiveSponsors();
    
    if (allActiveSponsors.length === 0) {
      return [];
    }
    
    // Use current hour as rotation seed if not provided
    const seed = rotationSeed || new Date().getHours();
    
    // Create weighted rotation based on category
    const weightedSponsors = [];
    
    allActiveSponsors.forEach((sponsor) => {
      let weight = 1;
      
      // Higher weight for higher tier sponsors
      const kategorie = sponsor.kategorie as string;
      if (kategorie === 'Hauptsponsor') {
        weight = 5; // Appears 5x more often
      } else if (kategorie === 'Premium') {
        weight = 3; // Appears 3x more often
      } else if (kategorie === 'Partner') {
        weight = 1; // Base frequency
      }
      
      // Add sponsor multiple times based on weight
      for (let i = 0; i < weight; i++) {
        weightedSponsors.push(sponsor);
      }
    });
    
    // Shuffle based on seed for consistent rotation
    const shuffled = this.shuffleArray(weightedSponsors, seed);
    
    // Return unique sponsors (remove duplicates from weighting)
    const uniqueSponsors = [];
    const seenIds = new Set();
    
    for (const sponsor of shuffled) {
      if (!seenIds.has(sponsor.id)) {
        uniqueSponsors.push(sponsor);
        seenIds.add(sponsor.id);
      }
    }
    
    return uniqueSponsors;
  },

  /**
   * Get sponsor display order with advanced sorting
   */
  async getSponsorDisplayOrder(options: {
    activeOnly?: boolean;
    prioritizeCategory?: string;
    randomize?: boolean;
    limit?: number;
  } = {}) {
    const {
      activeOnly = true,
      prioritizeCategory,
      randomize = false,
      limit,
    } = options;
    
    let filters: any = {};
    if (activeOnly) {
      filters.aktiv = true;
    }
    
    if (prioritizeCategory) {
      filters.kategorie = prioritizeCategory;
    }
    
    let sponsors = await strapi.entityService.findMany('api::sponsor.sponsor', {
      filters,
      sort: randomize ? undefined : [
        { kategorie: 'asc' },
        { reihenfolge: 'asc' },
        { name: 'asc' },
      ],
      populate: ['logo'],
    });
    
    if (randomize) {
      sponsors = this.shuffleArray(sponsors);
    }
    
    if (limit && limit > 0) {
      sponsors = sponsors.slice(0, limit);
    }
    
    return sponsors;
  },

  /**
   * Utility function to shuffle array with optional seed for consistent results
   */
  shuffleArray(array: any[], seed?: number) {
    const shuffled = [...array];
    
    if (seed !== undefined) {
      // Seeded shuffle for consistent results
      let currentIndex = shuffled.length;
      let randomIndex;
      
      // Use simple linear congruential generator for seeded randomness
      let rng = seed;
      const random = () => {
        rng = (rng * 9301 + 49297) % 233280;
        return rng / 233280;
      };
      
      while (currentIndex !== 0) {
        randomIndex = Math.floor(random() * currentIndex);
        currentIndex--;
        
        [shuffled[currentIndex], shuffled[randomIndex]] = [
          shuffled[randomIndex], shuffled[currentIndex]
        ];
      }
    } else {
      // Standard Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    
    return shuffled;
  },

  /**
   * Get sponsor statistics for admin dashboard
   */
  async getSponsorStatistics() {
    const allSponsors = await strapi.entityService.findMany('api::sponsor.sponsor', {
      populate: ['logo'],
    });
    
    const stats = {
      total: allSponsors.length,
      active: 0,
      inactive: 0,
      byCategory: {
        Hauptsponsor: 0,
        Premium: 0,
        Partner: 0,
      },
      withLogo: 0,
      withWebsite: 0,
    };
    
    allSponsors.forEach((sponsor: any) => {
      if (sponsor.aktiv) {
        stats.active++;
      } else {
        stats.inactive++;
      }
      
      if (stats.byCategory[sponsor.kategorie] !== undefined) {
        stats.byCategory[sponsor.kategorie]++;
      }
      
      if (sponsor.logo) {
        stats.withLogo++;
      }
      
      if (sponsor.website) {
        stats.withWebsite++;
      }
    });
    
    return stats;
  },
}));