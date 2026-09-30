with open('TranscriptionView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new)
        changes.append('  OK: ' + label)
    else:
        changes.append('  MISS: ' + label)

# Footer stats: "mots" -> words
rep(">mots</p>", ">{t('transcription.words')}</p>", "mots label")
# We need to add the key to translations later, for now use a simple English word
# Actually let's just replace with a generic approach

# Footer stats: "dur\u00e9e" 
rep("e`}>dur\u00e9e</p>", "e`}>{t('transcription.duration')}</p>", "duree label")

# Footer stats: "intervenant" 
rep(
    ">intervenant{uniqueSpeakers.length > 1 ? 's' : ''}</p>",
    ">{t('transcription.intervenants')}</p>",
    "intervenants footer"
)

# detected count line
rep(
    ">{uniqueSpeakers.length} {t('transcription.detected')}{uniqueSpeakers.length > 1 ? 's' : ''}</p>",
    ">{uniqueSpeakers.length} {t('transcription.detected')}</p>",
    "detected count cleanup"
)

# "Par intervenant" button
rep(">Par intervenant\n", ">{t('transcription.perSpeaker')}\n", "Par intervenant v1")
rep(
    "                                    Par intervenant\n",
    "                                    {t('transcription.perSpeaker')}\n",
    "Par intervenant v2"
)

# "Analyse approfondie" button
rep(
    "                                Analyse approfondie\n",
    "                                {t('transcription.deepAnalysis')}\n",
    "Analyse approfondie"
)

# "Participation par intervenant" 
rep(
    ">Participation par intervenant</p>",
    ">{t('transcription.participationPerSpeaker')}</p>",
    "Participation par intervenant"
)

# "Mots" in per-speaker stats
rep(">Mots</span>", ">{t('transcription.words')}</span>", "Mots per-speaker")

# "Dur\u00e9e" in per-speaker stats
rep(">Dur\u00e9e</span>", ">{t('transcription.duration')}</span>", "Duree per-speaker")

# "Supprimer" button
rep("> Supprimer\n", "> {t('common.delete')}\n", "Supprimer button")

# "Cancel" in edit mode
rep(">Cancel</button>", ">{t('common.cancel')}</button>", "Cancel edit")

# "Save Changes" in edit mode
rep(">Save Changes</button>", ">{t('common.save')}</button>", "Save Changes edit")

# "No transcript available yet."
rep(
    "                            No transcript available yet.\n",
    "                            {t('transcription.noTranscript')}\n",
    "No transcript available"
)

# "Transcribing Meeting" loader title
rep(
    "                                        Transcribing Meeting{dots}\n",
    "                                        {t('transcription.transcribingMeeting')}{dots}\n",
    "Transcribing Meeting"
)

# "Cancel Transcription"
rep(
    "                                            Cancel Transcription\n",
    "                                            {t('transcription.cancelTranscription')}\n",
    "Cancel Transcription"
)

# "Processing Failed"
rep(">Processing Failed</h2>", ">{t('transcription.processingFailed')}</h2>", "Processing Failed")

# Queued waiting initial state
rep(
    "useState('Queued \u2014 waiting for processing...')",
    "useState('')",
    "initial queued state - will be set by t() in useEffect"
)

print('Changes:')
for c in changes:
    print(c)

with open('TranscriptionView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone.')
