"""
interpretation_service.py
=========================
Génère une interprétation comportementale narrative, différenciée et TRÈS DÉTAILLÉE
des métriques issues de la diarisation (qwen3:4b via Ollama).

Améliorations v2 :
- Scoring automatique d'archétype basé sur les données (pas de hints vagues)
- Blocs narratifs enrichis par dimension acoustique avec langue nuancée
- Index de cohésion/équilibre de groupe calculé algorithmiquement
- Prompt système et utilisateur substantiellement renforcés
- Fallback engine multi-dimensionnel avec profils complets
"""

from __future__ import annotations

import json
import math
import os
import re
from typing import Optional

import requests


# ── Configuration ──────────────────────────────────────────────────────────────

OLLAMA_CHAT_URL      = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
INTERPRETATION_MODEL = os.environ.get("INTERPRETATION_MODEL", "qwen3:4b")
DEFAULT_TEMPERATURE  = 0.72   # créatif mais cohérent

# ── Archétypes avec vecteur de scoring ────────────────────────────────────────
# Chaque archétype est associé à un ensemble de critères mesurables.
# Le scoring est calculé automatiquement depuis les métriques réelles.
ARCHETYPES = [
    "Le Pilote – domine la prise de parole, oriente la direction de la réunion",
    "L'Animateur – facilite les échanges, équilibre les tours de parole",
    "L'Expert Discret – intervient peu mais avec des contributions de haute densité",
    "Le Négociateur – gère les tensions, recherche le consensus",
    "L'Observateur Stratégique – écoute davantage qu'il ne parle, pèse ses mots",
    "Le Communicant Expressif – voix riche, intonations variées, présence vocale forte",
    "Le Pragmatique – interventions courtes, directes, orientées solutions",
    "Le Contributeur Régulier – rythme équilibré, ni dominant ni effacé",
    "Le Facilitateur Silencieux – peu de parole mais fort impact structurant",
    "L'Assertif Vocal – présence sonore marquée, conviction portée par la voix",
]


# ── Scoring d'archétype ────────────────────────────────────────────────────────

def _score_archetypes(m: dict, fair_share: float) -> str:
    """
    Calcule un score pour chaque archétype basé sur les métriques brutes,
    retourne l'archétype le plus probable avec une justification courte.
    """
    pct     = m.get("temps_de_parole_pct", 0)
    intv    = m.get("nombre_interventions", 0)
    dur     = m.get("duree_moyenne_intervention", 0)
    mono    = m.get("monopolisation", 0)
    inter_f = m.get("interruptions_faites", 0)
    inter_s = m.get("interruptions_subies", 0)
    frag    = m.get("fragmentation", 0)
    stress  = m.get("stress_jitter_shimmer", 0)
    pitch_v = m.get("pitch_variance", 0)
    pitch_r = m.get("pitch_range", 0)
    energy_v= m.get("energy_variance", 0)
    energy_p= m.get("energy_presence", 0)
    hnr     = m.get("hnr_score", 0)
    seff    = m.get("speaking_effort", 0)

    scores = {
        "Le Pilote":               (pct / max(fair_share, 1)) * 0.4 + (mono / 100) * 0.4 + (inter_f * 0.05) * 0.2,
        "L'Animateur":             (1 - abs(pct - fair_share) / max(fair_share, 1)) * 0.5 + (1 - frag / 100) * 0.3 + (energy_p / 100) * 0.2,
        "L'Expert Discret":        (1 - pct / 100) * 0.3 + (dur / 60) * 0.4 + (hnr / 100) * 0.2 + (1 - stress / 100) * 0.1,
        "Le Négociateur":          (inter_s / max(inter_f + inter_s + 1, 1)) * 0.4 + (1 - stress / 100) * 0.3 + (hnr / 100) * 0.3,
        "L'Observateur Stratégique":(1 - pct / 100) * 0.5 + (dur / 60) * 0.3 + (1 - mono / 100) * 0.2,
        "Le Communicant Expressif": (pitch_v * 4) * 0.3 + (pitch_r / 20) * 0.3 + (energy_v * 4) * 0.2 + (energy_p / 100) * 0.2,
        "Le Pragmatique":          (1 - dur / 60) * 0.4 + (intv / 30) * 0.3 + (1 - pitch_v * 4) * 0.3,
        "Le Contributeur Régulier":(1 - abs(pct - fair_share) / max(fair_share, 1)) * 0.6 + (1 - mono / 100) * 0.4,
        "Le Facilitateur Silencieux":(1 - pct / 100) * 0.4 + (hnr / 100) * 0.3 + (1 - inter_f * 0.1) * 0.3,
        "L'Assertif Vocal":        (energy_p / 100) * 0.4 + (seff * 20) * 0.3 + (pitch_r / 20) * 0.2 + (inter_f * 0.05) * 0.1,
    }

    best = max(scores, key=scores.get)
    # Map to full archetype string from ARCHETYPES list
    for arch in ARCHETYPES:
        if arch.startswith(best):
            return arch
    return best


# ── Helpers narratifs ──────────────────────────────────────────────────────────

def _rel_label(val: float, avg: float, hi: float = 1.35, lo: float = 0.65) -> str:
    if avg == 0:
        return "non comparative (données insuffisantes)"
    r = val / avg
    if r > 2.0:  return "très nettement supérieur à la moyenne du groupe"
    if r > hi:   return "au-dessus de la moyenne du groupe"
    if r < 0.4:  return "très nettement inférieur à la moyenne du groupe"
    if r < lo:   return "en dessous de la moyenne du groupe"
    return "dans la moyenne du groupe"


def _qualif(v: float, hi: float, lo: float, labels: list) -> str:
    return labels[0] if v > hi else (labels[2] if v < lo else labels[1])


def _talk_time_narrative(pct: float, fair_share: float, intv: int, dur: float) -> str:
    mult = pct / fair_share if fair_share else 1.0
    if mult > 2.0:
        base = "Prise de parole très largement supérieure à la part équitable attendue dans un échange équilibré, traduisant une posture de leadership ou de contrôle de l'agenda."
    elif mult > 1.4:
        base = "Temps de parole supérieur à la norme équitable, positionnant ce participant comme l'un des moteurs de la réunion."
    elif mult > 0.85:
        base = "Répartition du temps de parole proportionnelle à la taille du groupe, signe d'une intégration fluide dans le collectif."
    elif mult > 0.5:
        base = "Présence vocale en retrait par rapport à l'espace disponible, pouvant indiquer une posture d'écoute délibérée ou une difficulté à s'imposer."
    else:
        base = "Participation vocale très limitée, potentiellement le signe d'un rôle d'observateur assumé ou d'un inconfort dans l'environnement de la réunion."

    # Complément sur la densité des interventions
    if intv > 0 and dur > 0:
        if dur > 60:
            density = f" Les interventions sont rares mais très développées (en moyenne {dur:.0f}s), suggérant une préparation ou une réflexion approfondie avant de prendre la parole."
        elif dur > 20:
            density = f" Chaque prise de parole dure environ {dur:.0f}s, un équilibre entre développement des idées et maintien du rythme."
        else:
            density = f" Des prises de parole fréquentes et brèves (≈{dur:.0f}s en moyenne) révèlent un style réactif et dynamique, orienté vers les échanges courts."
        base += density
    return base


def _interruption_narrative(inter_f: int, inter_s: int) -> str:
    total = inter_f + inter_s
    if total == 0:
        return "Aucune interruption enregistrée dans les deux sens. Profil non-conflictuel ou interactions très régulées."
    ratio = inter_f / max(total, 1)
    if ratio > 0.75:
        return (f"Profil nettement interrupteur : coupe la parole {inter_f} fois pour {inter_s} interruption(s) subie(s). "
                "Ce déséquilibre traduit une tendance à contrôler le flux de la conversation, voire à ne pas attendre son tour.")
    elif ratio > 0.55:
        return (f"Légère tendance à initier des coupures ({inter_f} vs {inter_s} subies). "
                "Signe d'une assertivité modérée ou d'une implication active dans les moments chauds.")
    elif ratio < 0.25:
        return (f"Profil principalement interrompu ({inter_s} fois coupé, seulement {inter_f} coupures initiées). "
                "Cela peut indiquer une difficulté à conserver son tour de parole ou une vulnérabilité dans les phases de débat.")
    else:
        return f"Échanges d'interruptions relativement équilibrés ({inter_f} initiées, {inter_s} subies). Dynamique d'interaction réciproque."


def _stress_narrative(stress: float, hnr: float, rel_stress: str) -> str:
    if stress > 75:
        tension = "Niveau de stress vocal très élevé, révélant une tension physiologique ou émotionnelle significative au cours de la réunion."
    elif stress > 55:
        tension = "Stress vocal modéré à élevé, suggérant des moments de pression ou d'inconfort dans les prises de parole."
    elif stress > 35:
        tension = "Tension vocale dans la norme, sans signe évident de surcharge émotionnelle ou de malaise."
    else:
        tension = "Aisance vocale remarquable, indiquant une grande sérénité ou un niveau de confiance élevé dans ce contexte."

    if hnr > 70:
        clarity = " La clarté de voix est excellente (HNR élevé), renforçant la lisibilité et l'autorité perçue des interventions."
    elif hnr > 45:
        clarity = " La qualité vocale est satisfaisante, sans perturbation notable de la clarté du discours."
    else:
        clarity = " La voix présente des altérations de timbre (HNR bas), pouvant affecter la crédibilité perçue ou signaler de la fatigue."

    return tension + clarity + f" (indicateur relatif au groupe : {rel_stress})"


def _prosody_narrative(pitch_v: float, pitch_r: float, pitch_mean: float, energy_p: float, seff: float) -> str:
    # Registre vocal
    if pitch_mean > 230:
        register = "voix à registre aigu, potentiellement perçue comme plus expressive ou anxieuse selon le contexte"
    elif pitch_mean > 155:
        register = "registre vocal médium, équilibré et naturellement neutre pour l'interlocuteur"
    elif pitch_mean > 60:
        register = "registre grave/barytonique, souvent associé à l'autorité, la confiance et la crédibilité"
    else:
        register = "registre vocal non déterminable avec précision"

    # Expressivité prosodique
    if pitch_v > 0.3 and pitch_r > 12:
        expr = "Expressivité prosodique très forte : les variations de hauteur de voix sont amples et variées, conférant un impact rhétorique puissant."
    elif pitch_v > 0.18 or pitch_r > 7:
        expr = "Prosodie vivante avec des modulations perceptibles, rendant le discours agréable à suivre et maintenant l'attention."
    else:
        expr = "Intonation relativement plate et monotone, ce qui peut nuire à l'engagement de l'auditoire sur le long terme."

    # Assertivité / présence
    if energy_p > 70:
        presence = " Présence vocale très assertive : l'énergie projetée est forte, occupant l'espace sonore de manière dominante."
    elif energy_p > 40:
        presence = " Présence vocale normale, ni imposante ni effacée."
    else:
        presence = " Présence vocale discrète : énergie projetée faible, ce participant occupe peu l'espace sonore."

    # Effort d'articulation
    if seff > 0.06:
        articulation = " Articulation très dynamique et vivace, révélant un fort engagement dans le discours."
    elif seff > 0.025:
        articulation = " Rythme d'articulation normal, fluide et compréhensible."
    else:
        articulation = " Parole posée et lente, pouvant indiquer une réflexion en temps réel ou une fatigue vocale."

    return f"Voix à {register}. {expr}{presence}{articulation}"


def _monopoly_narrative(mono: float, frag: float) -> str:
    if mono > 75:
        m = "Monopolisation très élevée : ce participant concentre l'espace de dialogue au détriment des autres."
    elif mono > 50:
        m = "Tendance modérée à monopoliser : prend de la place mais sans annihiler les contributions extérieures."
    elif mono > 30:
        m = "Monopolisation faible, profil respectueux du droit de parole des autres membres."
    else:
        m = "Aucune tendance à monopoliser, interventions concises et bien délimitées."

    if frag > 75:
        f = " Rythme de parole très fragmenté : de nombreuses courtes rafales successives plutôt que des développements linéaires."
    elif frag > 50:
        f = " Structure d'intervention fragmentée avec des pauses ou coupures récurrentes."
    elif frag > 30:
        f = " Fluidité de parole modérée, quelques discontinuités sans impact majeur."
    else:
        f = " Discours fluide et continu, avec peu d'interruptions ou de ruptures dans le flux de parole."
    return m + f


# ── Métriques de groupe ────────────────────────────────────────────────────────

def _compute_group_metrics(ranked: list) -> dict:
    """Calcule des indicateurs de santé collective de la réunion."""
    n = len(ranked)
    if n == 0:
        return {}

    pcts = [m.get("temps_de_parole_pct", 0) for _, m in ranked]
    fair = 100.0 / n

    # Gini coefficient (inégalité de parole)
    mean_pct = sum(pcts) / n
    if mean_pct > 0:
        gini = sum(abs(a - b) for a in pcts for b in pcts) / (2 * n * n * mean_pct)
    else:
        gini = 0.0

    # Balance index [0-100] : 100 = parfaitement équilibré
    balance = max(0.0, 100.0 * (1 - gini))

    # Tension collective (moyenne des stress individuels)
    stresses = [m.get("stress_jitter_shimmer", 0) for _, m in ranked]
    avg_stress = sum(stresses) / n

    # Dominant ratio
    top_pct = pcts[0] if pcts else 0
    dominant_ratio = top_pct / fair if fair > 0 else 1.0

    # Interruption globale
    total_interruptions = sum(m.get("interruptions_faites", 0) for _, m in ranked)

    return {
        "gini": round(gini, 3),
        "balance_index": round(balance, 1),
        "avg_stress": round(avg_stress, 1),
        "dominant_ratio": round(dominant_ratio, 2),
        "total_interruptions": total_interruptions,
        "n": n,
        "fair_share": fair,
    }


def _group_health_narrative(gm: dict) -> str:
    balance = gm.get("balance_index", 50)
    avg_stress = gm.get("avg_stress", 50)
    dominant_ratio = gm.get("dominant_ratio", 1.0)
    total_int = gm.get("total_interruptions", 0)
    n = gm.get("n", 1)

    if balance > 75:
        bal_text = "excellente équité de répartition de la parole"
    elif balance > 50:
        bal_text = "équilibre de parole acceptable avec quelques disparités"
    elif balance > 30:
        bal_text = "déséquilibre notable dans la prise de parole"
    else:
        bal_text = "déséquilibre sévère — quelques voix dominent largement"

    if dominant_ratio > 2.5:
        dom_text = "La présence d'un locuteur ultra-dominant crée une asymétrie de pouvoir significative."
    elif dominant_ratio > 1.6:
        dom_text = "Un locuteur se détache clairement comme figure de proue de la réunion."
    else:
        dom_text = "Aucun locuteur ne domine outrageusement."

    if avg_stress > 60:
        stress_text = "Le niveau de tension vocale collective est élevé, signalant une réunion probablement sous pression."
    elif avg_stress > 35:
        stress_text = "La tension vocale moyenne du groupe reste dans des normes acceptables."
    else:
        stress_text = "Atmosphère vocale détendue, suggestive d'une réunion dans un climat de confiance."

    int_per_person = total_int / max(n, 1)
    if int_per_person > 3:
        int_text = "Les interruptions sont fréquentes, indiquant des échanges vifs et potentiellement compétitifs."
    elif int_per_person > 1:
        int_text = "Quelques interruptions signalent des moments de tension ou d'enthousiasme partagé."
    else:
        int_text = "Les interruptions sont rares, suggérant un respect mutuel des tours de parole."

    return f"Indice d'équilibre du groupe : {balance:.0f}/100 ({bal_text}). {dom_text} {stress_text} {int_text}"


class InterpretationService:
    def __init__(
        self,
        ollama_url:  str   = OLLAMA_CHAT_URL,
        model:       str   = INTERPRETATION_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
    ):
        self.ollama_url  = ollama_url
        self.model       = model
        self.temperature = temperature

    # ── Public API ─────────────────────────────────────────────────────────────

    def interpret(self, analytics_data: dict, transcript_segments: list = None) -> dict:
        if not analytics_data:
            return self._empty_result()
        system_p, user_p = self._build_prompt(analytics_data, transcript_segments or [])
        raw = self._call_ollama(system_p, user_p)
        if not raw:
            return self._fallback_result(analytics_data)
        return self._parse_response(raw, analytics_data)

    # ── Prompt builder ─────────────────────────────────────────────────────────

    def _build_prompt(self, analytics_data: dict, transcript_segments: list = None) -> tuple:
        num_speakers = len(analytics_data)
        fair_share   = 100.0 / num_speakers if num_speakers > 0 else 0

        ranked = sorted(
            analytics_data.items(),
            key=lambda x: x[1].get("temps_de_parole_pct", 0),
            reverse=True
        )

        # Moyennes de groupe
        def avg(key): return sum(m.get(key, 0) for _, m in ranked) / num_speakers if num_speakers > 0 else 0
        avg_pct    = avg("temps_de_parole_pct")
        avg_intv   = avg("nombre_interventions")
        avg_dur    = avg("duree_moyenne_intervention")
        avg_stress = avg("stress_jitter_shimmer")
        avg_hnr    = avg("hnr_score")
        avg_epres  = avg("energy_presence")
        avg_seff   = avg("speaking_effort")
        avg_mono   = avg("monopolisation")

        # Métriques de santé collective
        gm = _compute_group_metrics(ranked)
        group_health = _group_health_narrative(gm)

        # ── Profil textuel détaillé par speaker ───────────────────────────────
        speaker_profiles = {}
        table = ""
        for rank_i, (name, m) in enumerate(ranked, 1):
            pct       = m.get("temps_de_parole_pct", 0)
            intv      = m.get("nombre_interventions", 0)
            dur       = m.get("duree_moyenne_intervention", 0)
            inter_f   = m.get("interruptions_faites", 0)
            inter_s   = m.get("interruptions_subies", 0)
            frag      = m.get("fragmentation", 0)
            stress    = m.get("stress_jitter_shimmer", 0)
            pitch_v   = m.get("pitch_variance", 0)
            pitch_r   = m.get("pitch_range", 0)
            pitch_m   = m.get("pitch_mean", 0)
            energy_v  = m.get("energy_variance", 0)
            energy_p  = m.get("energy_presence", 0)
            mono      = m.get("monopolisation", 0)
            hnr       = m.get("hnr_score", 0)
            seff      = m.get("speaking_effort", 0)

            # Scoring archétype automatique
            arch = _score_archetypes(m, fair_share)

            # Narratifs dimensionnels
            talk_narr  = _talk_time_narrative(pct, fair_share, intv, dur)
            inter_narr = _interruption_narrative(inter_f, inter_s)
            relst      = _rel_label(stress, avg_stress)
            stress_narr= _stress_narrative(stress, hnr, relst)
            prosody_n  = _prosody_narrative(pitch_v, pitch_r, pitch_m, energy_p, seff)
            mono_narr  = _monopoly_narrative(mono, frag)

            speaker_profiles[name] = {
                "rank": rank_i,
                "pct": pct,
                "arch": arch,
                "talk_narr": talk_narr,
                "inter_narr": inter_narr,
                "stress_narr": stress_narr,
                "prosody_n": prosody_n,
                "mono_narr": mono_narr,
            }

            # Compact data block — only key metrics, no verbose narratives
            table += (
                f"\n--- {name} (#{rank_i}) ---\n"
                f"Archétype: {arch}\n"
                f"talk={pct:.1f}% | intv={intv} | dur={dur:.0f}s | mono={mono:.0f} | frag={frag:.0f}\n"
                f"stress={stress:.0f} | hnr={hnr:.0f} | energy={energy_p:.0f} | pitch_v={pitch_v:.3f}\n"
                f"inter_f={inter_f} | inter_s={inter_s} | effort={seff:.4f}\n"
            )

        # ── Contrastes de groupe ───────────────────────────────────────────────
        most_talk    = ranked[0][0]
        least_talk   = ranked[-1][0]
        pct_gap      = ranked[0][1].get("temps_de_parole_pct", 0) - ranked[-1][1].get("temps_de_parole_pct", 0)
        top_interr   = max(ranked, key=lambda x: x[1].get("interruptions_faites", 0))
        most_stress  = max(ranked, key=lambda x: x[1].get("stress_jitter_shimmer", 0))
        least_stress = min(ranked, key=lambda x: x[1].get("stress_jitter_shimmer", 0))
        top_expressive = max(ranked, key=lambda x: x[1].get("pitch_variance", 0))

        contrasts = (
            f"DYNAMIQUE DE GROUPE (pour le champ meeting_dynamics UNIQUEMENT) :\n"
            f"{group_health}\n"
            f"- Locuteur le plus présent vocalement    : {most_talk}\n"
            f"- Locuteur le plus discret               : {least_talk}\n"
            f"- Écart de temps de parole               : {pct_gap:.1f}% entre les deux extrêmes\n"
            f"- Principal interrupteur                 : {top_interr[0]} ({top_interr[1].get('interruptions_faites', 0)} coupure(s))\n"
            f"- Locuteur le plus détendu vocalement    : {least_stress[0]}\n"
            f"- Locuteur le plus stressé vocalement    : {most_stress[0]}\n"
            f"- Locuteur le plus expressif prosodiquement : {top_expressive[0]}\n"
            f"- Part équitable théorique               : {fair_share:.1f}% par personne\n"
            f"- Indice d'équilibre global (Gini)       : {gm.get('balance_index', 0):.0f}/100\n"
        )

        names = [n for n, _ in ranked]
        archetypes_str = "\n".join(f"  - {a}" for a in ARCHETYPES)

        # ── System prompt ─────────────────────────────────────────────────────
        system = (
            "Tu es un expert senior en psychologie organisationnelle, acoustique comportementale et dynamiques de groupe. "
            "Tu produis des rapports d'interprétation comportementale INDIVIDUELS, PROFONDS, NUANCÉS et TRÈS DIFFÉRENCIÉS "
            "sur la base de données acoustiques et comportementales issues de réunions professionnelles.\n\n"

            "RÈGLES ABSOLUES — toute violation invalide le résultat :\n"
            "1. UNICITÉ ABSOLUE : Chaque profil doit avoir un archétype, une tonalité, un angle psychologique et des "
            "   formulations DISTINCTS des autres. Deux profils qui se ressemblent = ÉCHEC critique.\n"
            "2. ISOLATION STRICTE DES NOMS : Dans le profil d'un participant, écris UNIQUEMENT son propre prénom/nom. "
            "   Il t'est ABSOLUMENT INTERDIT d'écrire le nom d'un autre participant dans un profil individuel. "
            "   Pour les comparaisons, utilise EXCLUSIVEMENT des formulations impersonnelles :\n"
            "   ✓ 'contrairement à la majorité du groupe'\n"
            "   ✓ 'là où d'autres membres restent...'\n"
            "   ✓ 'par rapport à la moyenne observée dans ce collectif'\n"
            "   ✗ JAMAIS un autre prénom ou nom.\n"
            "3. PROFONDEUR ANALYTIQUE : Chaque analyse DOIT s'ancrer dans les données spécifiques fournies. "
            "   Bannir ABSOLUMENT les clichés comme 'communique bien', 'peut progresser', 'est très présent'. "
            "   Chaque phrase doit être non-transposable à un autre profil du même groupe. "
            "   Exploite les nuances acoustiques (prosodie, stress, HNR, effort) pour nourrir l'interprétation psychologique.\n"
            "4. LANGAGE RICHE ET VARIÉ : Utilise un vocabulaire précis, des métaphores ciblées, un registre professionnel "
            "   élevé mais accessible. Évite la répétition de structures de phrase.\n"
            "5. PAS DE CHIFFRES BRUTS dans les textes. Traduis les métriques en observations qualitatives.\n"
            "6. RÉPONSE : JSON valide uniquement — sans markdown, sans texte avant ou après."
        )

        # ── Template JSON par speaker ─────────────────────────────────────────
        speaker_template_lines = []
        for n in names:
            p = speaker_profiles[n]
            line = (
                f'    "{n}": {{\n'
                f'      "role_label": "<Archétype calculé automatiquement pour {n} : {p["arch"]}. '
                f'Si tu juges un archétype plus précis, tu peux le substituer, justifie-le dans ton analyse>",\n'
                f'      "profile_summary": "<2 phrases percutantes et UNIQUES qui campent {n} immédiatement. '
                f'Commence par ce qui le/la distingue FONDAMENTALEMENT dans CE groupe précis. '
                f'INTERDIT : nommer un autre participant>",\n'
                f'      "psychological_analysis": "<5 à 7 phrases d\'analyse comportementale PROFONDE et NON-GÉNÉRIQUE. '
                f'Couvre obligatoirement : (1) positionnement et stratégie de prise de parole, '
                f'(2) rapport au conflit/interruption et ce que cela révèle, '
                f'(3) niveau de pression ou d\'aisance ressentis et leur impact observable, '
                f'(4) style d\'influence réelle dans le groupe, '
                f'(5) sous-texte psychologique ou dynamique inconsciente détectée. '
                f'INTERDIT : nommer un autre participant. Chaque phrase doit être spécifique à {n}>",\n'
                f'      "vocal_signature": "<3 à 4 phrases sur la voix de {n} comme empreinte identitaire et outil de pouvoir. '
                f'Analyse : qualité/clarté/tension du timbre, registre et ce qu\'il projette socialement, '
                f'richesse prosodique et impact sur l\'auditoire, effort articulatoire. '
                f'INTERDIT : nommer un autre participant>",\n'
                f'      "strengths": ["<force 1 : très spécifique à {n}, ancrée dans les données>", '
                f'"<force 2>", "<force 3>"],\n'
                f'      "areas_to_watch": ["<axe 1 de vigilance : ancré dans les données de {n}, '
                f'formulé positivement comme levier de développement>", "<axe 2>"],\n'
                f'      "style_quote": "<devise en 1 phrase courte, à la 1ère personne, '
                f'qui capture l\'essence communicative de {n} — doit sonner authentique et unique>",\n'
                f'      "style_description": "<1 phrase dense résumant le style communicatif de {n} '
                f'en combinant registre vocal, tempo, assertivité et positionnement>",\n'
                f'      "recommendation": "<1 paragraphe de conseil CONCRET, PERSONNALISÉ et ACTIONNABLE pour {n}. '
                f'Basé exclusivement sur ses données comportementales spécifiques. '
                f'Inclure : une action immédiate, un objectif de développement et pourquoi cela lui serait bénéfique. '
                f'INTERDIT : nommer un autre participant>"\n'
                f'    }}'
            )
            speaker_template_lines.append(line)

        speakers_json_template = ",\n".join(speaker_template_lines)

        # ── Transcription par speaker ─────────────────────────────────────────
        transcript_by_speaker: dict = {}
        if transcript_segments:
            for seg in transcript_segments:
                spk = seg.get("speaker", "")
                txt = seg.get("text", "").strip()
                if spk and txt:
                    transcript_by_speaker.setdefault(spk, []).append(txt)

        def _fmt_transcript(name: str) -> str:
            lines = transcript_by_speaker.get(name, [])
            if not lines:
                return "  (pas de transcription)"
            excerpt = "\n".join(f'  - "{l}"' for l in lines[:4])
            return excerpt[:600] + "…" if len(excerpt) > 600 else excerpt

        has_transcript = bool(transcript_by_speaker)
        transcript_section = ""
        if has_transcript:
            transcript_section = "TRANSCRIPTION RÉELLE (extraits par participant — utilise-les pour des insights langagiers) :\n"
            for n in names:
                transcript_section += f"\n-- {n} --\n{_fmt_transcript(n)}\n"
            transcript_section += (
                "\nIMPORTANT TRANSCRIPTION : Ces extraits sont les mots réels prononcés dans la réunion. "
                "Repère le vocabulaire, les structures de phrase, les marqueurs d'incertitude ou d'autorité, "
                "les reformulations, les questions posées. Intègre ces observations dans l'analyse psychologique.\n"
            )

        user = (
            f"Voici les données comportementales d'une réunion avec {num_speakers} participant(s).\n\n"
            f"{contrasts}\n\n"
            f"ARCHÉTYPES DISPONIBLES (chaque participant doit recevoir un archétype DIFFERENT des autres) :\n"
            f"{archetypes_str}\n\n"
            f"PROFILS INDIVIDUELS DÉTAILLÉS :\n{table}\n\n"
            + (transcript_section + "\n" if has_transcript else "")
            + f"INSTRUCTIONS FINALES AVANT RÉDACTION :\n"
            f"1. Lis chaque profil comme un dossier confidentiel ISOLÉ.\n"
            f"2. Quand tu rédiges le profil de X, tu n'as accès QU'AU dossier de X.\n"
            f"3. Les noms {', '.join(names)} sont INVISIBLES à l'intérieur de chaque profil individuel.\n"
            f"4. Chaque champ doit apporter une valeur NOUVELLE, non redondante avec les autres champs.\n"
            f"5. Les 'strengths' et 'areas_to_watch' doivent emerging des données, pas être génériques.\n\n"
            f"Retourne UNIQUEMENT ce JSON :\n"
            f'{{\n'
            f'  "meeting_dynamics": "<4 à 6 phrases sur la dynamique de groupe. '
            f'Analyse : équilibre du pouvoir, tension collective, profil d\'interaction, '
            f'climate émotionnel perçu, éventuels points de friction ou de synergie. '
            f'Tu PEUX nommer les participants ici uniquement. '
            f'Commence par l\'indice d\'équilibre et sa signification concrète>",\n'
            f'  "speakers": {{\n'
            f'{speakers_json_template}\n'
            f'  }}\n'
            f'}}'
        )

        return system, user

    # ── Ollama call ────────────────────────────────────────────────────────────

    def _call_ollama(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        payload = {
            "model":  self.model,
            "stream": False,
            "keep_alive": "5m",   # Garder le modèle en VRAM entre les appels
            "options": {
                "temperature": self.temperature,
                "num_ctx":     6144,    # Réduit de 10240 — le prompt compact tient en ~4K tokens
                "num_predict": 2048,    # Réduit de 4096 — le JSON de sortie fait ~1.5K tokens
                "num_gpu":     999,     # Forcer TOUTES les couches du modèle sur le GPU
            },
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
        }
        try:
            print(f"[InterpretationService] Calling {self.model} (GPU-accelerated, ctx=4096, predict=2048) …")
            resp = requests.post(self.ollama_url, json=payload, timeout=180)
            resp.raise_for_status()
            content = resp.json().get("message", {}).get("content", "")
            eval_duration = resp.json().get("eval_duration", 0)
            prompt_eval_duration = resp.json().get("prompt_eval_duration", 0)
            total_ms = (eval_duration + prompt_eval_duration) / 1e6
            print(f"[InterpretationService] Got {len(content)} chars in {total_ms:.0f}ms")
            return content
        except requests.exceptions.ConnectionError:
            print(f"[InterpretationService] Cannot connect to Ollama at {self.ollama_url}")
            return None
        except requests.exceptions.Timeout:
            print("[InterpretationService] Timeout (180s)")
            return None
        except Exception as e:
            print(f"[InterpretationService] Error: {e}")
            return None

    # ── Response parser ────────────────────────────────────────────────────────

    def _parse_response(self, raw: str, analytics_data: dict) -> dict:
        text = raw.strip()
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$",           "", text).strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)
        try:
            result = json.loads(text)
            if "meeting_dynamics" not in result or "speakers" not in result:
                raise ValueError("Structure JSON incomplète")
            names = list(analytics_data.keys())
            result = self._sanitize_name_leaks(result, names)
            return result
        except (json.JSONDecodeError, ValueError) as e:
            print(f"[InterpretationService] JSON parse error: {e}")
            print(f"[InterpretationService] Raw (first 400): {raw[:400]}")
            return self._fallback_result(analytics_data)

    def _sanitize_name_leaks(self, result: dict, names: list) -> dict:
        speakers = result.get("speakers", {})
        leaks = []
        for speaker_name, profile in speakers.items():
            other_names = [n for n in names if n != speaker_name]
            profile_text = json.dumps(profile, ensure_ascii=False)
            found = [n for n in other_names if re.search(rf"\b{re.escape(n)}\b", profile_text)]
            if found:
                leaks.append({"in_profile": speaker_name, "leaked_names": found})
                print(f"[InterpretationService] ⚠ Name leak: {found} found in profile of '{speaker_name}'")
        if leaks:
            result["_name_leak_warnings"] = leaks
        return result

    # ── Fallback engine (multi-dimensionnel) ──────────────────────────────────

    def _empty_result(self) -> dict:
        return {"meeting_dynamics": "Aucune donnée comportementale disponible.", "speakers": {}}

    def _fallback_result(self, analytics_data: dict) -> dict:
        """
        Interprétation règle-métier profonde quand le LLM est indisponible.
        Produit des profils complets et différenciés basés sur les métriques réelles.
        """
        num = len(analytics_data)
        ranked = sorted(analytics_data.items(),
                        key=lambda x: x[1].get("temps_de_parole_pct", 0), reverse=True)
        fair = 100.0 / num if num else 0
        gm   = _compute_group_metrics(ranked)

        out = {}
        used_archetypes = set()

        for i, (name, m) in enumerate(ranked):
            pct     = m.get("temps_de_parole_pct", 0)
            dur     = m.get("duree_moyenne_intervention", 0)
            inter_f = m.get("interruptions_faites", 0)
            inter_s = m.get("interruptions_subies", 0)
            stress  = m.get("stress_jitter_shimmer", 0)
            hnr     = m.get("hnr_score", 0)
            pitch_v = m.get("pitch_variance", 0)
            pitch_m = m.get("pitch_mean", 0)
            energy_p= m.get("energy_presence", 0)
            mono    = m.get("monopolisation", 0)
            frag    = m.get("fragmentation", 0)
            seff    = m.get("speaking_effort", 0)

            # Archétype calculé
            arch_full = _score_archetypes(m, fair)
            arch_short = arch_full.split("–")[0].strip()
            # Éviter les doublons dans le fallback
            if arch_short in used_archetypes:
                fallbacks = ["Le Contributeur Régulier", "L'Observateur Stratégique",
                             "L'Expert Discret", "Le Facilitateur Silencieux", "Le Pragmatique"]                
                for fb in fallbacks:
                    if fb not in used_archetypes:
                        arch_short = fb
                        break
            used_archetypes.add(arch_short)

            # Narratifs complets
            talk_n  = _talk_time_narrative(pct, fair, m.get("nombre_interventions", 0), dur)
            inter_n = _interruption_narrative(inter_f, inter_s)
            stress_n= _stress_narrative(stress, hnr, "non comparative (mode dégradé)")
            prosody = _prosody_narrative(pitch_v, m.get("pitch_range", 0), pitch_m, energy_p, seff)
            mono_n  = _monopoly_narrative(mono, frag)

            # Psycho summary
            presence_adj = "très présent et structurant" if pct > fair * 1.4 else (
                "discret et mesuré" if pct < fair * 0.6 else "équilibré dans ses prises de parole")
            stress_adj = "sous une tension vocale perceptible" if stress > 60 else (
                "avec une aisance vocale notable" if stress < 35 else "dans un registre de tension modérée")
            assertive = "posture assez directive" if inter_f > max(inter_s, 1) * 1.5 else (
                "tendance à céder le tour de parole" if inter_s > max(inter_f, 1) * 1.5 else
                "rapport équilibré au droit de parole")

            # Forces basées sur les données
            strengths = []

            # Axes de vigilance
            areas = []

            # Style quote
            if i == 0:
                quote = "Les directions s'imposent à qui sait les exprimer clairement." if mono > 50 else "Je prends l'espace qu'il faut, ni plus ni moins."
            elif pct < fair * 0.6:
                quote = "Je parle peu, mais chaque mot compte." if dur > 20 else "L'essentiel se dit en peu de mots."
            else:
                quote = "Ma contribution, c'est d'être là au bon moment." if stress < 40 else "Je m'exprime avec conviction, même sous pression."

            out[name] = {
                "role_label": arch_short,
                "profile_summary": (
                    f"{name} se positionne comme un acteur {presence_adj} au sein du groupe. "
                    f"{talk_n[:120].rstrip('.')}."
                ),
                "psychological_analysis": (
                    f"{name} évolue dans cette réunion {stress_adj}. "
                    f"{inter_n} "
                    f"Sa stratégie de prise de parole révèle une {assertive}. "
                    f"{mono_n[:100].rstrip('.')}."
                ),
                "vocal_signature": prosody,
                "strengths": strengths,
                "areas_to_watch": areas,
                "style_quote": quote,
                "style_description": (
                    f"Style {('expressif et modulé' if pitch_v > 0.2 else ('posé et direct' if dur < 15 else 'réfléchi et développé'))}, "
                    f"présence {'assertive' if energy_p > 55 else 'discrète'}."
                ),
                "recommendation": (
                    f"Pour {name}, l'axe de développement prioritaire est "
                    + (
                        "d'apprendre à créer davantage d'espace dans le dialogue : poser des questions ouvertes après chaque prise de parole, "
                        "pratiquer le silence actif et observer les signaux non-verbaux des autres membres pour ajuster son niveau d'occupation de l'espace."
                        if mono > 65 else (
                            "de s'affirmer plus proactivement en identifiant deux ou trois moments stratégiques par réunion "
                            "pour prendre la parole avec conviction, en préparant ses arguments à l'avance pour compenser la pression du contexte."
                            if pct < fair * 0.6 else
                            "de consolider son positionnement naturellement équilibré en développant davantage chaque intervention, "
                            "en assumant plus de risques rhétoriques (métaphores, questions rhétoriques) pour marquer les esprits."
                        )
                    )
                )
            }

        # Dynamique de groupe (mode dégradé)
        dominant = ranked[0][0]
        quiet    = ranked[-1][0] if len(ranked) > 1 else None
        group_health = _group_health_narrative(gm)
        dyn = (
            f"{group_health} "
            f"{dominant} occupe une position de référence vocale dans ce groupe"
            + (f", tandis que {quiet} adopte une posture nettement plus en retrait" if quiet and quiet != dominant else "")
            + "."
        )
        return {"meeting_dynamics": dyn, "speakers": out}