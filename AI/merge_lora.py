import torch
import os
import shutil
from pathlib import Path
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from peft import PeftModel

def main():
    base_dir = Path("models/whisper-base")
    lora_dir = Path("models/whisper-darija-lora")
    merged_dir = Path("models/whisper-darija-merged")
    
    if not base_dir.exists() or not lora_dir.exists():
        print("Missing base or lora directories. Run download_model.py")
        return

    print("Loading base model...")
    base_model = WhisperForConditionalGeneration.from_pretrained(
        str(base_dir),
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
        local_files_only=True,
    )

    print("Applying LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, str(lora_dir))

    print("Merging weights (this removes the Peft wrapper)...")
    model = model.merge_and_unload()

    print(f"Saving standalone model to {merged_dir}...")
    os.makedirs(merged_dir, exist_ok=True)
    model.save_pretrained(str(merged_dir))
    
    print("Copying processor files...")
    processor = WhisperProcessor.from_pretrained(
        str(base_dir),
        language="Arabic",
        task="transcribe",
        local_files_only=True,
    )
    processor.save_pretrained(str(merged_dir))
    
    print("Merge complete! You can now use the model directly.")

if __name__ == "__main__":
    main()
