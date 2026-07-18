"""
=========================================
TrustLens AI
Feature Engineering Module
=========================================
"""

import pandas as pd
from textblob import TextBlob
import re

from src.config import (
    PROCESSED_DATA_PATH,
    FEATURE_DATA_PATH
)


# ----------------------------------------
# Load Dataset
# ----------------------------------------

def load_dataset(path):
    return pd.read_csv(path)


# ----------------------------------------
# Feature Functions
# ----------------------------------------

def character_count(text):
    return len(str(text))


def word_count(text):
    return len(str(text).split())


def average_word_length(text):

    words = str(text).split()

    if len(words) == 0:
        return 0

    return sum(len(word) for word in words) / len(words)


def exclamation_count(text):
    return str(text).count("!")


def question_count(text):
    return str(text).count("?")


def capital_letter_count(text):
    return sum(1 for c in str(text) if c.isupper())


def sentiment_score(text):
    return TextBlob(str(text)).sentiment.polarity

def subjectivity_score(text):
    return TextBlob(str(text)).sentiment.subjectivity

def extreme_sentiment(text):

    polarity = TextBlob(str(text)).sentiment.polarity

    if polarity >= 0.8 or polarity <= -0.8:
        return 1

    return 0

def review_length(text):
    return len(str(text))



def sentence_count(text):
    sentences = re.split(r"[.!?]+", str(text))
    sentences = [s for s in sentences if s.strip()]
    return len(sentences)

def average_sentence_length(text):

    text = str(text)

    sentences = re.split(r"[.!?]+", text)

    sentences = [s for s in sentences if s.strip()]

    if len(sentences) == 0:
        return 0

    words = text.split()

    return len(words) / len(sentences)


def unique_word_count(text):
    return len(set(str(text).lower().split()))

def lexical_diversity(text):

    words = str(text).lower().split()

    if len(words) == 0:
        return 0

    return len(set(words)) / len(words)

def repeated_word_ratio(text):

    words = str(text).lower().split()

    if len(words) == 0:
        return 0

    unique = len(set(words))

    repeated = len(words) - unique

    return repeated / len(words)

PROMOTIONAL_WORDS = {

    "best",
    "excellent",
    "perfect",
    "must",
    "buy",
    "recommended",
    "recommend",
    "amazing",
    "awesome",
    "fantastic",
    "love",
    "premium",
    "quality",
    "worth",
    "outstanding",
    "brilliant",
    "superb",

    # Spam / scam trigger words — separate from genuine-praise words above,
    # these signal promotional manipulation rather than product satisfaction
    "free",
    "click",
    "subscribe",
    "register",
    "winner",
    "congratulations",
    "guarantee",
    "guaranteed",
    "limited",
    "urgent",
    "cash",
    "prize",
    "discount",
    "voucher",
    "coupon",
    "offer",
    "deal",
    "bonus"

}


GENERIC_PHRASES = [

    "must buy",

    "highly recommend",

    "good quality",

    "excellent product",

    "nice product",

    "worth buying",

    "very good",

    "best product",

    "love this",

    "perfect product",

    # Spam / scam phrasing
    "click here",

    "buy now",

    "gift card",

    "free gift",

    "act now",

    "limited time",

    "call now",

    "order now",

    "risk free",

    "no cost",

    "amazing deal",

    "unbelievable price",

    "100% genuine",

    "money back guarantee",

    "don't miss",

    "hurry up"

]

import string

NEGATION_WORDS = {"not", "no", "never", "n't", "wouldn't", "don't", "doesn't", "didn't", "won't", "can't"}

def promotional_word_count(text):
    words = str(text).lower().translate(str.maketrans("", "", string.punctuation)).split()
    count = 0
    for i, word in enumerate(words):
        if word in PROMOTIONAL_WORDS:
            # check the word right before it for a negation
            if i > 0 and any(neg in words[i-1] for neg in NEGATION_WORDS):
                continue
            count += 1
    return count



def rating_sentiment_consistency(rating, sentiment):

    normalized_rating = (rating - 1) / 4

    normalized_sentiment = (sentiment + 1) / 2

    return abs(normalized_rating - normalized_sentiment)


def generic_phrase_count(text):

    text = str(text).lower()

    count = 0

    for phrase in GENERIC_PHRASES:

        if phrase in text:

            count += 1

    return count

def emoji_count(text):
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "]",  # no "+" here
        flags=re.UNICODE
    )
    return len(emoji_pattern.findall(str(text)))

def url_count(text):

    urls = re.findall(r'http\S+|www\.\S+', str(text))

    return len(urls)

def all_caps_word_count(text):

    words = str(text).split()

    return sum(word.isupper() and len(word) > 1 for word in words)




# ----------------------------------------
# Add Features
# ----------------------------------------

def add_basic_features(df):

    df["character_count"] = df["text_"].apply(character_count)

    df["word_count"] = df["text_"].apply(word_count)

    df["average_word_length"] = df["text_"].apply(
        average_word_length
    )

    df["exclamation_count"] = df["text_"].apply(
        exclamation_count
    )

    df["question_count"] = df["text_"].apply(
        question_count
    )

    df["capital_letter_count"] = df["text_"].apply(
        capital_letter_count
    )

    df["sentiment"] = df["text_"].apply(
        sentiment_score
    )

    df["subjectivity"] = df["text_"].apply(subjectivity_score)

    df["extreme_sentiment"] = df["text_"].apply(extreme_sentiment)

    df["review_length"] = df["text_"].apply(review_length)

    df["sentence_count"] = df["text_"].apply(sentence_count)

    df["average_sentence_length"] = df["text_"].apply(average_sentence_length)

    df["unique_word_count"] = df["text_"].apply(unique_word_count)

    df["lexical_diversity"] = df["text_"].apply(lexical_diversity)

    df["repeated_word_ratio"] = df["text_"].apply(repeated_word_ratio)

    df["promotional_word_count"] = df["text_"].apply(promotional_word_count)

    df["rating_sentiment_difference"] = df.apply(

    lambda row:

    rating_sentiment_consistency(

        row["rating"],

        row["sentiment"]

    ),

    axis=1)

    df["generic_phrase_count"] = df["text_"].apply(generic_phrase_count)

    df["emoji_count"] = df["text_"].apply(emoji_count)

    df["url_count"] = df["text_"].apply(url_count)

    df["all_caps_word_count"] = df["text_"].apply(all_caps_word_count)

    return df

def extract_features(review_text, rating=None):
    """
    Generate all handcrafted features for a single review.
    Returns a dictionary.
    """

    features = {}

    features["character_count"] = character_count(review_text)

    features["word_count"] = word_count(review_text)

    features["average_word_length"] = average_word_length(review_text)

    features["exclamation_count"] = exclamation_count(review_text)

    features["question_count"] = question_count(review_text)

    features["capital_letter_count"] = capital_letter_count(review_text)

    features["sentiment"] = sentiment_score(review_text)

    features["subjectivity"] = subjectivity_score(review_text)

    features["extreme_sentiment"] = extreme_sentiment(review_text)

    features["review_length"] = review_length(review_text)

    features["sentence_count"] = sentence_count(review_text)

    features["average_sentence_length"] = average_sentence_length(review_text)

    features["unique_word_count"] = unique_word_count(review_text)

    features["lexical_diversity"] = lexical_diversity(review_text)

    features["repeated_word_ratio"] = repeated_word_ratio(review_text)

    features["promotional_word_count"] = promotional_word_count(review_text)

    features["generic_phrase_count"] = generic_phrase_count(review_text)

    features["emoji_count"] = emoji_count(review_text)

    features["url_count"] = url_count(review_text)

    features["all_caps_word_count"] = all_caps_word_count(review_text)

    if rating is None:
        rating = 3

    features["rating_sentiment_difference"] = rating_sentiment_consistency(
        rating,
        features["sentiment"]
    )
    
    return features



# ----------------------------------------
# Main
# ----------------------------------------

def main():

    print("\nLoading Processed Dataset...\n")

    df = load_dataset(PROCESSED_DATA_PATH)

    print("Dataset Loaded Successfully!\n")

    df = add_basic_features(df)

    print("\nGenerated Features\n")

    feature_columns = [

    "character_count",
    "word_count",
    "average_word_length",

    "review_length",

    "sentence_count",
    "average_sentence_length",

    "unique_word_count",
    "lexical_diversity",
    "repeated_word_ratio",

    "exclamation_count",
    "question_count",
    "capital_letter_count",
    "all_caps_word_count",

    "sentiment",
    "subjectivity",
    "extreme_sentiment",

    "promotional_word_count",
    "generic_phrase_count",
    "emoji_count",
    "url_count",

    "rating_sentiment_difference"

]

    print("\nGenerated Features\n")

    columns = [

      "promotional_word_count",

      "generic_phrase_count",

      "emoji_count",
 
      "url_count",

      "all_caps_word_count"

 ]
    

    print(df[feature_columns + columns].head())


    print("\nSaving Feature Dataset...")

    df.to_csv(FEATURE_DATA_PATH, index=False)

    print("Feature Dataset Saved Successfully!")


if __name__ == "__main__":
    main()