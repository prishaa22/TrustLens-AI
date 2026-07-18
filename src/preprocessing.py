"""
=========================================
TrustLens AI
Preprocessing Module
=========================================

This module:
1. Loads the dataset
2. Inspects the dataset
3. Cleans review text
4. Saves cleaned dataset
"""

# ==========================================
# Imports
# ==========================================

import pandas as pd
import nltk
import re
import string

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from src.config import RAW_DATA_PATH, PROCESSED_DATA_PATH

# ==========================================
# Download NLTK Resources
# ==========================================

nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# ==========================================
# Global Objects
# ==========================================

STOP_WORDS = set(stopwords.words("english"))
LEMMATIZER = WordNetLemmatizer()

# ==========================================
# Dataset Functions
# ==========================================

def load_dataset(path):
    """
    Load dataset from CSV.
    """
    return pd.read_csv(path)


def inspect_dataset(df):
    """
    Print basic dataset information.
    """

    print("=" * 60)
    print("DATASET SHAPE")
    print(df.shape)

    print("\n" + "=" * 60)
    print("COLUMN NAMES")
    print(df.columns)

    print("\n" + "=" * 60)
    print("FIRST 5 ROWS")
    print(df.head())

    print("\n" + "=" * 60)
    print("MISSING VALUES")
    print(df.isnull().sum())

    print("\n" + "=" * 60)
    print("LABEL DISTRIBUTION")
    print(df["label"].value_counts())

# ==========================================
# Text Cleaning Functions
# ==========================================

def convert_to_lowercase(text):
    return text.lower()


def remove_urls(text):
    return re.sub(r"http\S+|www\S+", "", text)


def remove_html(text):
    return re.sub(r"<.*?>", "", text)


def remove_numbers(text):
    return re.sub(r"\d+", "", text)


def remove_punctuation(text):
    return text.translate(str.maketrans("", "", string.punctuation))


def remove_extra_spaces(text):
    return " ".join(text.split())


def remove_stop_words(text):

    words = text.split()

    words = [word for word in words if word not in STOP_WORDS]

    return " ".join(words)


def lemmatize_text(text):

    words = text.split()

    words = [LEMMATIZER.lemmatize(word) for word in words]

    return " ".join(words)

# ==========================================
# Main Cleaning Pipeline
# ==========================================

def clean_text(text):
    """
    Complete preprocessing pipeline.
    """

    text = str(text)

    text = convert_to_lowercase(text)

    text = remove_urls(text)

    text = remove_html(text)

    text = remove_numbers(text)

    text = remove_punctuation(text)

    text = remove_extra_spaces(text)

    text = remove_stop_words(text)

    text = lemmatize_text(text)

    return text

# ==========================================
# Save Dataset
# ==========================================

def save_processed_dataset(df):

    df.to_csv(PROCESSED_DATA_PATH, index=False)

    print("\nProcessed dataset saved successfully!")

# ==========================================
# Main Function
# ==========================================

def main():

    print("\nLoading Dataset...\n")

    df = load_dataset(RAW_DATA_PATH)

    print("Dataset Loaded Successfully!\n")

    inspect_dataset(df)

    print("\nCleaning Reviews...\n")

    df["clean_text"] = df["text_"].apply(clean_text)

    print(df[["text_", "clean_text"]].head())

    save_processed_dataset(df)

# ==========================================
# Entry Point
# ==========================================

if __name__ == "__main__":
    main()