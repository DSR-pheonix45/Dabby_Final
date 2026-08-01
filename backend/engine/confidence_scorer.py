from typing import Dict, Any

class ConfidenceScorer:
    """
    Weighted Confidence Scoring Engine:
    Calculates final confidence score (0.0 to 1.0) using multi-factor weights:
    S = w_type * S_type + w_name * S_name + w_parent * S_parent + w_industry * S_industry
    """

    W_TYPE = 0.35
    W_NAME = 0.35
    W_PARENT = 0.15
    W_INDUSTRY = 0.15

    def calculate_score(
        self,
        rule_score: float = 0.0,
        dict_matched: bool = False,
        type_matched: bool = False,
        parent_matched: bool = False,
        industry_matched: bool = False
    ) -> float:
        if rule_score > 0.90:
            return rule_score

        s_type = 0.95 if type_matched else 0.50
        s_name = 0.95 if dict_matched else 0.60
        s_parent = 0.90 if parent_matched else 0.50
        s_industry = 0.95 if industry_matched else 0.50

        score = (self.W_TYPE * s_type) + (self.W_NAME * s_name) + (self.W_PARENT * s_parent) + (self.W_INDUSTRY * s_industry)
        return round(min(score, 0.99), 2)

    def get_action_category(self, confidence_score: float) -> str:
        if confidence_score >= 0.95:
            return "auto_accept" # Auto Accept >= 95%
        elif confidence_score >= 0.80:
            return "ai_review" # AI Review 80-94%
        else:
            return "manual_review" # Manual Review < 80%

confidence_scorer = ConfidenceScorer()
