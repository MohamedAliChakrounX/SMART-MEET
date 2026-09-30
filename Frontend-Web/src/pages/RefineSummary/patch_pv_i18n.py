with open('RefineSummaryView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

def rep(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new)
        changes.append('  OK: ' + label)
    else:
        changes.append('  MISS: ' + label)

# Supprimer - exact match from file (8 spaces less indent)
rep(
    "                                                            <Trash2 size={12} /> Supprimer\n                                                        </button>",
    "                                                            <Trash2 size={12} /> {t('common.delete')}\n                                                        </button>",
    "action Supprimer"
)

# Valider - exact match from file (4 spaces less indent)
rep(
    "                                    <CheckCircle2 size={14} /> Valider\n                                </button>",
    "                                    <CheckCircle2 size={14} /> {t('pv.validate')}\n                                </button>",
    "Valider button"
)

print('Changes:')
for c in changes:
    print(c)

with open('RefineSummaryView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone.')
