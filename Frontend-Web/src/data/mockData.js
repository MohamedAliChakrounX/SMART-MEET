// Mock Database - Toutes les données centralisées

export const mockData = {
  // Liste des réunions archivées (pour la page Archive Library)
  meetings: [
    {
      id: 1,
      title: 'Weekly Sync: Product Growth & Analytics',
      category: 'PRODUCT DEV',
      date: 'Oct 24, 2023',
      duration: '14:00 (45m)',
      description: 'Key decisions included the shift to a mobile-first onboarding flow and the approval of the Q4 budget. Actions...',
      participants: ['Jane Doe', 'John Smith', 'Sarah Chen'],
      starred: true
    },
    {
      id: 2,
      title: 'Q3 Retrospective: Enterprise Launch Campaign',
      category: 'SALES',
      date: 'Oct 22, 2023',
      duration: '10:30 (60m)',
      description: 'Reviewed the performance of the outbound campaign. Conversion rates increased by 15% following the...',
      participants: ['Alex Rivera', 'Mike Johnson'],
      starred: true
    },
    {
      id: 3,
      title: 'Board Meeting: FY24 Planning & Investor Update',
      category: 'STRATEGY',
      date: 'Oct 19, 2023',
      duration: '09:00 (120m)',
      description: 'High-level roadmap approval. AI integration will be the primary focus for the next 4 quarters. Investor updates...',
      participants: ['Jane Doe', 'Sarah Chen'],
      starred: true
    },
    {
      id: 4,
      title: 'Brand Identity Kickoff',
      category: 'MARKETING',
      date: 'Oct 15, 2023',
      duration: '15:30 (40m)',
      description: 'First pass on the new color palette and typography. Consensus on a "bold and reliable" brand tone. Next steps:...',
      participants: ['Alex Rivera', 'Mike Johnson'],
      starred: false
    }
  ],

  // Détails d'une réunion spécifique (pour les pages de workflow)
  currentMeeting: {
    id: 1,
    title: 'Q4 Strategic Planning & Budget Review',
    date: '2023-10-24',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    location: 'Executive Conference Room 3 (Hybrid)',
    facilitator: 'Jane Doe (Chief Operations Officer)',
    confidential: true
  },

  // Participants
  participants: [
    { id: 1, name: 'Jane Doe', role: 'Product', initials: 'JD', color: '#3B82F6' },
    { id: 2, name: 'John Smith', role: 'Engineering', initials: 'JS', color: '#10B981' },
    { id: 3, name: 'Sarah Connor', role: 'Design', initials: 'SC', color: '#8B5CF6' },
    { id: 4, name: 'Michael Vance', role: 'Marketing', initials: 'MV', color: '#F59E0B', absent: true }
  ],

  // Agenda Highlights
  agendaItems: [
    'Review of Q3 financial performance and variance analysis compared to initial projections.',
    'Proposal for new marketing allocation specifically for APAC expansion phase 1.',
    'Discussion on internal resource reallocation to support product launch in November.'
  ],

  // Key Decisions
  decisions: [
    'The Q4 Marketing budget is approved at a revised cost of $2.4M.',
    'APAC Market entry is delayed until Q1 to allow for data compliance audit.'
  ],

  // Action Items
  actionItems: [
    {
      id: 1,
      task: 'Draft APAC Compliance Plan',
      assignee: 'Sarah Connor',
      dueDate: 'Nov 12, 2023',
      status: 'PENDING',
      description: 'Draft APAC Compliance Plan'
    },
    {
      id: 2,
      task: 'Update Q4 Budget Ledger',
      assignee: 'Jane Doe',
      dueDate: 'Oct 28, 2023',
      status: 'DONE',
      description: 'Update Q4 Budget Ledger'
    }
  ],

  // Transcript segments
  transcriptSegments: [
    {
      id: 1,
      speaker: 'Speaker A',
      speakerColor: '#3B82F6',
      timeStart: '00:00',
      timeEnd: '00:45',
      text: 'Good morning everyone. Thanks for joining our weekly sync. Today we\'re going to cover the Q4 product roadmap and look at some of the feedback we received from the beta users last week.'
    },
    {
      id: 2,
      speaker: 'Speaker B',
      speakerColor: '#10B981',
      timeStart: '18:42',
      timeEnd: '19:15',
      text: 'Thanks, Sarah. I\'ve looked at the analytics and it seems that the new onboarding flow has increased the completion rate by about 15%. However, there\'s still a significant drop-off at the "Connect Calendar" step which we might need to investigate further.'
    },
    {
      id: 3,
      speaker: 'Speaker C',
      speakerColor: '#8B5CF6',
      timeStart: '19:15',
      timeEnd: '20:30',
      text: 'We\'ve actually been interviewing some of those users who dropped off. The common sentiment is that they are worried about privacy permissions. Maybe we can add a small info block explaining exactly what data we access.'
    },
    {
      id: 4,
      speaker: 'Speaker A',
      speakerColor: '#3B82F6',
      timeStart: '20:30',
      timeEnd: '21:05',
      text: 'That sounds like a great idea, Alex. Can you coordinate with the UX team to get a mockup by Friday?'
    }
  ],

  // Summary content
  summary: {
    id: 1,
    title: 'Product Sync: Q3 Roadmap & Design Review',
    modified: '2 mins ago',
    detailLevel: 'medium', // short, medium, detailed
    focusAreas: {
      keyDecisions: true,
      discussions: true,
      actionItems: true
    },
    content: {
      executiveOverview: 'The team convened to finalize the Q3 product roadmap with a specific focus on the new "Meeting Intelligence" feature set. Primary objectives for the quarter include reducing user churn by 15% through enhanced automated reporting and improving API response times for enterprise clients.',
      keyDecisions: [
        'Approved the integration of OpenAI GPT-4o for advanced transcript analysis.',
        'Agreed to delay the "Custom Dashboard Builder" to Q4 to prioritize stability in mobile apps.',
        'Finalized the budget for the upcoming October off-site event in Lisbon.'
      ],
      nextSteps: [
        {
          task: 'Sarah to finalize Figma prototypes',
          due: 'Wednesday, Sept 20',
          completed: true
        },
        {
          task: 'David to update API documentation',
          due: 'End of week',
          completed: true
        }
      ]
    }
  },

  // Export settings
  exportSettings: {
    includeAudioInfo: true,
    includeTimestamps: true,
    includeSpeakerId: false,
    language: 'English (US)',
    storageUsed: 1.2,
    storageTotal: 5,
    storageDays: 30
  },

  // Behavioral Analytics Data
  behavioralAnalytics: {
    meetingInfo: {
      title: 'Q4 Product Strategy Review',
      date: 'October 24, 2023',
      duration: '1h 15m',
      participants: 4
    },
    summaryMetrics: [
      { label: 'ENGAGEMENT', value: '78%', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { label: 'BALANCE', value: '65%', color: 'text-slate-500', bgColor: 'bg-slate-100' },
      { label: 'INTERVENTIONS', value: '103', color: 'text-slate-500', bgColor: 'bg-slate-100' },
      { label: 'INTERRUPTIONS', value: '12', color: 'text-amber-600', bgColor: 'bg-amber-50' },
      { label: 'SILENCE', value: '15%', color: 'text-slate-500', bgColor: 'bg-slate-100' },
      { label: 'AVG TURN', value: '42s', color: 'text-slate-500', bgColor: 'bg-slate-100' }
    ],
    meetingDynamics: {
      text: 'The meeting showed high engagement levels with a clear leader driving the agenda. While interaction was generally balanced, there were moments of high tension that led to increased interruptions.'
    },
    talkTimeData: [
      { name: 'Sarah', value: 46, fill: '#475569' },
      { name: 'David', value: 28, fill: '#64748b' },
      { name: 'Elena', value: 19, fill: '#94a3b8' },
      { name: 'James', value: 8, fill: '#cbd5e1' }
    ],
    radarData: [
      { subject: 'Monopolization', A: 72, B: 45, C: 25, fullMark: 100 },
      { subject: 'Stress', A: 24, B: 18, C: 42, fullMark: 100 },
      { subject: 'Fragmentation', A: 15, B: 32, C: 12, fullMark: 100 },
      { subject: 'Energy', A: 85, B: 65, C: 45, fullMark: 100 },
      { subject: 'Pitch', A: 80, B: 50, C: 30, fullMark: 100 }
    ],
    speakers: [
      {
        id: 'SPK_01', name: 'Sarah Chen', initials: 'SC', initialsBg: 'bg-slate-700',
        role: 'Leader', roleColor: 'bg-emerald-50 text-emerald-700',
        metrics: { talkTime: 46, monopolization: 72, stress: 24, fragmentation: 15, interventions: 42, interruptionsGiven: 3, interruptionsReceived: 0, avgDuration: 48.2 },
        voice: { pitch: 'Expressive', energy: 'Dynamic' },
        tags: [
          { label: 'Dominant', color: 'bg-slate-100 text-slate-700' },
          { label: 'Strategic', color: 'bg-slate-100 text-slate-700' },
          { label: 'Clear', color: 'bg-slate-100 text-slate-700' }
        ],
        radar: [
          { subject: 'Talk', value: 90 }, { subject: 'Stress', value: 30 },
          { subject: 'Frag', value: 20 }, { subject: 'Mono', value: 85 }
        ],
        strengths: ['Keeps discussion focused', 'High energy engagement', 'Clear articulation'],
        areasToWatch: ['May overshadow quieter members', 'Could invite more input'],
        style: { quote: 'Authoritative and structured', description: 'Sarah demonstrates strong leadership traits with high talk time and energy variance. She drives the conversation but allows for interruptions, indicating a collaborative yet authoritative style.' }
      },
      {
        id: 'SPK_02', name: 'David Miller', initials: 'DM', initialsBg: 'bg-slate-600',
        role: 'Participant', roleColor: 'bg-slate-100 text-slate-600',
        metrics: { talkTime: 28, monopolization: 45, stress: 18, fragmentation: 32, interventions: 38, interruptionsGiven: 5, interruptionsReceived: 4, avgDuration: 33.4 },
        voice: { pitch: 'Moderate', energy: 'Engaged' },
        tags: [
          { label: 'Collaborative', color: 'bg-slate-100 text-slate-700' },
          { label: 'Reactive', color: 'bg-slate-100 text-slate-700' },
          { label: 'Supportive', color: 'bg-slate-100 text-slate-700' }
        ],
        radar: [
          { subject: 'Talk', value: 60 }, { subject: 'Stress', value: 20 },
          { subject: 'Frag', value: 70 }, { subject: 'Mono', value: 40 }
        ],
        strengths: ['Good active listening', 'Builds on others ideas', 'Responsive'],
        areasToWatch: ['Frequent interruptions', 'Could elaborate more on key points'],
        style: { quote: 'Conversational and reactive', description: 'David is an active contributor. His higher fragmentation score suggests he often engages in short, back-and-forth exchanges rather than long monologues.' }
      },
      {
        id: 'SPK_03', name: 'Elena Rodriguez', initials: 'ER', initialsBg: 'bg-slate-600',
        role: 'Participant', roleColor: 'bg-slate-100 text-slate-600',
        metrics: { talkTime: 19, monopolization: 25, stress: 42, fragmentation: 12, interventions: 15, interruptionsGiven: 1, interruptionsReceived: 2, avgDuration: 56.4 },
        voice: { pitch: 'Stable', energy: 'Steady' },
        tags: [
          { label: 'Thoughtful', color: 'bg-slate-100 text-slate-700' },
          { label: 'Reserved', color: 'bg-slate-100 text-slate-700' },
          { label: 'Detailed', color: 'bg-slate-100 text-slate-700' }
        ],
        radar: [
          { subject: 'Talk', value: 40 }, { subject: 'Stress', value: 80 },
          { subject: 'Frag', value: 20 }, { subject: 'Mono', value: 30 }
        ],
        strengths: ['Provides depth', 'Careful articulation', 'Stays on topic'],
        areasToWatch: ['Visibly stressed during conflict', 'Low participation frequency'],
        style: { quote: 'Measured and precise', description: 'Elena speaks less frequently but holds the floor for longer durations when she does. Elevated stress metrics might indicate she was presenting complex or contentious topics.' }
      },
      {
        id: 'SPK_04', name: 'James Wilson', initials: 'JW', initialsBg: 'bg-slate-500',
        role: 'Observer', roleColor: 'bg-slate-100 text-slate-500',
        metrics: { talkTime: 8, monopolization: 10, stress: 15, fragmentation: 5, interventions: 8, interruptionsGiven: 0, interruptionsReceived: 1, avgDuration: 42.1 },
        voice: { pitch: 'Monotone', energy: 'Flat' },
        tags: [
          { label: 'Passive', color: 'bg-slate-100 text-slate-700' },
          { label: 'Observant', color: 'bg-slate-100 text-slate-700' },
          { label: 'Calm', color: 'bg-slate-100 text-slate-700' }
        ],
        radar: [
          { subject: 'Talk', value: 20 }, { subject: 'Stress', value: 15 },
          { subject: 'Frag', value: 10 }, { subject: 'Mono', value: 10 }
        ],
        strengths: ['Good listener', 'Non-disruptive', 'Calm presence'],
        areasToWatch: ['Very low engagement', 'Risk of disengagement'],
        style: { quote: 'Passive and minimal', description: 'James had minimal participation, primarily listening. His low monopolization and stress scores suggest a passive role in this specific meeting context.' }
      }
    ],
    metricDefinitions: [
      { title: 'Monopolization', description: 'Measures the tendency of a speaker to hold the floor for extended periods without pausing for others. High scores indicate dominance.' },
      { title: 'Fragmentation', description: 'Indicates the frequency of short turns. High scores suggest a conversational, back-and-forth style rather than monologues.' },
      { title: 'Pitch Variance', description: 'The range of tonal changes in speech. Higher variance often correlates with expressiveness and engagement.' },
      { title: 'Energy Variance', description: 'Fluctuations in volume and intensity. Consistent low energy may indicate disengagement or calm. High variance suggests passion.' }
    ]
  }
};
