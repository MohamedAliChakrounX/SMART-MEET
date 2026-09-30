with open('BehavioralAnalyticsView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new)
        changes.append('  OK: ' + label)
    else:
        changes.append('  MISS: ' + label)

# 1. Add useI18n import
rep(
    "import { useMeeting } from '../../context/MeetingContext';",
    "import { useMeeting } from '../../context/MeetingContext';\nimport { useI18n } from '../../i18n/useI18n';",
    "useI18n import"
)

# 2. Add t hook inside component
rep(
    "    } = useMeeting();\n",
    "    } = useMeeting();\n    const { t } = useI18n();\n",
    "add t hook"
)

# 3. Loading state
rep(
    ">Analyzing behavioral dynamics...</p>",
    ">{t('analytics.analyzing')}</p>",
    "analyzing loading"
)

# 4. Not ready states
rep(
    ">Analytics Not Ready</h2>",
    ">{t('analytics.notReady')}</h2>",
    "not ready title"
)
rep(
    ">Behavioral analytics have not been generated for this meeting yet, or it is still processing.</p>",
    ">{t('analytics.notReadyDesc')}</p>",
    "not ready desc"
)
rep(
    ">Refresh</button>",
    ">{t('analytics.refresh')}</button>",
    "refresh button"
)

# 5. Header
rep(
    ">Behavioral Analytics</span>",
    ">{t('analytics.title')}</span>",
    "header title"
)
rep(
    "> Participants</span>",
    "> {t('pv.participants')}</span>",
    "participants label"
)

# 6. Meeting Summary section
rep(
    ">Meeting Summary</h2>",
    ">{t('analytics.meetingSummary')}</h2>",
    "meeting summary"
)
rep(
    ">High-level insights and dynamics</span>",
    ">{t('analytics.highLevelInsights')}</span>",
    "high level insights"
)

# 7. Meeting Dynamics
rep(
    ">MEETING DYNAMICS</h3>",
    ">{t('analytics.meetingDynamics')}</h3>",
    "meeting dynamics"
)
rep(
    "> AI Interpretation",
    "> {t('analytics.aiInterpretation')}",
    "AI interpretation badge"
)
rep(
    ">Building global view... estimated time: ~30s</span>",
    ">{t('analytics.buildingGlobalView')}</span>",
    "building global view"
)

# 8. Comparative Analysis section
rep(
    ">Comparative Analysis</h2>",
    ">{t('analytics.comparativeAnalysis')}</h2>",
    "comparative analysis"
)
rep(
    ">Visual comparison of all participants</span>",
    ">{t('analytics.visualComparison')}</span>",
    "visual comparison"
)
rep(
    ">Talk Time Distribution</h3>",
    ">{t('analytics.talkTimeDistribution')}</h3>",
    "talk time distribution"
)
rep(
    ">Behavioral Profile Comparison</h3>",
    ">{t('analytics.behavioralProfileComparison')}</h3>",
    "behavioral profile comparison"
)

# 9. Speaker Profiles section
rep(
    ">Speaker Profiles</h2>",
    ">{t('analytics.speakerProfiles')}</h2>",
    "speaker profiles"
)
rep(
    ">Detailed behavioral breakdown per person</span>",
    ">{t('analytics.detailedBreakdown')}</span>",
    "detailed breakdown"
)

# 10. Speaker card labels
rep("> TALK TIME", "> {t('analytics.talkTime')}", "talk time label")
rep("> MONOPOLIZATION", "> {t('analytics.monopolization')}", "monopolization label")
rep("> STRESS", "> {t('analytics.stress')}", "stress label")
rep("> FRAG.", "> {t('analytics.fragmentation')}", "frag label")
rep(">Interventions</span>", ">{t('analytics.interventions')}</span>", "interventions")
rep(">Interruptions</span>", ">{t('analytics.interruptions')}</span>", "interruptions")
rep(">Avg Duration</span>", ">{t('analytics.avgDuration')}</span>", "avg duration")
rep(">PROFILE SHAPE</div>", ">{t('analytics.profileShape')}</div>", "profile shape")
rep("> STRENGTHS", "> {t('analytics.strengths')}", "strengths")
rep("> AREAS TO WATCH", "> {t('analytics.areasToWatch')}", "areas to watch")
rep(">AI PROFILE</span>", ">{t('analytics.aiProfile')}</span>", "ai profile")
rep(">COMMUNICATION STYLE</span>", ">{t('analytics.communicationStyle')}</span>", "communication style")
rep(">Vocal Signature</span>", ">{t('analytics.vocalSignature')}</span>", "vocal signature")
rep(">AI RECOMMENDATION</span>", ">{t('analytics.aiRecommendation')}</span>", "ai recommendation")

# 11. Generating AI Profile loading text
rep(
    '"Generating AI Profile..."',
    't("analytics.analyzing")',
    "generating AI profile"
)

print('Changes:')
for c in changes:
    print(c)

with open('BehavioralAnalyticsView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone.')
