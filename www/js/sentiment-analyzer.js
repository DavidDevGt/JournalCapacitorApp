import { App } from '@capacitor/app';
import { APP_CONSTANTS } from './constants/index.js';

class SentimentAnalyzer {
    constructor() {
        this.config = {
            updateDelay: APP_CONSTANTS.UPDATE_DELAY_MS,
            minWords: APP_CONSTANTS.MIN_WORDS,
            confidenceThreshold: APP_CONSTANTS.CONFIDENCE_THRESHOLD,
            intensifierWeight: APP_CONSTANTS.INTENSIFIER_WEIGHT,
            negationWindow: APP_CONSTANTS.NEGATION_WINDOW,
            smoothing: APP_CONSTANTS.SMOOTHING,
            heuristicWeight: APP_CONSTANTS.HEURISTIC_WEIGHT,
            bayesWeight: APP_CONSTANTS.BAYES_WEIGHT
        };

        this.sentimentWords = new Map([
            ['veryPositive', new Set([
                'excelente', 'increíble', 'fantástico', 'maravilloso', 'extraordinario',
                'perfecto', 'genial', 'espectacular', 'fabuloso', 'brillante',
                'magnífico', 'sensacional', 'estupendo', 'excepcional', 'radiante',
                'eufórico', 'entusiasmado', 'emocionado', 'felicísimo', 'encantado',
                'asombroso', 'impresionante', 'deslumbrante', 'sublime', 'divino'
            ])],
            ['positive', new Set([
                'bueno', 'bien', 'feliz', 'contento', 'alegre', 'satisfecho',
                'agradable', 'positivo', 'optimista', 'esperanzado', 'tranquilo',
                'confiado', 'motivado', 'inspirado', 'agradecido', 'afortunado',
                'sonriente', 'jovial', 'animado', 'próspero', 'exitoso',
                'útil', 'valioso', 'efectivo', 'eficaz', 'práctico', 'gracias'
            ])],
            ['negative', new Set([
                'mal', 'malo', 'triste', 'deprimido', 'desanimado', 'preocupado',
                'ansioso', 'estresado', 'frustrado', 'molesto', 'irritado',
                'cansado', 'agotado', 'aburrido', 'confundido', 'perdido',
                'solo', 'vacío', 'decepcionado', 'nervioso', 'inquieto',
                'inseguro', 'temeroso', 'problemático', 'difícil', 'inútil'
            ])],
            ['veryNegative', new Set([
                'terrible', 'horrible', 'pésimo', 'desesperado', 'devastado',
                'furioso', 'enojado', 'odioso', 'detestable', 'repugnante',
                'insoportable', 'doloroso', 'sufriendo', 'miserable', 'infeliz',
                'catastrófico', 'desastroso', 'fatal', 'nefasto', 'abominable'
            ])]
        ]);

        this.emotionPatterns = new Map([
            ['joy', new Set(['risa', 'sonrisa', 'diversión', 'humor', 'celebrar', 'alegría'])],
            ['sadness', new Set(['llorar', 'lágrimas', 'pena', 'melancolía', 'tristeza', 'dolor'])],
            ['anger', new Set(['enojo', 'rabia', 'ira', 'furia', 'molestia', 'irritación'])],
            ['fear', new Set(['miedo', 'terror', 'pánico', 'temor', 'ansiedad', 'nervios'])],
            ['surprise', new Set(['sorpresa', 'asombro', 'shock', 'inesperado', 'increíble'])],
            ['love', new Set(['amor', 'cariño', 'afecto', 'ternura', 'pasión', 'romance'])]
        ]);

        this.intensifiersHigh = new Set(['muy', 'mucho', 'bastante', 'demasiado', 'extremadamente', 'súper']);
        this.intensifiersLow = new Set(['poco', 'algo', 'ligeramente', 'apenas', 'casi']);
        this.negations = new Set(['no', 'nunca', 'jamás', 'tampoco', 'nada', 'nadie', 'ningún', 'sin']);

        this.model = this.initCompactModel();

        this.cache = new Map();
        this.maxCacheSize = 100;
    }

    /**
     * Initialize the compact model for sentiment analysis.
     * @returns {Object} The compact model.
     */
    initCompactModel() {
        const wordProbs = new Map([
            ['positive', new Map([
                ['me', 0.18], ['gusta', 0.32], ['bien', 0.28], ['bueno', 0.25], ['feliz', 0.35],
                ['genial', 0.40], ['perfecto', 0.45], ['excelente', 0.48], ['increíble', 0.42],
                ['amor', 0.38], ['alegría', 0.38], ['gracias', 0.25], ['hermoso', 0.38],
                ['éxito', 0.38], ['lograr', 0.32], ['ganar', 0.34], ['disfrutar', 0.37]
            ])],
            ['negative', new Map([
                ['no', 0.15], ['mal', 0.32], ['terrible', 0.42], ['odio', 0.50], ['triste', 0.38],
                ['problema', 0.28], ['error', 0.25], ['fracaso', 0.42], ['miedo', 0.38],
                ['llorar', 0.38], ['imposible', 0.35], ['difícil', 0.22], ['nunca', 0.25]
            ])],
            ['neutral', new Map([
                ['el', 0.05], ['la', 0.05], ['de', 0.04], ['en', 0.04], ['que', 0.06],
                ['es', 0.05], ['son', 0.05], ['tiempo', 0.08], ['persona', 0.09], ['día', 0.07]
            ])]
        ]);

        return {
            wordProbs,
            classPriors: new Map([['positive', 0.32], ['negative', 0.35], ['neutral', 0.33]])
        };
    }

    /**
     * Preprocess the input text for analysis.
     * @param {string} text - The text to preprocess.
     * @returns {string} The preprocessed text.
     */
    preprocessText(text) {
        if (!text) return '';

        return text
            .toLowerCase()
            .replace(/[^\w\sáéíóúüñ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate the heuristic score for a list of words.
     * @param {Array<string>} words - The words to analyze.
     * @returns {number} The calculated heuristic score.
     */
    scoreHeuristic(words) {
        if (!words.length) return 0;

        const negatedIndices = this.findNegatedWords(words);
        let score = 0;
        let totalWords = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isNegated = negatedIndices.has(i);
            let wordScore = 0;

            for (const [category, wordSet] of this.sentimentWords) {
                if (wordSet.has(word)) {
                    switch (category) {
                        case 'veryPositive': wordScore = isNegated ? -2 : 2; break;
                        case 'positive': wordScore = isNegated ? -1 : 1; break;
                        case 'negative': wordScore = isNegated ? 1 : -1; break;
                        case 'veryNegative': wordScore = isNegated ? 2 : -2; break;
                    }
                    totalWords++;
                    break;
                }
            }

            score += wordScore;
        }

        const intensityMod = this.calculateIntensity(words);
        const normalizedScore = totalWords > 0 ? score / totalWords : 0;

        return Math.max(-1, Math.min(1, normalizedScore * intensityMod));
    }

    /**
     * Find negated words in a list of words.
     * @param {Array<string>} words - The words to analyze.
     * @returns {Set<number>} A set of indices for negated words.
     */
    findNegatedWords(words) {
        const negated = new Set();
        for (let i = 0; i < words.length; i++) {
            if (this.negations.has(words[i])) {
                const end = Math.min(i + this.config.negationWindow + 1, words.length);
                for (let j = i + 1; j < end; j++) {
                    negated.add(j);
                }
            }
        }
        return negated;
    }

    /**
     * Calculate the intensity of sentiment in a list of words.
     * @param {Array<string>} words - The words to analyze.
     * @returns {number} The calculated intensity.
     */
    calculateIntensity(words) {
        let modifier = 1.0;
        for (const word of words) {
            if (this.intensifiersHigh.has(word)) {
                modifier += this.config.intensifierWeight;
            } else if (this.intensifiersLow.has(word)) {
                modifier -= this.config.intensifierWeight * 0.5;
            }
        }
        return Math.max(0.1, Math.min(2.0, modifier));
    }

    /**
     * Predict the sentiment of a given text using Naive Bayes.
     * @param {Array<string>} words - The words to analyze.
     * @returns {Map<string, number>} A map with predicted sentiment probabilities.
     */
    predictNaiveBayes(words) {
        if (!words.length) return this.getDefaultProbs();

        const logProbs = new Map();

        for (const [sentiment, prior] of this.model.classPriors) {
            let logProb = Math.log(prior);
            const sentimentWords = this.model.wordProbs.get(sentiment);

            for (const word of words) {
                const wordProb = sentimentWords.get(word) ?? this.config.smoothing;
                logProb += Math.log(wordProb);
            }

            logProbs.set(sentiment, logProb);
        }

        return this.normalizeProbs(logProbs);
    }

    /**
     * Normalize log probabilities to a probability distribution.
     * @param {Map<string, number>} logProbs 
     * @returns {Map<string, number>} A map with normalized probabilities.
     */
    normalizeProbs(logProbs) {
        const maxLogProb = Math.max(...logProbs.values());
        const probs = new Map();
        let total = 0;

        for (const [sentiment, logProb] of logProbs) {
            const prob = Math.exp(logProb - maxLogProb);
            probs.set(sentiment, prob);
            total += prob;
        }

        for (const [sentiment, prob] of probs) {
            probs.set(sentiment, prob / total);
        }

        return probs;
    }

    /**
     * Get the default probabilities for sentiment classes.
     * @returns {Map<string, number>} A map with default probabilities for positive, negative
     */
    getDefaultProbs() {
        return new Map([['positive', 0.33], ['negative', 0.33], ['neutral', 0.34]]);
    }

    /**
     * Detect emotions in a list of words.
     * @param {Array<string>} words - The words to analyze.
     * @returns {Object} An object containing detected emotions and their intensities.
     */
    detectEmotions(words) {
        if (!words.length) return {};

        const emotions = {};
        const wordSet = new Set(words);
        const totalWords = words.length;

        for (const [emotion, keywords] of this.emotionPatterns) {
            let matches = 0;
            for (const keyword of keywords) {
                if (wordSet.has(keyword)) matches++;
            }
            emotions[emotion] = Math.min(1.0, matches / Math.max(totalWords * 0.1, 1));
        }

        return emotions;
    }

    /**
     * Convert a sentiment score to an emoji representation.
     * @param {number} score - The sentiment score.
     * @returns {string} The corresponding emoji.
     */
    scoreToEmoji(score) {
        if (score >= 0.4) return '😄';
        if (score >= 0.15) return '😊';
        if (score >= 0.05) return '🙂';
        if (score <= -0.2) return '😢';
        return '😐';
    }

    /**
     * Analyze the sentiment of a given text.
     * @param {string} text - The text to analyze.
     * @returns {Object} The analysis result.
     */
    analyze(text) {
        if (!text?.trim()) return this.getDefaultResult();

        if (this.cache.has(text)) {
            return this.cache.get(text);
        }

        const cleaned = this.preprocessText(text);
        const words = cleaned.split(' ').filter(w => w.length > 0);

        if (words.length < this.config.minWords) {
            return this.getDefaultResult();
        }

        const heuristicScore = this.scoreHeuristic(words);
        const bayesProbs = this.predictNaiveBayes(words);
        const emotions = this.detectEmotions(words);

        const bayesScore = bayesProbs.get('positive') - bayesProbs.get('negative');
        const finalScore = (heuristicScore * this.config.heuristicWeight +
            bayesScore * this.config.bayesWeight);

        const confidence = this.calculateConfidence(heuristicScore, bayesProbs);
        const mood = this.scoreToEmoji(finalScore);

        const result = {
            mood,
            sentiment: mood,
            score: Math.round(finalScore * 1000) / 1000,
            confidence: Math.round(confidence * 1000) / 1000,
            wordCount: words.length,
            emotions,
            details: {
                heuristicScore: Math.round(heuristicScore * 1000) / 1000,
                bayesScore: Math.round(bayesScore * 1000) / 1000,
                bayesProbs: Object.fromEntries(
                    Array.from(bayesProbs, ([k, v]) => [k, Math.round(v * 1000) / 1000])
                )
            }
        };

        this.updateCache(text, result);
        return result;
    }

    /**
     * Calculate the confidence score for the sentiment analysis.
     * @param {number} heuristicScore - The heuristic score.
     * @param {Map<string, number>} bayesProbs - The Bayesian probabilities.
     * @returns {number} The calculated confidence score.
     */
    calculateConfidence(heuristicScore, bayesProbs) {
        const bayesScore = bayesProbs.get('positive') - bayesProbs.get('negative');
        const consistency = Math.max(0, 1 - Math.abs(heuristicScore - bayesScore));
        const certainty = Math.max(...bayesProbs.values());
        return consistency * 0.4 + certainty * 0.6;
    }

    /**
     * Update the sentiment cache.
     * @param {string} key - The text to cache.
     * @param {Object} value - The analysis result to cache.
     */
    updateCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Get the default result structure for sentiment analysis.
     * @returns {Object} The default result object.
     */
    getDefaultResult() {
        return {
            mood: '😐',
            sentiment: '😐',
            score: 0,
            confidence: 0,
            wordCount: 0,
            emotions: {},
            details: {
                heuristicScore: 0,
                bayesScore: 0,
                bayesProbs: { positive: 0.33, negative: 0.33, neutral: 0.34 }
            }
        };
    }

    /**
     * Get the mood for a given text.
     * @param {string} text - The text to analyze.
     * @returns {string} The detected mood emoji.
     */
    getMood(text) {
        return this.analyze(text).mood;
    }

    /**
     * Analyze a batch of texts.
     * @param {Array<string>} texts - The texts to analyze.
     * @returns {Array<Object>} An array of analysis results.
     */
    analyzeBatch(texts) {
        return texts.map(text => ({
            text: text.length > 100 ? text.substring(0, 100) + '...' : text,
            result: this.analyze(text)
        }));
    }

    /**
     * Get statistics for a batch of texts.
     * @param {Array<string>} texts - The texts to analyze.
     * @returns {Object|null} An object containing statistics or null if no texts are provided.
     */
    getStatistics(texts) {
        if (!texts?.length) return null;

        const results = this.analyzeBatch(texts);
        const scores = results.map(r => r.result.score);
        const sentiments = results.map(r => r.result.sentiment);

        const sentimentCounts = sentiments.reduce((acc, sentiment) => {
            acc[sentiment] = (acc[sentiment] || 0) + 1;
            return acc;
        }, {});

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const mostCommon = Object.entries(sentimentCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

        return {
            total: texts.length,
            averageScore: Math.round(avgScore * 1000) / 1000,
            sentimentDistribution: sentimentCounts,
            mostCommonSentiment: mostCommon
        };
    }

    /**
     * Clear the sentiment cache.
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get performance metrics for the sentiment analyzer.
     * @returns {Object} An object containing performance metrics.
     */
    getPerformanceMetrics() {
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            totalWords: {
                veryPositive: this.sentimentWords.get('veryPositive').size,
                positive: this.sentimentWords.get('positive').size,
                negative: this.sentimentWords.get('negative').size,
                veryNegative: this.sentimentWords.get('veryNegative').size
            }
        };
    }
}

export default SentimentAnalyzer;

if (typeof window !== 'undefined') {
    window.SentimentAnalyzer = SentimentAnalyzer;
}