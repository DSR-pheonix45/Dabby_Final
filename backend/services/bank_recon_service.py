"""
Bank statement auto-reconciliation.

Matches bank-statement lines against ledger transactions by amount (within a small
tolerance) and date proximity, with a light description-similarity tiebreak.
Pure functions — no DB.
"""
from datetime import date, datetime


def _to_date(d):
    if isinstance(d, (date, datetime)):
        return d.date() if isinstance(d, datetime) else d
    s = str(d or "")[:10]
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def _amt(x):
    try:
        return round(abs(float(x or 0)), 2)
    except Exception:
        return 0.0


def _tokens(s):
    return set(w for w in str(s or "").lower().replace(",", " ").split() if len(w) > 2)


def _similarity(a, b):
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def match_statement(bank_lines: list, ledger_txns: list, date_window: int = 4, amount_tol: float = 1.0) -> dict:
    """
    bank_lines: [{date, amount(signed) OR debit/credit, description}]
    ledger_txns: [{id, date, amount, description}]
    Returns matched pairs + the unmatched on each side, with a confidence score.
    """
    # Normalize bank lines to (date, abs_amount, description)
    norm_bank = []
    for i, b in enumerate(bank_lines or []):
        if b.get("amount") is not None and b.get("amount") != "":
            amt = _amt(b.get("amount"))
        else:
            amt = _amt(b.get("debit")) or _amt(b.get("credit"))
        norm_bank.append({"idx": i, "date": _to_date(b.get("date")), "amount": amt,
                          "description": b.get("description", ""), "raw": b})

    ledger = [{"id": t.get("id"), "date": _to_date(t.get("date")), "amount": _amt(t.get("amount")),
               "description": t.get("description", "")} for t in (ledger_txns or [])]
    used_ledger = set()
    matched, unmatched_bank = [], []

    for bl in norm_bank:
        best, best_score = None, -1.0
        for lt in ledger:
            if lt["id"] in used_ledger:
                continue
            if abs(lt["amount"] - bl["amount"]) > amount_tol:
                continue
            if bl["date"] and lt["date"]:
                days = abs((bl["date"] - lt["date"]).days)
                if days > date_window:
                    continue
            else:
                days = date_window
            # score: closer date + description overlap
            score = (1 - days / (date_window + 1)) * 0.6 + _similarity(bl["description"], lt["description"]) * 0.4
            if score > best_score:
                best, best_score = lt, score
        if best:
            used_ledger.add(best["id"])
            matched.append({
                "bank": bl["raw"], "ledger_id": best["id"],
                "amount": bl["amount"], "confidence": round(best_score, 2),
            })
        else:
            unmatched_bank.append(bl["raw"])

    unmatched_ledger = [t for t in ledger_txns or [] if t.get("id") not in used_ledger]
    total = len(norm_bank) or 1
    return {
        "matched": matched,
        "unmatched_bank": unmatched_bank,
        "unmatched_ledger": unmatched_ledger,
        "match_rate": round(len(matched) / total * 100, 1),
        "summary": {"bank_lines": len(norm_bank), "matched": len(matched),
                    "unmatched_bank": len(unmatched_bank), "unmatched_ledger": len(unmatched_ledger)},
    }
