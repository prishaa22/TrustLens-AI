"""
=========================================
TrustLens AI
Model Training Module
=========================================
"""

import pandas as pd
import joblib

from scipy.sparse import hstack

from sklearn.model_selection import train_test_split

from sklearn.preprocessing import LabelEncoder

from sklearn.feature_extraction.text import TfidfVectorizer

from sklearn.linear_model import LogisticRegression

from sklearn.svm import LinearSVC

from sklearn.calibration import CalibratedClassifierCV

from sklearn.ensemble import RandomForestClassifier

from xgboost import XGBClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

from config import (
    FEATURE_DATA_PATH,
    MODEL_PATH,
    TFIDF_PATH,
    LABEL_ENCODER_PATH,
    FEATURE_COLUMNS_PATH
)



def load_dataset():

    print("Loading Feature Dataset...")

    df = pd.read_csv(FEATURE_DATA_PATH)

    print("Dataset Loaded!")

    return df

NUMERIC_FEATURES = [

    "character_count",

    "word_count",

    "average_word_length",

    "exclamation_count",

    "question_count",

    "capital_letter_count",

    "sentiment",

    "subjectivity",

    "extreme_sentiment",

    "review_length",

    "sentence_count",

    "average_sentence_length",

    "unique_word_count",

    "lexical_diversity",

    "repeated_word_ratio",

    "promotional_word_count",

    "rating_sentiment_difference",

    "generic_phrase_count",

    "emoji_count",

    "url_count",

    "all_caps_word_count"

]

def prepare_data(df):

    print("\nPreparing Data...")

    encoder = LabelEncoder()

    y = encoder.fit_transform(df["label"])

    print(encoder.classes_)

    X_text = df["clean_text"].fillna("").astype(str)

    X_numeric = df[NUMERIC_FEATURES].fillna(0)

    return X_text, X_numeric, y, encoder

def vectorize_text(X_train_text, X_test_text):

    print("\nVectorizing Text...")

    vectorizer = TfidfVectorizer(
        max_features=10000,
        ngram_range=(1, 2),
        stop_words="english"
    )

    X_train_tfidf = vectorizer.fit_transform(X_train_text)

    X_test_tfidf = vectorizer.transform(X_test_text)

    return X_train_tfidf, X_test_tfidf, vectorizer

def combine_features(X_train_tfidf,
                     X_test_tfidf,
                     X_train_numeric,
                     X_test_numeric):

    print("Combining Text + Numerical Features...")

    X_train = hstack([X_train_tfidf, X_train_numeric])

    X_test = hstack([X_test_tfidf, X_test_numeric])

    return X_train, X_test



def train_logistic_regression(X_train, y_train):

    print("\nTraining Logistic Regression...")

    model = LogisticRegression(
    max_iter=5000,
    random_state=42
)

    model.fit(X_train, y_train)

    return model

def train_random_forest(X_train, y_train):

    print("\nTraining Random Forest...")

    model = RandomForestClassifier(

        n_estimators=300,

        random_state=42,

        n_jobs=-1

    )

    model.fit(X_train, y_train)

    return model

def train_linear_svm(X_train, y_train):

    print("\nTraining Calibrated Linear SVM...")

    base_model = LinearSVC(
        random_state=42,
        max_iter=5000
    )

    model = CalibratedClassifierCV(
        estimator=base_model,
        cv=5
    )

    model.fit(X_train, y_train)

    return model

def train_xgboost(X_train, y_train):

    print("\nTraining XGBoost...")

    model = XGBClassifier(

        n_estimators=300,

        learning_rate=0.1,

        max_depth=6,

        random_state=42,

        eval_metric="mlogloss"

    )

    model.fit(X_train, y_train)

    return model

def get_models():

    return {

        "Logistic Regression": LogisticRegression(
            random_state=42,
            max_iter=5000
        ),

        "Random Forest": RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            n_jobs=-1
        ),

       "Linear SVM": CalibratedClassifierCV(
            estimator=LinearSVC(
             random_state=42,
             max_iter=5000),
            method="sigmoid",
            cv=5
        ),

        "XGBoost": XGBClassifier(
            n_estimators=300,
            learning_rate=0.1,
            max_depth=6,
            random_state=42,
            eval_metric="mlogloss"
        )

    }

def evaluate_model(model, X_test, y_test):

    predictions = model.predict(X_test)

    probabilities = None

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, predictions)

    precision = precision_score(
        y_test,
        predictions,
        average="weighted"
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted"
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted"
    )

    return accuracy, precision, recall, f1


def compare_models(models, X_train, X_test, y_train, y_test):

    print("\n==============================")
    print("Training Multiple Models")
    print("==============================")

    results = {}

    best_model = None
    best_score = 0

    for name, model in models.items():

        print(f"\nTraining {name}...")

        model.fit(X_train, y_train)

        accuracy, precision, recall, f1 = evaluate_model(
            model,
            X_test,
            y_test
        )

        results[name] = {

            "model": model,

            "accuracy": accuracy,

            "precision": precision,

            "recall": recall,

            "f1": f1

        }

        if f1 > best_score:

            best_score = f1
            best_model = name

    return results, best_model

def print_results(results, best_model):

    print("\n")
    print("=" * 45)
    print("MODEL COMPARISON")
    print("=" * 45)

    for name, values in results.items():

        print(f"\n{name}")

        print(f"Accuracy : {values['accuracy']:.4f}")
        print(f"Precision: {values['precision']:.4f}")
        print(f"Recall    : {values['recall']:.4f}")
        print(f"F1 Score  : {values['f1']:.4f}")

    print("\n" + "=" * 45)

    print(f" Best Model : {best_model}")

    print("=" * 45)


def save_artifacts(model, vectorizer, encoder):

    print("\nSaving Models...")

    joblib.dump(model, MODEL_PATH)

    joblib.dump(vectorizer, TFIDF_PATH)

    joblib.dump(encoder, LABEL_ENCODER_PATH)

    joblib.dump(NUMERIC_FEATURES, FEATURE_COLUMNS_PATH)

    print("Models Saved Successfully!")

def main():

    df = load_dataset()

    print(df["clean_text"].dtype)

    print(df["clean_text"].isnull().sum())

    print(df["clean_text"].head())

    print(type(df["clean_text"].iloc[0]))

    X_text, X_numeric, y, encoder = prepare_data(df)

    X_train_text, X_test_text, X_train_numeric, X_test_numeric, y_train, y_test = train_test_split(
        X_text,
        X_numeric,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    print(df.columns)

    print(df["clean_text"].head())

    print(df["clean_text"].dtype)

    print(df["clean_text"].isnull().sum())

    X_train_tfidf, X_test_tfidf, vectorizer = vectorize_text(
        X_train_text,
        X_test_text
    )

    X_train, X_test = combine_features(
        X_train_tfidf,
        X_test_tfidf,
        X_train_numeric,
        X_test_numeric
    )

    models = get_models()

    results, best_model_name = compare_models(

       models,

       X_train,

       X_test,

       y_train,

       y_test)
    
    best_model = results[best_model_name]["model"]

    print_results(

       results,

       best_model_name)



    save_artifacts(
        best_model,
        vectorizer,
        encoder
    )


if __name__ == "__main__":
    main()