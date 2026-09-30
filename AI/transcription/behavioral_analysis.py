"""
Module d'analyse comportementale.
Calcule les 10 mesures fiables a partir des features acoustiques et de diarisation.
"""

import numpy as np
from typing import Dict, List


def safe_normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalise une valeur entre 0 et 100."""
    if max_val == min_val:
        return 50.0
    normalized = ((value - min_val) / (max_val - min_val)) * 100
    return float(np.clip(normalized, 0, 100))


class BehavioralAnalyzer:
    """
    Analyse comportementale simplifiee : 10 mesures fiables.
    """
    
    def __init__(self):
        pass
    
    def analyze_speaker(self,
                       speaker_stats: Dict,
                       acoustic_features: Dict,
                       interruptions: Dict,
                       total_duration: float,
                       segments: List[Dict],
                       all_stats: Dict) -> Dict:
        """
        Analyse d'un locuteur : 10 mesures fiables.
        """
        num_speakers = len(all_stats)
        
        # --- 5 mesures conversationnelles (diarisation) ---
        speaking_time_pct = round(speaker_stats.get('speaking_time_percentage', 0.0), 2)
        num_interventions = speaker_stats.get('num_interventions', 0)
        interruptions_made = interruptions.get('interruptions_made', 0)
        interruptions_received = interruptions.get('interruptions_received', 0)
        avg_duration = round(speaker_stats.get('avg_intervention_duration', 0.0), 2)
        
        # --- 2 mesures temporelles (diarisation) ---
        monopolization = self._calculate_monopolization(speaking_time_pct, num_speakers)
        fragmentation = self._calculate_fragmentation(segments, speaker_stats.get('total_speaking_time', 0.0))
        
        # --- 3 mesures acoustiques (OpenSMILE par speaker) ---
        pitch_variance = self._get_pitch_variance(acoustic_features)
        energy_variance = self._get_energy_variance(acoustic_features)
        stress_score = self._calculate_stress(acoustic_features)

        # --- 5 nouvelles mesures acoustiques approfondies ---
        hnr_score         = self._calculate_hnr_score(acoustic_features)
        pitch_mean        = self._get_pitch_mean(acoustic_features)
        pitch_range       = self._get_pitch_range(acoustic_features)
        energy_presence   = self._calculate_energy_presence(acoustic_features)
        speaking_effort   = self._get_speaking_effort(acoustic_features)

        return {
            'mesures': {
                # Conversationnelles
                'temps_de_parole_pct': speaking_time_pct,
                'nombre_interventions': num_interventions,
                'interruptions_faites': interruptions_made,
                'interruptions_subies': interruptions_received,
                'duree_moyenne_intervention': avg_duration,
                # Temporelles
                'monopolisation': round(monopolization, 2),
                'fragmentation': round(fragmentation, 2),
                # Acoustiques classiques
                'pitch_variance': round(pitch_variance, 4),
                'energy_variance': round(energy_variance, 4),
                'stress_jitter_shimmer': round(stress_score, 2),
                # Nouvelles mesures acoustiques approfondies
                'hnr_score': round(hnr_score, 2),          # 0-100 : clarté/santé vocale
                'pitch_mean': round(pitch_mean, 2),         # Hz moyen (grave-aigu)
                'pitch_range': round(pitch_range, 2),       # semitones : amplitude prosodique
                'energy_presence': round(energy_presence, 2),  # 0-100 : intensité de présence
                'speaking_effort': round(speaking_effort, 4),  # taux d'articulation
            }
        }
    
    def _calculate_monopolization(self, speaking_pct: float, num_speakers: int) -> float:
        """
        Monopolisation (0-100).
        Ecart au temps de parole equitable.
        
        Ex: 8 speakers -> fair_share = 12.5%
        Si speaker parle 60% -> deviation = 47.5 -> monopolisation elevee
        Si speaker parle 6.9% -> deviation = 5.6 -> monopolisation faible
        """
        if num_speakers <= 1:
            return 0.0
        
        fair_share = 100.0 / num_speakers
        deviation = abs(speaking_pct - fair_share)
        max_deviation = 100 - fair_share
        
        return safe_normalize(deviation, 0, max_deviation)
    
    def _calculate_fragmentation(self, segments: List, total_speaking_time: float) -> float:
        """
        Fragmentation (0-100).
        Nombre d'interventions par minute de parole.
        
        Eleve = nombreuses courtes interventions (parole decoupee).
        Faible = interventions longues et continues.
        """
        if total_speaking_time == 0 or len(segments) == 0:
            return 0.0
        
        interventions_per_min = (len(segments) / total_speaking_time) * 60
        
        # Normaliser (0-30 interventions/min)
        return safe_normalize(interventions_per_min, 0, 30)
    
    def _get_pitch_variance(self, acoustic_features: Dict) -> float:
        """
        Pitch variance brute (coefficient de variation du pitch).
        """
        derived = acoustic_features.get('derived', {})
        return derived.get('pitch_variability', 0.0)
    
    def _get_energy_variance(self, acoustic_features: Dict) -> float:
        """
        Energy variance brute (coefficient de variation de l'energie).
        """
        derived = acoustic_features.get('derived', {})
        return derived.get('energy_variability', 0.0)
    
    def _calculate_stress(self, acoustic_features: Dict) -> float:
        """
        Stress vocal (0-100) base sur jitter + shimmer.
        """
        derived = acoustic_features.get('derived', {})
        jitter = derived.get('jitter_mean', 0.0)
        shimmer = derived.get('shimmer_mean', 0.0)
        
        # Normaliser jitter (0.001 = pas de stress, 0.1 = stress max)
        jitter_score = safe_normalize(jitter, 0.001, 0.1)
        
        # Normaliser shimmer (0.1 = pas de stress, 2.0 = stress max)
        shimmer_score = safe_normalize(shimmer, 0.1, 2.0)
        
        # Stress = moyenne ponderee (Jitter plus discriminant)
        stress = (jitter_score * 0.6 + shimmer_score * 0.4)
        
        return stress
    
    def _calculate_hnr_score(self, acoustic_features: Dict) -> float:
        """
        Clarté / santé vocale (0-100) à partir du HNR.
        HNR (Harmonics-to-Noise Ratio) en dB :
          < 5 dB  → voix très bruitée/tendue  → score bas
          5-15 dB → voix normale              → score moyen
          > 15 dB → voix claire/saine/posée   → score élevé
        """
        derived = acoustic_features.get('derived', {})
        hnr = derived.get('hnr_mean', 0.0)
        # Normaliser entre 0 dB (min réaliste) et 30 dB (max réaliste)
        return safe_normalize(hnr, 0.0, 30.0)

    def _get_pitch_mean(self, acoustic_features: Dict) -> float:
        """
        Hauteur vocale moyenne en Hz.
        Valeurs typiques : homme ≈ 85-180 Hz / femme ≈ 165-255 Hz
        Retourne 0.0 si non disponible.
        """
        derived = acoustic_features.get('derived', {})
        return derived.get('pitch_mean', 0.0)

    def _get_pitch_range(self, acoustic_features: Dict) -> float:
        """
        Amplitude prosodique (pitch_range en semitons).
        Élevée → orateur très modulé/expressif.
        Faible  → ton plat, peu d'inflexions.
        """
        derived = acoustic_features.get('derived', {})
        return derived.get('pitch_range', 0.0)

    def _calculate_energy_presence(self, acoustic_features: Dict) -> float:
        """
        Intensité de présence vocale (0-100) à partir de l'énergie (loudness) moyenne.
        Élevée → locuteur assertif, voix portante.
        Faible  → présence discrète.
        """
        derived = acoustic_features.get('derived', {})
        energy = derived.get('energy_mean', 0.0)
        # Normaliser entre 0.0 et 1.5 (Loudness LLD typique)
        return safe_normalize(energy, 0.0, 1.5)

    def _get_speaking_effort(self, acoustic_features: Dict) -> float:
        """
        Effort d'articulation (taux de changement d'énergie).
        Élevé → parole vivace, bien articulée.
        Faible → parole posée, monocorde.
        """
        derived = acoustic_features.get('derived', {})
        return derived.get('speaking_effort', 0.0)

    def generate_summary(self, speaker_analysis: Dict) -> str:
        """
        Resume textuel concis pour la console.
        """
        m = speaker_analysis['mesures']
        
        summary = f"""
  Temps de parole: {m['temps_de_parole_pct']}%
  Interventions: {m['nombre_interventions']}
  Interruptions faites/subies: {m['interruptions_faites']}/{m['interruptions_subies']}
  Duree moyenne: {m['duree_moyenne_intervention']:.1f}s
  Monopolisation: {m['monopolisation']:.1f}/100
  Fragmentation: {m['fragmentation']:.1f}/100
  Pitch variance: {m['pitch_variance']:.4f}
  Energy variance: {m['energy_variance']:.4f}
  Stress (jitter+shimmer): {m['stress_jitter_shimmer']:.1f}/100
  HNR (clarté vocale): {m.get('hnr_score', 0):.1f}/100
  Pitch moyen: {m.get('pitch_mean', 0):.1f} Hz
  Pitch range: {m.get('pitch_range', 0):.2f} semitons
  Énergie/Présence: {m.get('energy_presence', 0):.1f}/100
  Effort articulatoire: {m.get('speaking_effort', 0):.4f}
        """.strip()
        
        return summary
