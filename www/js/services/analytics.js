// Analytics service for tracking journal statistics and insights
import storageService from './storage.js';

class AnalyticsService {
    constructor() {
        this.isInitialized = false;
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    async init() {
        try {
            this.isInitialized = true;
            console.log('AnalyticsService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing AnalyticsService:', error);
            return { success: false, error: error.message };
        }
    }

    // Basic statistics
    async getBasicStats() {
        const cacheKey = 'basic_stats';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            if (!window.db || !window.db.isInitialized) {
                throw new Error('Database not available');
            }

            const stats = await window.db.getStats();
            const streak = await this.getCurrentStreak();
            const longestStreak = await this.getLongestStreak();
            
            const result = {
                success: true,
                totalEntries: stats.totalEntries || 0,
                totalWords: stats.totalWords || 0,
                averageWordsPerEntry: stats.totalEntries > 0 ? Math.round(stats.totalWords / stats.totalEntries) : 0,
                currentStreak: streak,
                longestStreak: longestStreak,
                firstEntry: stats.firstEntry,
                lastEntry: stats.lastEntry,
                totalPhotos: stats.totalPhotos || 0
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting basic stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Writing patterns and habits
    async getWritingPatterns() {
        const cacheKey = 'writing_patterns';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            if (!window.db || !window.db.isInitialized) {
                throw new Error('Database not available');
            }

            const entries = await window.db.getAllEntries(365); // Last year
            if (!entries || entries.length === 0) {
                return { success: true, patterns: {} };
            }

            const patterns = this.analyzeWritingPatterns(entries);
            const result = { success: true, patterns };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting writing patterns:', error);
            return { success: false, error: error.message };
        }
    }

    analyzeWritingPatterns(entries) {
        const dayOfWeekCounts = new Array(7).fill(0);
        const hourCounts = new Array(24).fill(0);
        const monthCounts = new Array(12).fill(0);
        const wordCountDistribution = [];
        const moodDistribution = {};
        const streaks = [];

        let currentStreak = 0;
        let lastDate = null;

        entries.forEach((entry, index) => {
            const date = new Date(entry.date);
            const createdAt = entry.created_at ? new Date(entry.created_at) : date;

            // Day of week analysis (0 = Sunday, 6 = Saturday)
            dayOfWeekCounts[date.getDay()]++;

            // Hour analysis (when entries are typically created)
            hourCounts[createdAt.getHours()]++;

            // Month analysis
            monthCounts[date.getMonth()]++;

            // Word count distribution
            const wordCount = entry.word_count || entry.wordCount || 0;
            wordCountDistribution.push(wordCount);

            // Mood distribution
            if (entry.mood) {
                moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
            }

            // Streak analysis
            if (lastDate) {
                const dayDiff = Math.abs(date - lastDate) / (1000 * 60 * 60 * 24);
                if (dayDiff === 1) {
                    currentStreak++;
                } else {
                    if (currentStreak > 0) {
                        streaks.push(currentStreak + 1); // +1 to include the starting day
                    }
                    currentStreak = 0;
                }
            }
            lastDate = date;
        });

        // Add final streak if exists
        if (currentStreak > 0) {
            streaks.push(currentStreak + 1);
        }

        const avgWordCount = wordCountDistribution.length > 0 
            ? wordCountDistribution.reduce((a, b) => a + b, 0) / wordCountDistribution.length 
            : 0;

        const mostProductiveDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
        const mostProductiveHour = hourCounts.indexOf(Math.max(...hourCounts));
        const mostProductiveMonth = monthCounts.indexOf(Math.max(...monthCounts));

        return {
            dayOfWeek: {
                counts: dayOfWeekCounts,
                mostProductive: this.getDayName(mostProductiveDay),
                distribution: this.calculateDistribution(dayOfWeekCounts)
            },
            timeOfDay: {
                counts: hourCounts,
                mostProductive: mostProductiveHour,
                distribution: this.calculateDistribution(hourCounts)
            },
            monthly: {
                counts: monthCounts,
                mostProductive: this.getMonthName(mostProductiveMonth),
                distribution: this.calculateDistribution(monthCounts)
            },
            wordCount: {
                average: Math.round(avgWordCount),
                min: Math.min(...wordCountDistribution),
                max: Math.max(...wordCountDistribution),
                median: this.calculateMedian(wordCountDistribution),
                distribution: this.groupWordCounts(wordCountDistribution)
            },
            mood: {
                distribution: moodDistribution,
                mostCommon: this.getMostCommonMood(moodDistribution)
            },
            streaks: {
                all: streaks,
                longest: Math.max(...streaks, 0),
                average: streaks.length > 0 ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0
            }
        };
    }

    // Streak calculations
    async getCurrentStreak() {
        try {
            if (!window.db || !window.db.isInitialized) {
                return 0;
            }

            return await window.db.getCurrentStreak();
        } catch (error) {
            console.error('Error getting current streak:', error);
            return 0;
        }
    }

    async getLongestStreak() {
        const cacheKey = 'longest_streak';
        const cached = this.getCachedData(cacheKey);
        if (cached !== null) return cached;

        try {
            if (!window.db || !window.db.isInitialized) {
                return 0;
            }

            const entries = await window.db.getAllEntries(1000); // Get more entries for accurate calculation
            if (!entries || entries.length === 0) return 0;

            let maxStreak = 0;
            let currentStreak = 1;
            let lastDate = new Date(entries[0].date);

            for (let i = 1; i < entries.length; i++) {
                const currentDate = new Date(entries[i].date);
                const dayDiff = Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24);

                if (dayDiff === 1) {
                    currentStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                }
                lastDate = currentDate;
            }

            maxStreak = Math.max(maxStreak, currentStreak);
            this.setCachedData(cacheKey, maxStreak);
            return maxStreak;
        } catch (error) {
            console.error('Error calculating longest streak:', error);
            return 0;
        }
    }

    // Month/Year analysis
    async getMonthlyStats(year, month) {
        const cacheKey = `monthly_stats_${year}_${month}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            if (!window.db || !window.db.isInitialized) {
                throw new Error('Database not available');
            }

            const entries = await window.db.getEntriesForMonth(year, month);
            const daysInMonth = new Date(year, month, 0).getDate();
            
            const stats = {
                entriesCount: entries.length,
                daysWithEntries: entries.length,
                completionRate: (entries.length / daysInMonth) * 100,
                totalWords: entries.reduce((sum, entry) => sum + (entry.word_count || entry.wordCount || 0), 0),
                averageWords: 0,
                moodDistribution: {},
                photosCount: entries.filter(entry => entry.photo_path || entry.photoPath).length,
                longestEntry: 0,
                shortestEntry: Infinity,
                entriesByDay: {}
            };

            if (stats.entriesCount > 0) {
                stats.averageWords = Math.round(stats.totalWords / stats.entriesCount);
                
                entries.forEach(entry => {
                    const wordCount = entry.word_count || entry.wordCount || 0;
                    stats.longestEntry = Math.max(stats.longestEntry, wordCount);
                    stats.shortestEntry = Math.min(stats.shortestEntry, wordCount);
                    
                    if (entry.mood) {
                        stats.moodDistribution[entry.mood] = (stats.moodDistribution[entry.mood] || 0) + 1;
                    }

                    const day = new Date(entry.date).getDate();
                    stats.entriesByDay[day] = {
                        hasEntry: true,
                        wordCount,
                        mood: entry.mood,
                        hasPhoto: !!(entry.photo_path || entry.photoPath)
                    };
                });

                if (stats.shortestEntry === Infinity) {
                    stats.shortestEntry = 0;
                }
            }

            const result = { success: true, stats };
            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting monthly stats:', error);
            return { success: false, error: error.message };
        }
    }

    async getYearlyStats(year) {
        const cacheKey = `yearly_stats_${year}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const monthlyStats = [];
            let totalEntries = 0;
            let totalWords = 0;
            let totalPhotos = 0;
            const yearlyMoodDistribution = {};

            for (let month = 1; month <= 12; month++) {
                const monthStats = await this.getMonthlyStats(year, month);
                if (monthStats.success) {
                    monthlyStats.push(monthStats.stats);
                    totalEntries += monthStats.stats.entriesCount;
                    totalWords += monthStats.stats.totalWords;
                    totalPhotos += monthStats.stats.photosCount;

                    // Combine mood distributions
                    Object.entries(monthStats.stats.moodDistribution).forEach(([mood, count]) => {
                        yearlyMoodDistribution[mood] = (yearlyMoodDistribution[mood] || 0) + count;
                    });
                }
            }

            const result = {
                success: true,
                stats: {
                    year,
                    totalEntries,
                    totalWords,
                    totalPhotos,
                    averageWordsPerEntry: totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0,
                    averageEntriesPerMonth: Math.round(totalEntries / 12),
                    moodDistribution: yearlyMoodDistribution,
                    monthlyBreakdown: monthlyStats,
                    completionRate: (totalEntries / 365) * 100 // Assuming non-leap year
                }
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting yearly stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Goal tracking
    async getGoalProgress() {
        try {
            const config = storageService.getConfig();
            const dailyWordGoal = await config.get('dailyWordGoal', 100);
            const monthlyEntryGoal = await config.get('monthlyEntryGoal', 20);

            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            // Check today's progress
            const todayEntry = await window.db.getEntry(this.formatDate(today));
            const todayWords = todayEntry ? (todayEntry.word_count || todayEntry.wordCount || 0) : 0;

            // Check monthly progress
            const monthlyStats = await this.getMonthlyStats(currentYear, currentMonth);
            const monthlyEntries = monthlyStats.success ? monthlyStats.stats.entriesCount : 0;

            return {
                success: true,
                daily: {
                    goal: dailyWordGoal,
                    current: todayWords,
                    percentage: Math.min((todayWords / dailyWordGoal) * 100, 100),
                    achieved: todayWords >= dailyWordGoal
                },
                monthly: {
                    goal: monthlyEntryGoal,
                    current: monthlyEntries,
                    percentage: Math.min((monthlyEntries / monthlyEntryGoal) * 100, 100),
                    achieved: monthlyEntries >= monthlyEntryGoal
                }
            };
        } catch (error) {
            console.error('Error getting goal progress:', error);
            return { success: false, error: error.message };
        }
    }

    // Insights and recommendations
    async getInsights() {
        try {
            const basicStats = await this.getBasicStats();
            const patterns = await this.getWritingPatterns();
            const goalProgress = await this.getGoalProgress();

            const insights = [];

            if (basicStats.success && patterns.success) {
                // Productivity insights
                if (patterns.patterns.dayOfWeek?.mostProductive) {
                    insights.push({
                        type: 'productivity',
                        title: 'Día más productivo',
                        message: `Escribes más los ${patterns.patterns.dayOfWeek.mostProductive}`,
                        icon: '📊'
                    });
                }

                // Streak insights
                if (basicStats.currentStreak > 7) {
                    insights.push({
                        type: 'achievement',
                        title: '¡Racha increíble!',
                        message: `Llevas ${basicStats.currentStreak} días consecutivos escribiendo`,
                        icon: '🔥'
                    });
                } else if (basicStats.currentStreak === 0) {
                    insights.push({
                        type: 'motivation',
                        title: 'Hora de retomar',
                        message: 'Comienza una nueva racha escribiendo hoy',
                        icon: '✨'
                    });
                }

                // Word count insights
                if (patterns.patterns.wordCount?.average > 200) {
                    insights.push({
                        type: 'achievement',
                        title: 'Escritor detallado',
                        message: `Tu promedio de ${patterns.patterns.wordCount.average} palabras por entrada es excelente`,
                        icon: '✍️'
                    });
                }

                // Mood insights
                if (patterns.patterns.mood?.mostCommon) {
                    insights.push({
                        type: 'mood',
                        title: 'Estado de ánimo frecuente',
                        message: `Tu estado más común es ${patterns.patterns.mood.mostCommon}`,
                        icon: patterns.patterns.mood.mostCommon
                    });
                }
            }

            // Goal insights
            if (goalProgress.success) {
                if (goalProgress.daily.achieved) {
                    insights.push({
                        type: 'achievement',
                        title: '¡Meta diaria alcanzada!',
                        message: `Has escrito ${goalProgress.daily.current} palabras hoy`,
                        icon: '🎯'
                    });
                }

                if (goalProgress.monthly.achieved) {
                    insights.push({
                        type: 'achievement',
                        title: '¡Meta mensual completada!',
                        message: `${goalProgress.monthly.current} entradas este mes`,
                        icon: '🏆'
                    });
                }
            }

            return { success: true, insights };
        } catch (error) {
            console.error('Error getting insights:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    calculateDistribution(counts) {
        const total = counts.reduce((a, b) => a + b, 0);
        return counts.map(count => total > 0 ? (count / total) * 100 : 0);
    }

    calculateMedian(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    groupWordCounts(wordCounts) {
        const groups = {
            'short': 0,    // 0-50 words
            'medium': 0,   // 51-150 words
            'long': 0,     // 151-300 words
            'veryLong': 0  // 300+ words
        };

        wordCounts.forEach(count => {
            if (count <= 50) groups.short++;
            else if (count <= 150) groups.medium++;
            else if (count <= 300) groups.long++;
            else groups.veryLong++;
        });

        return groups;
    }

    getMostCommonMood(moodDistribution) {
        let maxCount = 0;
        let mostCommon = null;

        Object.entries(moodDistribution).forEach(([mood, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = mood;
            }
        });

        return mostCommon;
    }

    getDayName(dayIndex) {
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return days[dayIndex];
    }

    getMonthName(monthIndex) {
        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return months[monthIndex];
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

// Create and export singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
