"""
Configuration pour l'analyse comportementale et l'extraction de features.
"""

# Configuration OpenSMILE
OPENSMILE_CONFIG = {
    'feature_set': 'eGeMAPSv02',
    'feature_level': 'LowLevelDescriptors'
}

# Features acoustiques à extraire par catégorie (eGeMAPSv02 LLDs)
ACOUSTIC_FEATURES = {
    'pitch': [
        'F0semitoneFrom27.5Hz_sma3nz',
    ],
    'energy': [
        'Loudness_sma3',
    ],
    'spectral': [
        'spectralFlux_sma3',
        'mfcc1_sma3',
        'mfcc2_sma3',
        'mfcc3_sma3',
        'mfcc4_sma3',
    ],
    'voice_quality': [
        'jitterLocal_sma3nz',
        'shimmerLocaldB_sma3nz',
        'HNRdBACF_sma3nz',
    ]
}

# Configuration de sortie par défaut
OUTPUT_CONFIG = {
    'save_intermediate': False,
    'include_raw_features': False,
    'json_indent': 2
}
