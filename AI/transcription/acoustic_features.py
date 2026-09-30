"""
Module d'extraction de features acoustiques avec OpenSMILE.
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import opensmile
import soundfile as sf
from pathlib import Path

from .behavioral_config import OPENSMILE_CONFIG, ACOUSTIC_FEATURES


class AcousticFeatureExtractor:
    """
    Classe pour extraire les features acoustiques avec OpenSMILE.
    """
    
    def __init__(self):
        """Initialise l'extracteur OpenSMILE."""
        self.smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.LowLevelDescriptors,
        )
        print("[OK] Extracteur OpenSMILE initialisé (eGeMAPSv02)")
    
    def extract_from_file(self, audio_path: str, start: float = None, 
                          end: float = None) -> pd.DataFrame:
        """
        Extrait les features d'un fichier audio ou d'un segment.
        
        Args:
            audio_path: Chemin vers le fichier audio
            start: Début du segment (secondes)
            end: Fin du segment (secondes)
            
        Returns:
            DataFrame avec les features extraites
        """
        if start is not None and end is not None:
            # Extraire le segment
            segment_path = self._extract_segment(audio_path, start, end)
            features = self.smile.process_file(segment_path)
            # Nettoyer le fichier temporaire
            if os.path.exists(segment_path):
                try:
                    os.remove(segment_path)
                except OSError:
                    pass
        else:
            features = self.smile.process_file(audio_path)
        
        return features
    
    def _extract_segment(self, audio_path: str, start: float, end: float) -> str:
        """
        Extrait un segment audio et le sauvegarde temporairement.
        Supporte MP3, WAV, FLAC, OGG via soundfile et audioread.
        
        Args:
            audio_path: Chemin vers le fichier audio
            start: Début (secondes)
            end: Fin (secondes)
            
        Returns:
            Chemin vers le fichier temporaire WAV
        """
        import tempfile
        
        try:
            # Essayer avec soundfile (WAV, FLAC, OGG)
            audio_data, sample_rate = sf.read(audio_path)
        except Exception:
            # Fallback pour MP3 via audioread
            try:
                import audioread
                
                with audioread.audio_open(audio_path) as f:
                    sample_rate = f.samplerate
                    channels = f.channels
                    
                    # Lire tout l'audio
                    audio_bytes = b''.join(f)
                    audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                    
                    # Convert stereo to mono
                    if channels > 1:
                        audio_data = audio_data.reshape(-1, channels)
                        audio_data = np.mean(audio_data, axis=1)
            except ImportError:
                raise RuntimeError("Pour lire les fichiers MP3, installez: pip install audioread")
            except Exception as e:
                raise RuntimeError(f"Impossible de lire {audio_path}: {e}")
        
        # Convertir stereo vers mono si nécessaire
        if audio_data.ndim > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Calculer les indices de début et fin
        start_sample = int(start * sample_rate)
        end_sample = int(end * sample_rate)
        
        # Extraire le segment
        segment = audio_data[start_sample:end_sample]
        
        # Créer un fichier temporaire WAV
        temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
        os.close(temp_fd)
        sf.write(temp_path, segment, sample_rate)
        
        return temp_path
    
    def extract_speaker_features(self, audio_path: str, segments: List[Dict]) -> Dict:
        """
        Extrait les features acoustiques pour chaque locuteur.
        
        Args:
            audio_path: Chemin vers le fichier audio (temporaire WAV)
            segments: Liste de dictionnaires de segments {"speaker": "Speaker A", "start": 0.0, "end": 1.5, ...}
            
        Returns:
            Dictionnaire {speaker: features_aggregated}
        """
        print("[FEATURES] Extraction des features acoustiques par locuteur...")
        
        speaker_features = {}
        
        # Charger l'audio une seule fois en mémoire (optimisation majeure des performances)
        print(f"  [INFO] Chargement du fichier audio {audio_path} en mémoire...")
        try:
            audio_data, sample_rate = sf.read(audio_path)
            # Normaliser en mono si nécessaire
            if audio_data.ndim > 1:
                audio_data = np.mean(audio_data, axis=1)
        except Exception as e:
            print(f"  [ERREUR] Impossible de lire {audio_path}: {e}")
            return speaker_features

        # Grouper les segments par locuteur
        segments_by_speaker = {}
        for segment in segments:
            speaker = segment["speaker"]
            if speaker not in segments_by_speaker:
                segments_by_speaker[speaker] = []
            segments_by_speaker[speaker].append(segment)
        
        # Extraire les features pour chaque locuteur
        # OPTIMISATION CLÉ : concaténer TOUS les segments audio du locuteur en un seul tableau,
        # puis appeler process_signal UNE SEULE FOIS par locuteur (au lieu de N fois par segment).
        for speaker, speaker_segments in segments_by_speaker.items():
            print(f"  [ANALYSE] Traitement de {speaker} ({len(speaker_segments)} segments → 1 appel OpenSMILE)...")
            
            chunks = []
            for segment in speaker_segments:
                try:
                    start_sample = int(segment["start"] * sample_rate)
                    end_sample   = int(segment["end"]   * sample_rate)
                    if end_sample <= start_sample:
                        continue
                    chunks.append(audio_data[start_sample:end_sample])
                except Exception as e:
                    print(f"    [ATTENTION] Découpe segment {segment['start']}-{segment['end']}: {e}")
                    continue

            if not chunks:
                continue

            # Un seul appel OpenSMILE pour tous les segments du locuteur
            try:
                combined_audio = np.concatenate(chunks)
                features = self.smile.process_signal(combined_audio, sample_rate)
                aggregated = self._aggregate_features(features)
                speaker_features[speaker] = aggregated
            except Exception as e:
                print(f"    [ATTENTION] OpenSMILE a échoué pour {speaker}: {e}")
                continue
        
        print(f"[OK] Features extraites pour {len(speaker_features)} locuteurs")
        
        return speaker_features
    
    def _aggregate_features(self, features_df: pd.DataFrame) -> Dict:
        """
        Agrège les features sur plusieurs frames.
        
        Args:
            features_df: DataFrame avec les features
            
        Returns:
            Dictionnaire avec les features agrégées
        """
        aggregated = {}
        
        # Extraire les features spécifiques
        for feature_category, feature_names in ACOUSTIC_FEATURES.items():
            aggregated[feature_category] = {}
            
            for feature_name in feature_names:
                if feature_name in features_df.columns:
                    values = features_df[feature_name].values
                    
                    # Calculer des statistiques
                    aggregated[feature_category][f'{feature_name}_mean'] = float(np.mean(values))
                    aggregated[feature_category][f'{feature_name}_std'] = float(np.std(values))
                    aggregated[feature_category][f'{feature_name}_min'] = float(np.min(values))
                    aggregated[feature_category][f'{feature_name}_max'] = float(np.max(values))
        
        # Ajouter des features dérivées
        aggregated['derived'] = self._compute_derived_features(features_df)
        
        return aggregated
    
    def _compute_derived_features(self, features_df: pd.DataFrame) -> Dict:
        """
        Calcule des features derivees additionnelles.
        
        Args:
            features_df: DataFrame avec les features
            
        Returns:
            Dictionnaire de features derivees
        """
        derived = {}
        
        # Variabilite de pitch (indicateur de prosodie)
        # LLD column names: F0semitoneFrom27.5Hz_sma3nz
        pitch_col = None
        for col in features_df.columns:
            if 'f0semitone' in col.lower():
                pitch_col = col
                break
        
        if pitch_col is not None:
            pitch_values = features_df[pitch_col].replace([np.inf, -np.inf], np.nan).dropna()
            # Filter out zero values (unvoiced frames)
            pitch_values = pitch_values[pitch_values > 0]
            if len(pitch_values) > 5:  # Au moins 5 valeurs valides
                pitch_mean = np.mean(pitch_values)
                pitch_std = np.std(pitch_values)
                pitch_min = np.min(pitch_values)
                pitch_max = np.max(pitch_values)
                
                derived['pitch_mean'] = float(pitch_mean)
                derived['pitch_std'] = float(pitch_std)
                derived['pitch_range'] = float(pitch_max - pitch_min)
                derived['pitch_variability'] = float(pitch_std / (pitch_mean + 1e-6))
            else:
                derived['pitch_mean'] = 0.0
                derived['pitch_std'] = 0.0
                derived['pitch_range'] = 0.0
                derived['pitch_variability'] = 0.0
        else:
            derived['pitch_mean'] = 0.0
            derived['pitch_std'] = 0.0
            derived['pitch_range'] = 0.0
            derived['pitch_variability'] = 0.0
        
        # Variabilite d'energie (indicateur d'intensite emotionnelle)
        # LLD column names: Loudness_sma3
        energy_col = None
        for col in features_df.columns:
            if 'loudness' in col.lower():
                energy_col = col
                break
        
        if energy_col is not None:
            energy_values = features_df[energy_col].replace([np.inf, -np.inf], np.nan).dropna()
            if len(energy_values) > 0:
                derived['energy_mean'] = float(np.mean(energy_values))
                derived['energy_std'] = float(np.std(energy_values))
                derived['energy_variability'] = float(np.std(energy_values))
            else:
                derived['energy_mean'] = 0.0
                derived['energy_std'] = 0.0
                derived['energy_variability'] = 0.0
        else:
            derived['energy_mean'] = 0.0
            derived['energy_std'] = 0.0
            derived['energy_variability'] = 0.0
        
        # Speaking rate approximation (via variations d'energie)
        if energy_col is not None:
            energy = features_df[energy_col].replace([np.inf, -np.inf], np.nan).dropna().values
            if len(energy) > 1:
                energy_diff = np.abs(np.diff(energy))
                derived['energy_change_rate'] = float(np.mean(energy_diff))
            else:
                derived['energy_change_rate'] = 0.0
        else:
            derived['energy_change_rate'] = 0.0
        
        # Jitter (instabilite de frequence - indicateur de stress)
        jitter_col = None
        for col in features_df.columns:
            if 'jitter' in col.lower():
                jitter_col = col
                break
        
        if jitter_col is not None:
            jitter_values = features_df[jitter_col].replace([np.inf, -np.inf], np.nan).dropna()
            if len(jitter_values) > 0:
                derived['jitter_mean'] = float(np.mean(jitter_values))
            else:
                derived['jitter_mean'] = 0.0
        else:
            derived['jitter_mean'] = 0.0
        
        # Shimmer (instabilite d'amplitude - indicateur de stress)
        shimmer_col = None
        for col in features_df.columns:
            if 'shimmer' in col.lower():
                shimmer_col = col
                break
        
        if shimmer_col is not None:
            shimmer_values = features_df[shimmer_col].replace([np.inf, -np.inf], np.nan).dropna()
            if len(shimmer_values) > 0:
                derived['shimmer_mean'] = float(np.mean(shimmer_values))
            else:
                derived['shimmer_mean'] = 0.0
        else:
            derived['shimmer_mean'] = 0.0

        # HNR — Harmonics-to-Noise Ratio (qualité / clarté vocale)
        # Valeurs typiques : < 5 dB = voix très bruitée/tendue ; > 15 dB = voix claire/saine
        hnr_col = None
        for col in features_df.columns:
            if 'hnr' in col.lower() or 'harmonics' in col.lower():
                hnr_col = col
                break
        if hnr_col is not None:
            hnr_values = features_df[hnr_col].replace([np.inf, -np.inf], np.nan).dropna()
            if len(hnr_values) > 0:
                derived['hnr_mean'] = float(np.mean(hnr_values))
            else:
                derived['hnr_mean'] = 0.0
        else:
            derived['hnr_mean'] = 0.0

        # Speaking effort — taux de changement d'énergie (vivacité d'articulation)
        # Déjà calculé sous energy_change_rate ; on crée un alias explicite
        derived['speaking_effort'] = derived.get('energy_change_rate', 0.0)

        return derived
    
    def normalize_features(self, speaker_features: Dict) -> Dict:
        """
        Normalise les features entre 0 et 1 pour tous les locuteurs.
        
        Args:
            speaker_features: Dictionnaire {speaker: features}
            
        Returns:
            Dictionnaire avec features normalisées
        """
        # Collecter toutes les valeurs pour chaque feature
        all_values = {}
        
        for speaker, features in speaker_features.items():
            for category, cat_features in features.items():
                if category not in all_values:
                    all_values[category] = {}
                
                for feature_name, value in cat_features.items():
                    if feature_name not in all_values[category]:
                        all_values[category][feature_name] = []
                    all_values[category][feature_name].append(value)
        
        # Calculer min et max pour chaque feature
        min_max = {}
        for category, cat_features in all_values.items():
            min_max[category] = {}
            for feature_name, values in cat_features.items():
                min_max[category][feature_name] = {
                    'min': np.min(values),
                    'max': np.max(values)
                }
        
        # Normaliser
        normalized = {}
        for speaker, features in speaker_features.items():
            normalized[speaker] = {}
            
            for category, cat_features in features.items():
                normalized[speaker][category] = {}
                
                for feature_name, value in cat_features.items():
                    min_val = min_max[category][feature_name]['min']
                    max_val = min_max[category][feature_name]['max']
                    
                    if max_val - min_val > 0:
                        norm_value = (value - min_val) / (max_val - min_val)
                    else:
                        norm_value = 0.5
                    
                    normalized[speaker][category][feature_name] = float(norm_value)
        
        return normalized
