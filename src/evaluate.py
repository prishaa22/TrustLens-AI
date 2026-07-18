"""
=========================================
TrustLens AI
Model Evaluation Module
=========================================

Standalone evaluation of the currently SAVED model (models/best_model.pkl)
against a held-out test split of the feature dataset.

This is distinct from the evaluation baked into src/train_model.py, which
only compares candidate models against each other during training. This
script re-evaluates whatever model is actually saved/deployed right now,
any time you want a fresh report - e.g. after a misclassification bug
report - without retraining anything.

Usage:
    python -m src.evaluate
"""

import numpy as np
import pandas as pd
import joblib

from pathlib import Path
from scipy.sparse import hstack

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

from src.config import (
    FEATURE_DATA_PATH,
    MODEL_PATH,
    TFIDF_PATH,
    LABEL_ENCODER_PATH,
    FEATURE_COLUMNS_PATH,
    RANDOM_STATE
)


# ==========================================
# Load Saved Artifacts
# ==========================================

def load_artifacts():

    print("Loading saved model artifacts...")

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(TFIDF_PATH)
    encoder = joblib.load(LABEL_ENCODER_PATH)
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

    print("Artifacts loaded.\n")

    return model, vectorizer, encoder, feature_columns


# ==========================================
# Rebuild the Held-Out Test Split
# ==========================================

def load_test_split(feature_columns, encoder):
    """
    Rebuilds the exact same train/test split used in src/train_model.py
    (same test_size, random_state, and stratify), so this evaluates the
    model only on data it never saw during training - not the full
    dataset, which would give an overly optimistic score.
    """

    print("Loading feature dataset...")

    df = pd.read_csv(FEATURE_DATA_PATH)

    y = encoder.transform(df["label"])
    X_text = df["clean_text"].fillna("").astype(str)
    X_numeric = df[feature_columns].fillna(0)

    (
        X_train_text, X_test_text,
        X_train_numeric, X_test_numeric,
        y_train, y_test
    ) = train_test_split(
        X_text,
        X_numeric,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y
    )

    # Keep the original raw review text next to the test split so
    # misclassified rows can actually be read below, not just indexed.
    test_indices = X_test_text.index
    if "text_" in df.columns:
        review_texts = df.loc[test_indices, "text_"]
    else:
        review_texts = X_test_text

    return X_test_text, X_test_numeric, y_test, review_texts


def build_test_matrix(vectorizer, X_test_text, X_test_numeric):

    text_vectors = vectorizer.transform(X_test_text)

    return hstack([text_vectors, X_test_numeric])


# ==========================================
# Metrics
# ==========================================

def print_metrics(y_test, predictions, encoder):

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, average="weighted")
    recall = recall_score(y_test, predictions, average="weighted")
    f1 = f1_score(y_test, predictions, average="weighted")

    print("=" * 50)
    print("HELD-OUT TEST SET METRICS")
    print("=" * 50)
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\n" + "=" * 50)
    print("PER-CLASS REPORT")
    print("=" * 50)
    print(classification_report(
        y_test,
        predictions,
        target_names=encoder.classes_
    ))

    return accuracy, precision, recall, f1


def print_confusion_matrix(y_test, predictions, encoder):

    matrix = confusion_matrix(y_test, predictions)
    labels = encoder.classes_

    print("=" * 50)
    print("CONFUSION MATRIX")
    print("=" * 50)

    header = "".ljust(14) + "".join(f"Pred {l}".rjust(14) for l in labels)
    print(header)

    for true_label, row in zip(labels, matrix):
        row_str = "".join(str(v).rjust(14) for v in row)
        print(f"True {true_label}".ljust(14) + row_str)

    return matrix


def save_confusion_matrix_plot(matrix, labels, output_path="models/confusion_matrix.png"):
    """
    Optional visual export. Skipped gracefully if matplotlib/seaborn
    aren't installed - the text report above is the source of truth,
    this is just a nicer artifact for a README or presentation.
    """

    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("\n(matplotlib/seaborn not installed - skipping confusion matrix image)")
        return

    plt.figure(figsize=(5, 4))
    sns.heatmap(
        matrix,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels
    )
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("TrustLens AI - Confusion Matrix")
    plt.tight_layout()

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path)

    print(f"\nConfusion matrix image saved to {output_path}")


def show_worst_misclassifications(y_test, predictions, probabilities, review_texts, encoder, n=10):
    """
    Surfaces the model's most CONFIDENTLY wrong predictions - cases
    where it predicted the wrong label with high confidence, not just
    any misclassification. These are the most useful rows to inspect
    when chasing a systematic bug, like the earlier hype-only-review
    misclassification.
    """

    if probabilities is None:
        print("\n(model has no predict_proba - skipping confidence-ranked error list)")
        return

    confidence = probabilities.max(axis=1)
    is_wrong = predictions != y_test

    wrong_idx = np.where(is_wrong)[0]

    if len(wrong_idx) == 0:
        print("\nNo misclassifications on the test set.")
        return

    ranked = sorted(wrong_idx, key=lambda i: confidence[i], reverse=True)[:n]

    print("\n" + "=" * 50)
    print(f"TOP {min(n, len(ranked))} MOST CONFIDENT MISCLASSIFICATIONS")
    print("=" * 50)

    review_list = review_texts.tolist() if hasattr(review_texts, "tolist") else list(review_texts)

    for rank, i in enumerate(ranked, start=1):

        true_label = encoder.classes_[y_test[i]]
        pred_label = encoder.classes_[predictions[i]]

        text = str(review_list[i])
        preview = text[:100] + ("..." if len(text) > 100 else "")

        print(
            f"\n#{rank} - confidence {confidence[i] * 100:.1f}% - "
            f"predicted '{pred_label}', actually '{true_label}'"
        )
        print(f'   "{preview}"')


# ==========================================
# Entry Point
# ==========================================

def main():

    model, vectorizer, encoder, feature_columns = load_artifacts()

    X_test_text, X_test_numeric, y_test, review_texts = load_test_split(
        feature_columns, encoder
    )

    X_test = build_test_matrix(vectorizer, X_test_text, X_test_numeric)

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test) if hasattr(model, "predict_proba") else None

    print_metrics(y_test, predictions, encoder)

    matrix = print_confusion_matrix(y_test, predictions, encoder)

    save_confusion_matrix_plot(matrix, encoder.classes_)

    show_worst_misclassifications(
        y_test, predictions, probabilities, review_texts, encoder
    )


if __name__ == "__main__":
    main()