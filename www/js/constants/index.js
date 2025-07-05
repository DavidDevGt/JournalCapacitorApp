export const APP_CONSTANTS = {
    // Sentiment analysis config
    UPDATE_DELAY_MS: 300,
    MIN_WORDS: 2,
    CONFIDENCE_THRESHOLD: 0.25,
    INTENSIFIER_WEIGHT: 0.3,
    NEGATION_WINDOW: 3,
    SMOOTHING: 0.01,
    HEURISTIC_WEIGHT: 0.7,
    BAYES_WEIGHT: 0.3,

    // Virtual scroll config
    VIRTUAL_SCROLL: {
        ITEM_HEIGHT: 160,
        BUFFER_SIZE: 8,
        THROTTLE_LIMIT_MS: 16,
        CONTENT_PREVIEW_LENGTH: 100,
        SWIPE_THRESHOLD_PX: 60,
        MAX_SWIPE_TRANSLATE_PX: 80,
        MIN_SWIPE_MOVEMENT_PX: 5,
        DELETE_ANIMATION_DELAY_MS: 220,
        DELETE_TRANSFORM_PERCENT: -120,
        INITIALIZATION_DELAY_MS: 30,
        ITEM_HEIGHT_ADJUSTMENT: {
            MIN_HEIGHT: 150,
            MAX_HEIGHT: 300,
            CONTENT_LENGTH_THRESHOLD: 200,
            HEIGHT_MULTIPLIER: 0.3
        }
    },

    // time calculations
    TIME_CALCULATIONS: {
        MINUTES_PER_HOUR: 60,
        HOURS_PER_DAY: 24,
        DAYS_PER_WEEK: 7,
        DAYS_PER_MONTH: 30,
        DAYS_PER_YEAR: 365
    }
}