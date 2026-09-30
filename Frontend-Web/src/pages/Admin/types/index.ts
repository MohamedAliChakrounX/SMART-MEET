export interface Department {
  id: string
  name: string
  description: string
}

export interface Team {
  id: string
  name: string
  departmentId: string
  description: string
}

export interface Project {
  id: string
  name: string
  description: string
  teamIds: string[]
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
  teamId: string | null
  projectIds: string[]
  isActive: boolean
  permissions: string[]
}

export interface UserPermissions {
  userId: string
  canUploadMeeting: boolean
  // Team level
  canViewTeamTranscription: boolean
  canViewTeamPV: boolean
  canViewTeamBehaviorAnalytics: boolean // Personal behavior analytics at team level
  canViewTeamOthersBehavior: boolean // Others' behavior analytics at team level
  // Department level
  canViewDeptTranscription: boolean
  canViewDeptPV: boolean
  canViewDeptBehaviorAnalytics: boolean // Personal behavior analytics at dept level
  canViewDeptOthersBehavior: boolean // Others' behavior analytics at dept level
}
