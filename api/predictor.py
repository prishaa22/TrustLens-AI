"""
=========================================
TrustLens AI
Prediction Module
=========================================
"""

import time
import joblib
import pandas as pd

from pathlib import Path
from scipy.sparse import hstack

from src.preprocessing import clean_text
from src.feature_engineering import extract_features
from api.explain import generate_explanation


# =========================================
# Model Paths
# =========================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "best_model.pkl"
TFIDF_PATH = BASE_DIR / "models" / "tfidf_vectorizer.pkl"
LABEL_ENCODER_PATH = BASE_DIR / "models" / "label_encoder.pkl"
FEATURE_COLUMNS_PATH = BASE_DIR / "models" / "feature_columns.pkl"


# =========================================
# Load Models
# =========================================

print("Loading AI Model...")

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(TFIDF_PATH)
label_encoder = joblib.load(LABEL_ENCODER_PATH)
feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

print("Model Loaded Successfully!")


# =========================================
# Prediction Function
# =========================================

def predict_review(review, rating=5):

    start_time = time.perf_counter()

    print("=" * 60)
    print("Review:", review)
    print("Rating:", rating)

    # -------------------------------------
    # Preprocessing
    # -------------------------------------

    clean_review = clean_text(review)

    # -------------------------------------
    # Feature Engineering
    # -------------------------------------

    features = extract_features(review, rating)

    feature_df = pd.DataFrame([features])

    feature_df = feature_df[feature_columns]

    # -------------------------------------
    # TF-IDF
    # -------------------------------------

    text_vector = vectorizer.transform([clean_review])

    final_vector = hstack([text_vector, feature_df])

    # -------------------------------------
    # Prediction
    # -------------------------------------

    prediction = model.predict(final_vector)[0]

    probabilities = model.predict_proba(final_vector)[0]

    confidence = max(probabilities) * 100

    label = label_encoder.inverse_transform([prediction])[0]

    # -------------------------------------
    # Decode Labels
    # -------------------------------------

    if label == "CG":
        label = "Fake Review"

    elif label == "OR":
        label = "Genuine Review"

    # -------------------------------------
    # Rule-Based Spam Override
    # -------------------------------------
    # The trained classifier distinguishes AI-generated vs human-written
    # review text (the dataset's original CG/OR labels) - it was never
    # trained to recognize blatant promotional spam, so it can miss
    # obvious cases like "CLICK HERE FREE GIFT CARD!!!" that stack
    # multiple spam markers at once. When rule-based evidence is this
    # strong, override the model's raw prediction rather than trust a
    # classifier operating outside what it was actually trained for.

    spam_override_applied = False

    strong_spam_signal = (
        features["promotional_word_count"] >= 3
        or (features["promotional_word_count"] >= 2 and features["generic_phrase_count"] >= 2)
        or (features["generic_phrase_count"] >= 2 and features["all_caps_word_count"] >= 2)
    )

    # Very short reviews leaning heavily on caps/exclamations (e.g. "WOWWWWW!!!!!
    # OMGGGGGG!!!!!!!BUY NOWWWWW") don't contain real promotional words - elongated
    # slang like "NOWWWWW" doesn't match "now" - so the check above misses them.
    # This mirrors the existing low-content/hype-only risk-score rule further
    # below, but requires BOTH signals together (not just one) to avoid flipping
    # ordinary short enthusiastic reviews like "Amazing product!!!" to Fake.
    low_content_hype_signal = (
        features["word_count"] <= 5
        and features["all_caps_word_count"] >= 2
        and features["exclamation_count"] >= 5
    )

    strong_fake_signal = strong_spam_signal or low_content_hype_signal

    if label == "Genuine Review" and strong_fake_signal:
        label = "Fake Review"
        spam_override_applied = True
        # Original `confidence` was the model's probability for the
        # opposite (Genuine) class - reusing it here would misrepresent
        # certainty in the new label, so use a fixed rule-based value
        # instead of carrying over a number that no longer means what
        # it originally meant.
        confidence = 88.0

    # -------------------------------------
    # Rule-Based Genuine Override (mirror-image case)
    # -------------------------------------
    # Short, plain, low-signal reviews (e.g. "Good shoes. Value for money")
    # can get misread by the raw classifier as "Fake" simply because there's
    # so little text for the CG/OR writing-style model to work with - not
    # because anything about the review is actually suspicious. When every
    # rule-based indicator comes back completely clean (no promo words, no
    # generic phrases, no links/emojis/caps, no rating-sentiment mismatch,
    # no repetition), trust the absence of evidence over the raw model call.

    genuine_override_applied = False

    # Deliberately scoped to short text only. This targets the specific
    # brevity-driven false positive (too little text for the writing-style
    # model to work with) without touching longer, fluent fake reviews that
    # have no rule-based tells - catching those is the actual job the ML
    # model exists to do, and blanket-overriding on "zero signals" alone
    # would silently defeat that for any well-written fake review.
    no_suspicious_signal = (
        features["word_count"] <= 15
        and features["promotional_word_count"] == 0
        and features["generic_phrase_count"] == 0
        and features["emoji_count"] == 0
        and features["url_count"] == 0
        and features["all_caps_word_count"] == 0
        and features["repeated_word_ratio"] <= 0.20
        and features["rating_sentiment_difference"] <= 0.45
    )

    if label == "Fake Review" and not spam_override_applied and no_suspicious_signal:
        label = "Genuine Review"
        genuine_override_applied = True
        confidence = 80.0

    # -------------------------------------
    # Summary
    # -------------------------------------

    if label == "Fake Review":

        summary = (
            "This review exhibits multiple linguistic patterns commonly associated "
            "with deceptive or promotional reviews."
        )

    else:

        summary = (
            "This review appears authentic based on its writing style, "
            "language consistency and sentiment."
        )

    # -------------------------------------
    # AI Explanation
    # -------------------------------------

    reasons = generate_explanation(features, label)

    if spam_override_applied:
        reasons.insert(
            0,
            "Note: Strong spam/hype-only patterns are present — "
            "classification was corrected by rule-based override since the "
            "AI model's initial read did not account for this."
        )

    if genuine_override_applied:
        reasons.insert(
            0,
            "Note: No promotional, spam, or hype-only patterns were found — "
            "classification was corrected by rule-based override since the "
            "AI model's initial read did not account for the review's brevity."
        )

    # -------------------------------------
    # Risk Score
    # -------------------------------------

    risk_score = 0

    if features["promotional_word_count"] >= 2:
        risk_score += 20

    if features["generic_phrase_count"] >= 2:
        risk_score += 20

    if features["rating_sentiment_difference"] > 0.60:
        risk_score += 20

    if features["extreme_sentiment"] == 1:
        risk_score += 10

    if features["emoji_count"] >= 3:
        risk_score += 10

    if features["url_count"] > 0:
        risk_score += 20

    # Very short, low-content reviews that lean heavily on caps/exclamation
    # marks read as "hype-only" — sentiment features often miss this because
    # slang/elongated words (e.g. "OMGGG", "WOWWW") aren't recognized by the
    # sentiment lexicon and score as neutral, hiding what is otherwise a
    # classic low-effort fake-review pattern.
    is_low_content = features["word_count"] <= 5
    is_hype_heavy = (
        features["all_caps_word_count"] >= 1
        or features["exclamation_count"] >= 3
    )

    if is_low_content and is_hype_heavy:
        risk_score += 20

    if risk_score < 20:
        risk = "Low"

    elif risk_score < 50:
        risk = "Medium"

    else:
        risk = "High"

    # -------------------------------------
    # Feature Summary
    # -------------------------------------

    feature_summary = []

    if features["promotional_word_count"] > 0:
        feature_summary.append("Promotional Language")

    if features["generic_phrase_count"] > 0:
        feature_summary.append("Generic Marketing Phrases")

    if features["emoji_count"] > 0:
        feature_summary.append("Contains Emojis")

    if features["url_count"] > 0:
        feature_summary.append("Contains External Links")

    if features["all_caps_word_count"] > 0:
        feature_summary.append("Uses Excessive Capital Letters")

    if features["repeated_word_ratio"] > 0.20:
        feature_summary.append("Repeated Vocabulary")

    if features["rating_sentiment_difference"] > 0.45:
        feature_summary.append("Rating/Sentiment Mismatch")

    if is_low_content and is_hype_heavy:
        feature_summary.append("Low-Content, Hype-Only Text")

    if len(feature_summary) == 0:
        feature_summary.append("No Suspicious Linguistic Patterns")




    # -------------------------------------
    # Authenticity Score
    # -------------------------------------

    if label == "Genuine Review":

        authenticity_score = round(confidence)

        fake_probability = round(100 - confidence)

    else:

        authenticity_score = round(100 - confidence)

        fake_probability = round(confidence)

    # -------------------------------------
    # Trust Level
    # -------------------------------------

    if authenticity_score >= 90:

        trust = "Excellent"

    elif authenticity_score >= 75:

        trust = "High"

    elif authenticity_score >= 60:

        trust = "Moderate"

    elif authenticity_score >= 40:

        trust = "Low"

    else:

        trust = "Very Low"

    # -------------------------------------
    # Emotion
    # -------------------------------------

    sentiment = features["sentiment"]

    if sentiment > 0.5:

        emotion = "Positive"

    elif sentiment < -0.3:

        emotion = "Negative"

    else:

        emotion = "Neutral"

    # -------------------------------------
    # Reading Time
    # -------------------------------------

    reading_time = max(
        1,
        round(features["word_count"] / 200 * 60)
    )

    # -------------------------------------
    # Detection Flags
    # -------------------------------------

    flags = {

        "contains_links": features["url_count"] > 0,

        "contains_emojis": features["emoji_count"] > 0,

        "contains_caps": features["all_caps_word_count"] > 0,

        "contains_promotional_words":
            features["promotional_word_count"] > 0

    }

    # -------------------------------------
    # Processing Time
    # -------------------------------------

    processing_time = round(

        (time.perf_counter() - start_time) * 1000,

        2

    )

    # -------------------------------------
    # Final Response
    # -------------------------------------

    return {

        # ==========================
        # Prediction
        # ==========================

        "prediction": label,

        "summary": summary,

        "confidence": round(confidence, 2),

        "risk_level": risk,

        "overall_trust": trust,

        "authenticity_score": authenticity_score,

        "fake_probability": fake_probability,

        "rule_based_override_applied": spam_override_applied or genuine_override_applied,

        # ==========================
        # NLP
        # ==========================

        "emotion": emotion,

        "sentiment": round(features["sentiment"], 3),

        "subjectivity": round(features["subjectivity"], 3),

        # ==========================
        # Timing
        # ==========================

        "processing_time_ms": processing_time,

        "reading_time_seconds": reading_time,

        # ==========================
        # Explainability
        # ==========================

        "reasons": reasons,

        "feature_summary": feature_summary,

        # ==========================
        # Quick Flags
        # ==========================

        "flags": {

            "contains_links":
                features["url_count"] > 0,

            "contains_emojis":
                features["emoji_count"] > 0,

            "contains_caps":
                features["all_caps_word_count"] > 0,

            "contains_promotional_words":
                features["promotional_word_count"] > 0

        },

        # ==========================
        # Dashboard Statistics
        # ==========================

        "stats": {

            "characterCount":
                features["character_count"],

            "wordCount":
                features["word_count"],

            "sentenceCount":
                features["sentence_count"],

            "averageWordLength":
                round(features["average_word_length"], 2),

            "averageSentenceLength":
                round(features["average_sentence_length"], 2),

            "readingTime":
                reading_time,

            "emojiCount":
                features["emoji_count"],

            "urlsCount":
                features["url_count"],

            "promotionalWords":
                features["promotional_word_count"],

            "genericPhrases":
                features["generic_phrase_count"],

            "capsCount":
                features["all_caps_word_count"]

        },

        # ==========================
        # Review Signals
        # ==========================

        "reviewSignals": {

            "sentiment":
                round(features["sentiment"], 2),

            "subjectivity":
                round(features["subjectivity"], 2),

            "lexicalDiversity":
                round(features["lexical_diversity"], 2),

            "repeatedWordRatio":
                round(features["repeated_word_ratio"], 2),

            "ratingMismatch":
                round(features["rating_sentiment_difference"], 2),

            "extremeSentiment":
                bool(features["extreme_sentiment"])

        },

        # ==========================
        # Suspicious Indicators
        # ==========================

        "indicators": {

            "promotionalWords":
                features["promotional_word_count"],

            "genericPhrases":
                features["generic_phrase_count"],

            "emojiCount":
                features["emoji_count"],

            "urlCount":
                features["url_count"],

            "allCapsWords":
                features["all_caps_word_count"]

        },

        # ==========================
        # ML Pipeline
        # ==========================

        "pipeline": [

            {
                "stage": "Input Review",
                "status": "Completed"
            },

            {
                "stage": "Text Cleaning",
                "status": "Completed"
            },

            {
                "stage": "Feature Extraction",
                "status": "Completed"
            },

            {
                "stage": "TF-IDF Vectorization",
                "status": "Completed"
            },

            {
                "stage": "ML Classification",
                "status": "Completed"
            },

            {
                "stage": "Explainable AI",
                "status": "Completed"
            }

        ],

        # ==========================
        # Raw Features
        # ==========================

        "features": {

            "character_count":
                features["character_count"],

            "word_count":
                features["word_count"],

            "average_word_length":
                round(features["average_word_length"], 2),

            "review_length":
                features["review_length"],

            "sentence_count":
                features["sentence_count"],

            "average_sentence_length":
                round(features["average_sentence_length"], 2),

            "unique_word_count":
                features["unique_word_count"],

            "lexical_diversity":
                round(features["lexical_diversity"], 2),

            "repeated_word_ratio":
                round(features["repeated_word_ratio"], 2),

            "promotional_word_count":
                features["promotional_word_count"],

            "generic_phrase_count":
                features["generic_phrase_count"],

            "emoji_count":
                features["emoji_count"],

            "url_count":
                features["url_count"],

            "all_caps_word_count":
                features["all_caps_word_count"],

            "rating_sentiment_difference":
                round(features["rating_sentiment_difference"], 2),

            "sentiment":
                round(features["sentiment"], 2),

            "subjectivity":
                round(features["subjectivity"], 2),

            "extreme_sentiment":
                bool(features["extreme_sentiment"])

        }

    }

# =========================================
# Local Testing
# =========================================

if __name__ == "__main__":

    review = input("Enter Review:\n")

    rating = float(input("Enter Rating (1-5): "))

    result = predict_review(review, rating)

    print("\nPrediction Result\n")

    print(result)