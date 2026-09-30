"""
setup_translation_models.py
============================
One-time setup script: downloads and installs the argostranslate language packages
needed for offline Darja/Arabic -> French and Darja/Arabic -> English translation.

Run once:
    python setup_translation_models.py

After this, the TranscriptionService will translate without any internet access.
"""

import sys

def install_packages(pairs):
    try:
        from argostranslate import package, translate
    except ImportError:
        print("argostranslate is not installed.")
        print("   Run: pip install argostranslate")
        sys.exit(1)

    print("[Meeting-AI] Fetching argostranslate package index...")
    package.update_package_index()
    available = package.get_available_packages()

    installed = translate.get_installed_languages()
    installed_pairs = set()
    for lang in installed:
        for t in lang.translations_to:
            installed_pairs.add((lang.code, t.to_lang.code))

    for from_code, to_code in pairs:
        pair_str = f"{from_code} -> {to_code}"
        if (from_code, to_code) in installed_pairs:
            print(f"  [OK] Already installed: {pair_str}")
            continue

        pkg = next(
            (p for p in available if p.from_code == from_code and p.to_code == to_code),
            None
        )
        if pkg is None:
            print(f"  [WARN] No package found for: {pair_str}")
            continue

        print(f"  [DL] Downloading: {pair_str} ({pkg.package_version})...")
        path = pkg.download()
        package.install_from_path(path)
        print(f"  [OK] Installed: {pair_str}")

    print("\n[Meeting-AI] All translation packages ready.")
    print("   The transcription service will now translate Darja/Arabic offline.")


if __name__ == "__main__":
    # Required pairs for this project
    PAIRS = [
        ("ar", "fr"),   # Arabic/Darja -> French
        ("ar", "en"),   # Arabic/Darja -> English
        ("fr", "en"),   # French -> English (bonus)
        ("en", "fr"),   # English -> French (bonus)
    ]
    install_packages(PAIRS)
