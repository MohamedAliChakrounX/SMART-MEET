import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdmin } from '../../hooks/useAdminStore'
import { useI18n } from '../../../../i18n/useI18n'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Badge } from '../ui/Badge'
import { Separator } from '../ui/Separator'
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
} from 'lucide-react'

type DialogType = 'department' | 'team' | 'project' | null

export function OrganisationSection() {
  const {
    departments,
    teams,
    projects,
    users,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addTeam,
    updateTeam,
    deleteTeam,
    addProject,
    updateProject,
    deleteProject,
    isLoading,
  } = useAdmin()
  const { t } = useI18n()

  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [parentId, setParentId] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentId: '',
    teamIds: [] as string[],
  })

  const handleOpenDialog = (type: DialogType, item?: any, deptId?: string, teamId?: string) => {
    setDialogType(type)
    setEditingItem(item || null)
    setParentId(deptId || teamId || '')
    setFormData({
      name: item?.name || '',
      description: item?.description || '',
      departmentId: deptId || item?.departmentId || '',
      teamIds: item?.teamIds || (teamId ? [teamId] : []),
    })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) return
    if (dialogType === 'department') {
      editingItem ? updateDepartment(editingItem.id, formData) : addDepartment(formData)
    } else if (dialogType === 'team') {
      editingItem ? updateTeam(editingItem.id, formData) : addTeam({ ...formData, departmentId: parentId || formData.departmentId })
    } else if (dialogType === 'project') {
      editingItem ? updateProject(editingItem.id, formData) : addProject({ ...formData, teamIds: parentId ? [parentId] : formData.teamIds })
    }
    setDialogType(null)
    setEditingItem(null)
  }

  const getTeamsForDept = (deptId: string) =>
    (teams || []).filter((t: any) => t.departmentId === deptId)

  const getProjectsForTeam = (teamId: string) =>
    (projects || []).filter((p: any) => Array.isArray(p.teamIds) ? p.teamIds.includes(teamId) : p.teamId === teamId)

  const getUsersForTeam = (teamId: string) =>
    (users || []).filter((u: any) => u.teamId === teamId)

  const dialogTitle = () => {
    if (dialogType === 'department') return editingItem ? t('admin.org.editDept') : t('admin.org.addDept')
    if (dialogType === 'team') return editingItem ? t('admin.org.editTeam') : t('admin.org.addTeam')
    if (dialogType === 'project') return editingItem ? t('admin.org.editProject') : t('admin.org.addProject')
    return ''
  }

  const fieldLabel = () => {
    if (dialogType === 'department') return t('admin.org.deptName')
    if (dialogType === 'team') return t('admin.org.teamName')
    return t('admin.org.projectName')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.org.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.org.description')}</p>
        </div>
        <Button
          onClick={() => handleOpenDialog('department')}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          {t('admin.org.addDept')}
        </Button>
      </div>

      {/* Department List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900 mr-3" />
          {t('common.loading')}
        </div>
      ) : (departments || []).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>{t('admin.org.noDeptsFound')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(departments || []).map((dept: any) => {
            const deptTeams = getTeamsForDept(dept.id)
            const deptTeamIds = deptTeams.map((t: any) => t.id)
            const deptProjects = (projects || []).filter((p: any) => {
              const pTeamIds = Array.isArray(p.teamIds) ? p.teamIds : (p.teamId ? [p.teamId] : [])
              return pTeamIds.some((id: string) => deptTeamIds.includes(id))
            })
            const deptUsers = (users || []).filter((u: any) => u.teamId && deptTeamIds.includes(u.teamId))
            const isExpanded = expandedDeptId === dept.id

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-primary/20 rounded-lg bg-card overflow-hidden"
              >
                {/* Department Row */}
                <div
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    isExpanded ? 'bg-muted/30 border-b' : ''
                  }`}
                  onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                >
                  {/* Left: icon + name + meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-primary/10 text-primary">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{dept.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {deptTeams.length} {deptTeams.length === 1 ? t('admin.org.teamsCount') : t('admin.org.teamsCountPlural')}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {deptProjects.length} projets
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {deptUsers.length} utilisateurs
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right: actions + chevron */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleOpenDialog('team', undefined, dept.id) }}
                      className="text-xs"
                    >
                      <Plus size={14} className="mr-1" />{t('admin.org.addTeam')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleOpenDialog('department', dept) }}
                      className="text-xs"
                    >
                      <Pencil size={14} className="mr-1" />Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); deleteDepartment(dept.id) }}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={14} className="mr-1" />Supprimer
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                  </div>
                </div>

                {/* Teams */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {deptTeams.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-gray-400 flex items-center gap-2">
                          <Users size={14} />
                          {t('admin.org.noTeams')}
                          <button
                            onClick={() => handleOpenDialog('team', undefined, dept.id)}
                            className="ml-1 text-blue-600 hover:underline"
                          >
                            {t('admin.org.createTeam')}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 md:p-5 bg-muted/10 space-y-3">
                          {deptTeams.map((team: any) => {
                            const teamProjects = getProjectsForTeam(team.id)
                            const teamUsers = getUsersForTeam(team.id)
                            const isTeamExpanded = expandedTeamId === team.id

                            return (
                              <div
                                key={team.id}
                                className="rounded-lg border border-primary/20 bg-card overflow-hidden"
                              >
                                {/* Team Row */}
                                <div
                                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                                    isTeamExpanded ? 'bg-muted/30 border-b' : ''
                                  }`}
                                  onClick={() => setExpandedTeamId(isTeamExpanded ? null : team.id)}
                                >
                                  {/* Left: icon + name + badges */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Users size={15} className="text-primary flex-shrink-0" />
                                    <span className="font-medium text-sm truncate">{team.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {teamProjects.length} {teamProjects.length === 1 ? 'projet' : 'projets'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {teamUsers.length} {teamUsers.length === 1 ? 'membre' : 'membres'}
                                    </Badge>
                                  </div>

                                  {/* Right: actions + chevron */}
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleOpenDialog('project', undefined, undefined, team.id) }}
                                      className="text-[11px] h-7 px-2"
                                    >
                                      <Plus size={12} className="mr-1" />{t('admin.org.addProject')}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleOpenDialog('team', team, dept.id) }}
                                      className="text-xs"
                                    >
                                      <Pencil size={13} className="mr-1" />Modifier
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); deleteTeam(team.id) }}
                                      className="text-xs text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 size={13} className="mr-1" />Supprimer
                                    </Button>
                                    <Separator orientation="vertical" className="h-4 mx-1" />
                                    {isTeamExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                                  </div>
                                </div>

                                {/* Projects + Users expanded */}
                                <AnimatePresence>
                                  {isTeamExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="divide-y"
                                    >
                                      {/* Projects */}
                                      <div className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-2.5">
                                          <Folder size={12} className="text-amber-500 flex-shrink-0" />
                                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {t('admin.org.associatedProjects')}
                                          </span>
                                          <div className="flex-1 h-px bg-border" />
                                          <Badge variant="secondary" className="text-[10px] font-medium">
                                            {teamProjects.length}
                                          </Badge>
                                        </div>
                                        {teamProjects.length === 0 ? (
                                          <p className="text-xs text-gray-400 pl-1">{t('admin.org.noProjects')}</p>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {teamProjects.map((proj: any) => (
                                              <div
                                                key={proj.id}
                                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/30 border border-primary/10 hover:border-primary/30 hover:bg-muted/50 transition-all group"
                                              >
                                                <Folder size={14} className="text-amber-500 flex-shrink-0" />
                                                <span className="text-xs font-medium flex-1 truncate">{proj.name}</span>
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog('project', proj, undefined, team.id)}
                                                    className="h-6 px-1.5 text-[10px]"
                                                  >
                                                    <Pencil size={11} className="mr-0.5" />Modifier
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteProject(proj.id)}
                                                    className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-600"
                                                  >
                                                    <Trash2 size={11} className="mr-0.5" />Supprimer
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Users */}
                                      <div className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-2.5">
                                          <Users size={12} className="text-primary flex-shrink-0" />
                                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Utilisateurs associés
                                          </span>
                                          <div className="flex-1 h-px bg-border" />
                                          <Badge variant="secondary" className="text-[10px] font-medium">
                                            {teamUsers.length}
                                          </Badge>
                                        </div>
                                        {teamUsers.length === 0 ? (
                                          <p className="text-xs text-muted-foreground pl-1">Aucun utilisateur dans cette équipe.</p>
                                        ) : (
                                          <div className="flex flex-wrap gap-2">
                                            {teamUsers.map((user: any) => (
                                              <span
                                                key={user.id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-primary/10 text-xs font-medium"
                                              >
                                                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center uppercase flex-shrink-0">
                                                  {(user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')}
                                                </span>
                                                {user.firstName} {user.lastName}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-name">{fieldLabel()}</Label>
              <Input
                id="item-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.org.placeholderName')}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-desc">{t('admin.org.descriptionLabel')}</Label>
              <Input
                id="item-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.org.placeholderDesc')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>{t('admin.org.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
