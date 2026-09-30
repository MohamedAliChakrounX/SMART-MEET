import json
import re
import requests
from config import OLLAMA_HOST, OLLAMA_TIMEOUT, MODEL_DASHBOARD

def generate_chart_spec(dataset: list, user_prompt: str) -> dict:
    """
    Translates an execution dataset and original visual prompt into a
    valid Chart.js JSON structure using local qwen2.5:7b.
    Recovers gracefully and returns None if parsing fails.
    """
    if not dataset:
        return None
        
    system_prompt = (
        "You are an expert data visualization designer. Your task is to translate a raw quantitative dataset into a valid Chart.js JSON configuration. A visual chart is highly relevant for this data.\n\n"
        "Requirements:\n"
        "1. Return ONLY a valid JSON object matching the Chart.js configuration structure.\n"
        "2. The JSON object MUST contain three root-level keys: 'type' (string), 'data' (object), and 'options' (object).\n"
        "3. Select the most appropriate Chart.js 'type' based on the nature of the data:\n"
        "   - 'bar': comparisons between categories.\n"
        "   - 'line': temporal evolution, trends, and time-series data.\n"
        "   - 'pie' or 'doughnut': distribution, proportions, or shares of a whole.\n"
        "   - 'radar': multi-criteria comparisons across categories.\n"
        "   - 'polarArea': distribution of categories with radial differences.\n"
        "   - 'scatter': correlations between two independent numerical variables.\n"
        "   - 'bubble': correlations between two numerical variables, with bubble size as the third variable.\n"
        "   - 'mixed': combining multiple metrics in a single chart.\n"
        "4. Ensure the 'data' key contains 'labels' (array of strings) and 'datasets' (array of objects containing 'label' and 'data' (numbers)).\n"
        "5. Use beautiful varied background colors for datasets (especially for pie/doughnut/bar/polarArea charts) to make it look premium:\n"
        "   - For Pie/Doughnut/PolarArea/Bar charts, provide an array of background colors in the dataset matching the number of data items (e.g. ['rgba(99, 102, 241, 0.75)', 'rgba(168, 85, 247, 0.75)', 'rgba(236, 72, 153, 0.75)', 'rgba(20, 184, 166, 0.75)', 'rgba(245, 158, 11, 0.75)', 'rgba(59, 130, 246, 0.75)']).\n"
        "   - For Line/Radar charts, provide a solid/semi-transparent background and border colors.\n"
        "6. Set 'responsive' to true and 'maintainAspectRatio' to false in options.\n"
        "7. DO NOT write any markdown blocks (like ```json), do not write any surrounding text, explanations, or code comments. Return only the raw JSON string.\n"
    )
    
    user_content = (
        f"User Prompt: {user_prompt}\n\n"
        f"Dataset:\n{json.dumps(dataset, indent=2, default=str)}"
    )
    
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL_DASHBOARD,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        content = response.json()["message"]["content"].strip()
        
        # DEBUG: write raw LLM output to a file so we can inspect it
        with open("dashboard_debug.txt", "w", encoding="utf-8") as f:
            f.write(content)
            
        # Clean any accidental markdown code blocks
        if "```" in content:
            match = re.search(r"```(?:json)?\s*(.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
            if match:
                content = match.group(1).strip()
                
        # Robust parsing of JSON: extract everything from first '{' to last '}'
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            content = content[start_idx:end_idx+1]
            
        chart_spec = json.loads(content)
        
        # Check if the LLM deemed it not relevant
        if isinstance(chart_spec, dict) and chart_spec.get("relevant") is False:
            return None
            
        # Validate that basic Chart.js fields are present
        if isinstance(chart_spec, dict) and "type" in chart_spec and "data" in chart_spec:
            return chart_spec
        # Fallback if wrapped in a key
        if isinstance(chart_spec, dict):
            for key in chart_spec.keys():
                if isinstance(chart_spec[key], dict) and "type" in chart_spec[key] and "data" in chart_spec[key]:
                    return chart_spec[key]
                
        return None
    except Exception as e:
        print(f"[Dashboard] Resilience fallback triggered. Failed to generate/parse Chart.js spec: {e}")
        return None

def generate_chart_spec_from_text(text_content: str, user_prompt: str) -> dict:
    """
    Translates an unstructured text summary (e.g., from RAG) into a valid Chart.js JSON structure.
    Used as a fallback when the SQL agent fails but the user requested a dashboard.
    """
    if not text_content:
        return None
        
    system_prompt = (
        "You are an expert data visualization designer. Your task is to read unstructured text summarizing data, extract the quantitative data, and translate it into a valid Chart.js JSON configuration. A visual chart is highly relevant for this data.\n\n"
        "Requirements:\n"
        "1. Return ONLY a valid JSON object matching the Chart.js configuration structure.\n"
        "2. The JSON object MUST contain three root-level keys: 'type' (string), 'data' (object), and 'options' (object).\n"
        "3. Select the most appropriate Chart.js 'type' based on the nature of the data:\n"
        "   - 'bar': comparisons between categories.\n"
        "   - 'line': temporal evolution, trends, and time-series data.\n"
        "   - 'pie' or 'doughnut': distribution, proportions, or shares of a whole.\n"
        "   - 'radar': multi-criteria comparisons across categories.\n"
        "   - 'polarArea': distribution of categories with radial differences.\n"
        "   - 'scatter': correlations between two independent numerical variables.\n"
        "   - 'bubble': correlations between two numerical variables, with bubble size as the third variable.\n"
        "   - 'mixed': combining multiple metrics in a single chart.\n"
        "4. Ensure the 'data' key contains 'labels' (array of strings) and 'datasets' (array of objects containing 'label' and 'data' (numbers, strip % signs or units, convert comma decimals to period decimals, and convert to floats/ints)).\n"
        "5. Use beautiful varied background colors for datasets (especially for pie/doughnut/bar/polarArea charts) to make it look premium:\n"
        "   - For Pie/Doughnut/PolarArea/Bar charts, provide an array of background colors in the dataset matching the number of data items (e.g. ['rgba(99, 102, 241, 0.75)', 'rgba(168, 85, 247, 0.75)', 'rgba(236, 72, 153, 0.75)', 'rgba(20, 184, 166, 0.75)', 'rgba(245, 158, 11, 0.75)', 'rgba(59, 130, 246, 0.75)']).\n"
        "   - For Line/Radar charts, provide a solid/semi-transparent background and border colors.\n"
        "6. Set 'responsive' to true and 'maintainAspectRatio' to false in options.\n"
        "7. DO NOT write any markdown blocks (like ```json), do not write any surrounding text, explanations, or code comments. Return only the raw JSON string.\n"
    )
    
    user_content = (
        f"User Prompt: {user_prompt}\n\n"
        f"Text Summary Containing Data:\n{text_content}"
    )
    
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL_DASHBOARD,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        content = response.json()["message"]["content"].strip()
        
        # Clean any accidental markdown code blocks
        if "```" in content:
            match = re.search(r"```(?:json)?\s*(.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
            if match:
                content = match.group(1).strip()
                
        # Robust parsing of JSON
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            content = content[start_idx:end_idx+1]
            
        chart_spec = json.loads(content)
        
        # Check if the LLM deemed it not relevant
        if isinstance(chart_spec, dict) and chart_spec.get("relevant") is False:
            return None
            
        # Validate that basic Chart.js fields are present
        if isinstance(chart_spec, dict) and "type" in chart_spec and "data" in chart_spec:
            return chart_spec
        if isinstance(chart_spec, dict):
            for key in chart_spec.keys():
                if isinstance(chart_spec[key], dict) and "type" in chart_spec[key] and "data" in chart_spec[key]:
                    return chart_spec[key]
                
        return None
    except Exception as e:
        print(f"[Dashboard] Resilience fallback for text-to-chart failed: {e}")
        return None
