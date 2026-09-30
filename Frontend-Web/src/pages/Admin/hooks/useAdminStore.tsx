import React, { useState, createContext, useContext } from 'react'
import { Department, Team, Project, User, UserPermissions } from '../types'
import {
  initialDepartments,
  initialTeams,
  initialProjects,
} from '../data/seedData'
import { toast } from 'sonner'
import { useAdminApi } from './useAdminApi'
import { PERMISSION_MAP, BACKEND_TO_FRONTEND_MAP } from '../data/permissionMap'
import { useEffect, useCallback } from 'react'
interface AdminContextType {
  departments: Department[]
  teams: Team[]
  projects: Project[]
  users: User[]
  permissions: UserPermissions[]
  addDepartment: (dept: Omit<Department, 'id'>) => void
  updateDepartment: (id: string, dept: Partial<Department>) => void
  deleteDepartment: (id: string) => void
  addTeam: (team: Omit<Team, 'id'>) => void
  updateTeam: (id: string, team: Partial<Team>) => void
  deleteTeam: (id: string) => void
  addProject: (project: Omit<Project, 'id'>) => void
  updateProject: (id: string, project: Partial<Project>) => void
  deleteProject: (id: string) => void
  addUser: (user: Omit<User, 'id'>) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
  toggleUserActive: (id: string, isActive: boolean) => Promise<void>
  updatePermissions: (userId: string, perms: Partial<UserPermissions>) => Promise<void>
  isLoading: boolean
}
const AdminContext = createContext<AdminContextType | undefined>(undefined)
export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<UserPermissions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const adminApi = useAdminApi()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [fetchedUsers, fetchedDepts, fetchedTeams, fetchedProjects] = await Promise.all([
        adminApi.fetchUsers(),
        adminApi.fetchDepartments(),
        adminApi.fetchTeams(),
        adminApi.fetchProjects()
      ]);

      // Map Teams: extract departmentId from the nested department object
      const mappedTeams = fetchedTeams.map((t: any) => ({
        ...t,
        departmentId: t.department?.id || t.departmentId
      }));

      // Map Projects: extract teamIds from the nested teams collection
      const mappedProjects = fetchedProjects.map((p: any) => ({
        ...p,
        teamIds: p.teams ? p.teams.map((t: any) => t.id) : (p.teamIds || [])
      }));

      setUsers(fetchedUsers)
      setDepartments(fetchedDepts)
      setTeams(mappedTeams)
      setProjects(mappedProjects)
      
      // Map backend permissions to frontend structure
      const mappedPermissions = fetchedUsers.map(user => {
        const perms: UserPermissions = {
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
        }

        user.permissions.forEach(p => {
          const frontendKey = BACKEND_TO_FRONTEND_MAP[p]
          if (frontendKey) {
            perms[frontendKey] = true
          }
        })

        return perms
      })
      setPermissions(mappedPermissions)
    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }, [adminApi])

  useEffect(() => {
    loadData()
  }, [loadData])

  const generateId = () => Math.random().toString(36).substr(2, 9)
  // Departments
  // Departments
  const addDepartment = async (dept: Omit<Department, 'id'>) => {
    try {
      await adminApi.addDepartment(dept);
      loadData();
      toast.success('Département créé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }
  const updateDepartment = async (id: string, dept: Partial<Department>) => {
    try {
      await adminApi.updateDepartment(id, dept);
      loadData();
      toast.success('Département mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }
  const deleteDepartment = async (id: string) => {
    try {
      await adminApi.deleteDepartment(id);
      loadData();
      toast.success('Département supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }
  // Teams
  const addTeam = async (team: Omit<Team, 'id'>) => {
    try {
      await adminApi.addTeam(team);
      loadData();
      toast.success('Équipe créée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }
  const updateTeam = async (id: string, team: Partial<Team>) => {
    try {
      await adminApi.updateTeam(id, team);
      loadData();
      toast.success('Équipe mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }
  const deleteTeam = async (id: string) => {
    try {
      await adminApi.deleteTeam(id);
      loadData();
      toast.success('Équipe supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }
  // Projects
  const addProject = async (project: Omit<Project, 'id'>) => {
    try {
      await adminApi.addProject(project);
      loadData();
      toast.success('Projet créé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }
  const updateProject = async (id: string, project: Partial<Project>) => {
    try {
      await adminApi.updateProject(id, project);
      loadData();
      toast.success('Projet mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }
  const deleteProject = async (id: string) => {
    try {
      await adminApi.deleteProject(id);
      loadData();
      toast.success('Projet supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }
  // Users
  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      // Temporary password for new users
      const userData = { ...user, password: 'ChangeMe123!' };
      await adminApi.addUser(userData);
      loadData();
      toast.success('Utilisateur créé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }
  const updateUser = async (id: string, user: Partial<User>) => {
    try {
      await adminApi.updateUser(id, user);
      loadData();
      toast.success('Utilisateur mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }
  const deleteUser = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      loadData();
      toast.success('Utilisateur supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }
  const toggleUserActive = async (id: string, isActive: boolean) => {
    try {
      await adminApi.toggleActiveStatus(id, isActive)
      setUsers(users.map(u => u.id === id ? { ...u, isActive } : u))
      toast.success(isActive ? 'Compte activé' : 'Compte désactivé')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut')
      throw error
    }
  }
  // Permissions
  const updatePermissions = async (
    userId: string,
    perms: Partial<UserPermissions>,
  ) => {
    try {
      const currentUserPerms = permissions.find(p => p.userId === userId)
      if (!currentUserPerms) return

      const newPerms = { ...currentUserPerms, ...perms }
      
      // Map back to backend keys
      const backendKeys: string[] = Object.entries(PERMISSION_MAP)
        .filter(([front, back]) => newPerms[front as keyof UserPermissions])
        .map(([front, back]) => back)

      await adminApi.savePermissions(userId, backendKeys)

      setPermissions(
        permissions.map((p) =>
          p.userId === userId ? newPerms : p,
        ),
      )
      toast.success('Permissions sauvegardées')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde des permissions')
      throw error
    }
  }
  return (
    <AdminContext.Provider
      value={{
        departments,
        teams,
        projects,
        users,
        permissions,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addTeam,
        updateTeam,
        deleteTeam,
        addProject,
        updateProject,
        deleteProject,
        addUser,
        updateUser,
        deleteUser,
        toggleUserActive,
        updatePermissions,
        isLoading,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}
export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
