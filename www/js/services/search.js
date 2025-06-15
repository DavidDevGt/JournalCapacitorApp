// Search service for advanced search functionality across journal entries
import { debounce } from '../helpers.js';

/**
 * SearchService - Advanced search functionality with filters, indexing, and highlighting
 */
class SearchService {
    constructor() {
        this.isInitialized = false;
        this.searchIndex = new Map();
        this.searchHistory = [];
        this.maxHistoryItems = 50;
        this.searchFilters = {
            dateRange: null,
            mood: null,
            hasPhoto: null,
            minWords: null,
            maxWords: null,
            tags: []
        };
        this.stopWords = new Set([
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
            'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'uno', 'una',
            'me', 'mi', 'tu', 'si', 'ya', 'o', 'muy', 'mas', 'pero', 'como', 'todo', 'ser',
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are'
        ]);
        this.lastSearchResults = [];
        this.currentQuery = '';
    }

    async init() {
        try {
            await this.loadSearchHistory();
            await this.buildSearchIndex();
            this.isInitialized = true;
            console.log('SearchService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing SearchService:', error);
            return { success: false, error: error.message };
        }
    }

    async buildSearchIndex() {
        try {
            if (!window.db || !window.db.isInitialized) {
                console.warn('Database not available for search indexing');
                return { success: false, error: 'Database not available' };
            }

            this.searchIndex.clear();
            const entries = await window.db.getAllEntries(1000); // Get all entries for indexing

            for (const entry of entries) {
                this.indexEntry(entry);
            }

            console.log(`Search index built with ${this.searchIndex.size} entries`);
            return { success: true, indexed: this.searchIndex.size };
        } catch (error) {
            console.error('Error building search index:', error);
            return { success: false, error: error.message };
        }
    }

    indexEntry(entry) {
        if (!entry.date || !entry.content) return;

        const words = this.tokenizeText(entry.content);
        const searchData = {
            date: entry.date,
            content: entry.content,
            mood: entry.mood || null,
            hasPhoto: !!(entry.photo_path || entry.photoPath),
            wordCount: entry.word_count || entry.wordCount || 0,
            words: words,
            tags: this.extractTags(entry.content)
        };

        this.searchIndex.set(entry.date, searchData);
    }

    tokenizeText(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .replace(/[^\w\sáéíóúñü]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word))
            .map(word => this.normalizeWord(word));
    }

    normalizeWord(word) {
        // Normalize accented characters
        return word
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n');
    }

    extractTags(text) {
        if (!text) return [];
        
        const tagRegex = /#[\w\u00C0-\u017F]+/g;
        const matches = text.match(tagRegex);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    async search(query, filters = {}) {
        try {
            if (!query || query.trim().length < 2) {
                return { success: false, error: 'Query too short' };
            }

            this.currentQuery = query.trim();
            const searchTerms = this.tokenizeText(query);
            const combinedFilters = { ...this.searchFilters, ...filters };

            let results = [];

            // Search through indexed entries
            for (const [date, entryData] of this.searchIndex) {
                const score = this.calculateRelevanceScore(entryData, searchTerms, combinedFilters);
                if (score > 0) {
                    results.push({
                        ...entryData,
                        score,
                        highlights: this.generateHighlights(entryData.content, searchTerms)
                    });
                }
            }

            // Sort by relevance score
            results.sort((a, b) => b.score - a.score);

            // Apply additional filters
            results = this.applyFilters(results, combinedFilters);

            this.lastSearchResults = results;
            this.addToSearchHistory(query);

            return {
                success: true,
                results,
                query,
                total: results.length,
                filters: combinedFilters
            };
        } catch (error) {
            console.error('Error performing search:', error);
            return { success: false, error: error.message };
        }
    }

    calculateRelevanceScore(entryData, searchTerms, filters) {
        let score = 0;

        // Text matching score
        for (const term of searchTerms) {
            const termCount = entryData.words.filter(word => 
                word.includes(term) || term.includes(word)
            ).length;
            
            if (termCount > 0) {
                score += termCount * 10; // Base score for term matches
                
                // Bonus for exact word matches
                if (entryData.words.includes(term)) {
                    score += 20;
                }
                
                // Bonus for phrase matches in original content
                if (entryData.content.toLowerCase().includes(term)) {
                    score += 15;
                }
            }
        }

        // If no text matches, return 0
        if (score === 0) return 0;

        // Apply filter bonuses/penalties
        if (filters.mood && entryData.mood === filters.mood) {
            score += 5;
        }

        if (filters.hasPhoto !== null) {
            if (filters.hasPhoto === entryData.hasPhoto) {
                score += 3;
            } else {
                score -= 5;
            }
        }

        // Word count filters
        if (filters.minWords && entryData.wordCount < filters.minWords) {
            score -= 10;
        }
        if (filters.maxWords && entryData.wordCount > filters.maxWords) {
            score -= 10;
        }

        // Tag matching
        if (filters.tags && filters.tags.length > 0) {
            const matchingTags = entryData.tags.filter(tag => 
                filters.tags.some(filterTag => tag.includes(filterTag.toLowerCase()))
            );
            score += matchingTags.length * 8;
        }

        // Date recency bonus (more recent entries get slight boost)
        const entryDate = new Date(entryData.date);
        const daysSinceEntry = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 10 - (daysSinceEntry / 30)); // Bonus decreases over 30 days
        score += recencyBonus;

        return Math.max(0, score);
    }

    applyFilters(results, filters) {
        return results.filter(entry => {
            // Date range filter
            if (filters.dateRange) {
                const entryDate = new Date(entry.date);
                if (filters.dateRange.start && entryDate < new Date(filters.dateRange.start)) {
                    return false;
                }
                if (filters.dateRange.end && entryDate > new Date(filters.dateRange.end)) {
                    return false;
                }
            }

            // Mood filter
            if (filters.mood && entry.mood !== filters.mood) {
                return false;
            }

            // Photo filter
            if (filters.hasPhoto !== null && entry.hasPhoto !== filters.hasPhoto) {
                return false;
            }

            // Word count filters
            if (filters.minWords && entry.wordCount < filters.minWords) {
                return false;
            }
            if (filters.maxWords && entry.wordCount > filters.maxWords) {
                return false;
            }

            return true;
        });
    }

    generateHighlights(content, searchTerms) {
        if (!content || searchTerms.length === 0) return content;

        let highlightedContent = content;
        
        for (const term of searchTerms) {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
        }

        return highlightedContent;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Search suggestions and autocomplete
    async getSuggestions(partialQuery) {
        try {
            if (!partialQuery || partialQuery.length < 2) {
                return { success: true, suggestions: this.getRecentSearches(5) };
            }

            const suggestions = new Set();
            const queryLower = partialQuery.toLowerCase();

            // Add from search history
            this.searchHistory
                .filter(query => query.toLowerCase().includes(queryLower))
                .slice(0, 3)
                .forEach(query => suggestions.add(query));

            // Add words from index that start with the query
            for (const entryData of this.searchIndex.values()) {
                for (const word of entryData.words) {
                    if (word.startsWith(queryLower) && word.length > queryLower.length) {
                        suggestions.add(word);
                        if (suggestions.size >= 8) break;
                    }
                }
                if (suggestions.size >= 8) break;
            }

            return {
                success: true,
                suggestions: Array.from(suggestions).slice(0, 8)
            };
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return { success: false, error: error.message };
        }
    }

    // Search history management
    addToSearchHistory(query) {
        if (!query || query.trim().length < 2) return;

        const trimmedQuery = query.trim();
        
        // Remove if already exists
        const existingIndex = this.searchHistory.indexOf(trimmedQuery);
        if (existingIndex > -1) {
            this.searchHistory.splice(existingIndex, 1);
        }

        // Add to beginning
        this.searchHistory.unshift(trimmedQuery);

        // Limit history size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
    }

    getRecentSearches(limit = 10) {
        return this.searchHistory.slice(0, limit);
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }

    async loadSearchHistory() {
        try {
            if (window.services?.storage) {
                const history = await window.services.storage.getPreferences().get('searchHistory', []);
                this.searchHistory = Array.isArray(history) ? history : [];
            } else {
                const stored = localStorage.getItem('journal_search_history');
                this.searchHistory = stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    }

    async saveSearchHistory() {
        try {
            if (window.services?.storage) {
                await window.services.storage.getPreferences().set('searchHistory', this.searchHistory);
            } else {
                localStorage.setItem('journal_search_history', JSON.stringify(this.searchHistory));
            }
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    // Filter management
    setFilters(filters) {
        this.searchFilters = { ...this.searchFilters, ...filters };
        return { success: true };
    }

    getFilters() {
        return { ...this.searchFilters };
    }

    clearFilters() {
        this.searchFilters = {
            dateRange: null,
            mood: null,
            hasPhoto: null,
            minWords: null,
            maxWords: null,
            tags: []
        };
        return { success: true };
    }

    // Advanced search features
    async searchByDate(date) {
        const entry = this.searchIndex.get(date);
        if (entry) {
            return {
                success: true,
                results: [entry],
                query: `date:${date}`,
                total: 1
            };
        }
        return { success: false, error: 'Entry not found for date' };
    }

    async searchByMood(mood) {
        const results = [];
        for (const entryData of this.searchIndex.values()) {
            if (entryData.mood === mood) {
                results.push(entryData);
            }
        }

        results.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            success: true,
            results,
            query: `mood:${mood}`,
            total: results.length
        };
    }

    async searchByTags(tags) {
        if (!Array.isArray(tags)) tags = [tags];
        
        const results = [];
        const searchTags = tags.map(tag => tag.toLowerCase());

        for (const entryData of this.searchIndex.values()) {
            const matchingTags = entryData.tags.filter(tag => 
                searchTags.some(searchTag => tag.includes(searchTag))
            );
            
            if (matchingTags.length > 0) {
                results.push({
                    ...entryData,
                    matchingTags,
                    score: matchingTags.length * 10
                });
            }
        }

        results.sort((a, b) => b.score - a.score);

        return {
            success: true,
            results,
            query: `tags:${tags.join(',')}`,
            total: results.length
        };
    }

    // Export search results
    async exportSearchResults(results = this.lastSearchResults) {
        try {
            const exportData = {
                query: this.currentQuery,
                timestamp: new Date().toISOString(),
                totalResults: results.length,
                results: results.map(entry => ({
                    date: entry.date,
                    content: entry.content,
                    mood: entry.mood,
                    wordCount: entry.wordCount,
                    score: entry.score
                }))
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `journal-search-${this.currentQuery.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Error exporting search results:', error);
            return { success: false, error: error.message };
        }
    }

    // Statistics
    getSearchStats() {
        return {
            indexedEntries: this.searchIndex.size,
            searchHistoryCount: this.searchHistory.length,
            lastSearchResults: this.lastSearchResults.length,
            currentQuery: this.currentQuery
        };
    }

    // Update index when entries change
    updateEntry(entry) {
        if (entry && entry.date) {
            this.indexEntry(entry);
        }
    }

    removeEntry(date) {
        this.searchIndex.delete(date);
    }

    // Debounced search for real-time searching
    createDebouncedSearch(delay = 300) {
        return debounce((query, filters, callback) => {
            this.search(query, filters).then(callback);
        }, delay);
    }

    destroy() {
        this.searchIndex.clear();
        this.searchHistory = [];
        this.lastSearchResults = [];
    }
}

// Create and export singleton instance
const searchService = new SearchService();

export default searchService;
