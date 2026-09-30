export const PERMISSION_MAP = {
    'canUploadMeeting': 'meeting.upload',
    'canViewTeamTranscription': 'team.transcript.read',
    'canViewTeamPV': 'team.pv.read',
    'canViewTeamBehaviorAnalytics': 'team.analytics.self',
    'canViewTeamOthersBehavior': 'team.analytics.others',
    'canViewDeptTranscription': 'dept.transcript.read',
    'canViewDeptPV': 'dept.pv.read',
    'canViewDeptBehaviorAnalytics': 'dept.analytics.self',
    'canViewDeptOthersBehavior': 'dept.analytics.others',
} as const;

export type FrontendPermission = keyof typeof PERMISSION_MAP;
export type BackendPermission = typeof PERMISSION_MAP[FrontendPermission];

// Inverse map for convenience when loading from backend
export const BACKEND_TO_FRONTEND_MAP = Object.entries(PERMISSION_MAP).reduce((acc, [front, back]) => {
    acc[back] = front as FrontendPermission;
    return acc;
}, {} as Record<string, FrontendPermission>);
