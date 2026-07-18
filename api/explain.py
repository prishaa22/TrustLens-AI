def generate_explanation(features, prediction):

    reasons = []

    if prediction == "Fake Review":

        if features["rating_sentiment_difference"] > 0.6:
            reasons.append("Rating does not match the review sentiment.")

        if features["promotional_word_count"] >= 2:
            reasons.append("Contains excessive promotional language.")

        if features["generic_phrase_count"] >= 2:
            reasons.append("Contains repetitive marketing phrases.")

        if features["exclamation_count"] >= 3:
            reasons.append("Uses an unusually high number of exclamation marks.")

        if features["all_caps_word_count"] >= 2:
            reasons.append("Contains multiple ALL CAPS words.")

        if features["emoji_count"] >= 3:
            reasons.append("Contains excessive emojis.")

        if features["url_count"] > 0:
            reasons.append("Contains external links.")

        if features["extreme_sentiment"] == 1:
            reasons.append("Uses extremely emotional language.")

        if features["word_count"] < 5:
            reasons.append("Review is unusually short.")

        if len(reasons) == 0:
            reasons.append("Several linguistic patterns resemble fake reviews.")

    else:

        # Each claim is now actually checked against the features instead of
        # being hardcoded boilerplate. If a feature contradicts the "genuine"
        # label, we say so plainly instead of asserting the opposite.

        if features["rating_sentiment_difference"] <= 0.3:
            reasons.append("Rating is consistent with the review sentiment.")
        else:
            reasons.append("Rating and sentiment show some mismatch.")

        if features["promotional_word_count"] == 0:
            reasons.append("No suspicious promotional language detected.")
        else:
            reasons.append("Some promotional language is present.")

        if features["all_caps_word_count"] == 0 and features["exclamation_count"] < 3:
            reasons.append("Natural writing style detected.")
        else:
            reasons.append("Some stylistic red flags are present (caps/exclamations).")

        if features["word_count"] > 8:
            reasons.append("Review contains a reasonable level of detail.")
        else:
            reasons.append("Review is relatively short on detail.")

    return reasons