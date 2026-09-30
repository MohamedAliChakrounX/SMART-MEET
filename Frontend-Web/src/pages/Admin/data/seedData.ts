import { Department, Team, Project, User, UserPermissions } from '../types'

export const initialDepartments: Department[] = [
  {
    id: 'd1',
    name: 'Technologie',
    description: 'Département technique et ingénierie',
  },
  {
    id: 'd2',
    name: 'Marketing',
    description: 'Département marketing et communication',
  },
]

export const initialTeams: Team[] = [
  {
    id: 't1',
    name: 'Développement',
    departmentId: 'd1',
    description: 'Équipe de développement logiciel',
  },
  {
    id: 't2',
    name: 'DevOps',
    departmentId: 'd1',
    description: "Équipe d'infrastructure et déploiement",
  },
  {
    id: 't3',
    name: 'Communication',
    departmentId: 'd2',
    description: 'Équipe de communication externe',
  },
]

export const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'Projet Alpha',
    description: "Refonte de l'application principale",
    teamIds: ['t1', 't2'],
  },
  {
    id: 'p2',
    name: 'Projet Beta',
    description: 'Campagne de lancement Q3',
    teamIds: ['t3', 't1'],
  },
]

export const initialUsers: User[] = [
  {
    id: 'u1',
    name: 'Alice Dupont',
    email: 'alice@example.com',
    role: 'Lead Developer',
    teamId: 't1',
    projectIds: ['p1', 'p2'],
  },
  {
    id: 'u2',
    name: 'Bob Martin',
    email: 'bob@example.com',
    role: 'DevOps Engineer',
    teamId: 't2',
    projectIds: ['p1'],
  },
  {
    id: 'u3',
    name: 'Charlie Durand',
    email: 'charlie@example.com',
    role: 'Chargé de Com',
    teamId: 't3',
    projectIds: ['p2'],
  },
  {
    id: 'u4',
    name: 'David Lefebvre',
    email: 'david@example.com',
    role: 'Développeur Junior',
    teamId: 't1',
    projectIds: [],
  },
]

export const initialPermissions: UserPermissions[] = initialUsers.map(
  (user) => ({
    userId: user.id,
    canUploadMeeting: false,
    canViewTeamTranscription: false,
    canViewTeamPV: false,
    canViewTeamBehaviorAnalytics: false,
    canViewTeamOthersBehavior: false,
    canViewDeptTranscription: false,
    canViewDeptPV: false,
    canViewDeptBehaviorAnalytics: false,
    canViewDeptOthersBehavior: false,
  }),
)
