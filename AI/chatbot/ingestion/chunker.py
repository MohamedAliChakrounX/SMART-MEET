def chunk_transcript(title: str, transcript: list, turns_per_chunk: int = 5, overlap_turns: int = 1) -> list:
    """
    Groups transcript turns into sliding windows of turns to maintain dialogue context.
    """
    chunks = []
    if not transcript:
        return chunks
        
    num_turns = len(transcript)
    i = 0
    while i < num_turns:
        # Get slice of turns
        turns_slice = transcript[i : i + turns_per_chunk]
        if not turns_slice:
            break
            
        # Format chunk content
        segment_lines = []
        for t in turns_slice:
            speaker = t.get("speaker", "Unknown")
            content = t.get("content", "").strip()
            timestamp = t.get("timestamp")
            time_str = f" [{timestamp}]" if timestamp else ""
            segment_lines.append(f"{speaker}{time_str}: {content}")
            
        content_text = f"Meeting Title: {title}\nTranscript Segment:\n" + "\n".join(segment_lines)
        chunks.append({
            "chunk_type": "transcript",
            "content": content_text
        })
        
        # Advance index by step size (turns_per_chunk - overlap_turns)
        step = turns_per_chunk - overlap_turns
        if step <= 0:
            step = 1
        i += step
        
        # If we have reached or passed the end, and the last chunk was small, break
        if i >= num_turns or len(turns_slice) < turns_per_chunk:
            break
            
    return chunks

def chunk_text_by_paragraphs(title: str, text: str, chunk_type: str, prefix_label: str) -> list:
    """Splits a single block of text into paragraph-sized chunks."""
    chunks = []
    if not text or not text.strip():
        return chunks
        
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    for p in paragraphs:
        content_text = f"Meeting Title: {title}\n{prefix_label}:\n{p}"
        chunks.append({
            "chunk_type": chunk_type,
            "content": content_text
        })
    return chunks

def chunk_list_items(title: str, items: list, chunk_type: str, prefix_label: str) -> list:
    """Creates a distinct chunk for each item in a list (e.g. decisions, action items)."""
    chunks = []
    if not items:
        return chunks
        
    for item in items:
        if not item or not str(item).strip():
            continue
        content_text = f"Meeting Title: {title}\n{prefix_label}: {item.strip()}"
        chunks.append({
            "chunk_type": chunk_type,
            "content": content_text
        })
    return chunks

def chunk_meeting(data: dict) -> list:
    """
    Processes all parts of a meeting payload and returns a list of dictionaries,
    each containing 'chunk_type' and 'content'.
    """
    title = data.get("title", "Untitled Meeting")
    chunks = []
    
    # 1. Transcript chunks
    transcript = data.get("transcript", [])
    chunks.extend(chunk_transcript(title, transcript))
    
    # 2. Summary chunks
    summary = data.get("summary")
    if summary:
        chunks.extend(chunk_text_by_paragraphs(title, summary, "summary", "Summary"))
        
    # 3. Decisions chunks
    decisions = data.get("decisions", [])
    chunks.extend(chunk_list_items(title, decisions, "decision", "Decision"))
    
    # 4. Action items chunks
    action_items = data.get("action_items", [])
    chunks.extend(chunk_list_items(title, action_items, "action_item", "Action Item"))
    
    # 5. Behavior chunks (if provided in payload)
    behavior = data.get("behavior")
    if behavior:
        chunks.extend(chunk_text_by_paragraphs(title, behavior, "behavior", "Behavior Analysis"))
        
    return chunks
