import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdmin } from '../../hooks/useAdminStore'
import { useI18n } from '../../../../i18n/useI18n'
import { Button } from '../ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/Card'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Badge } from '../ui/Badge'
import { Checkbox } from '../ui/Checkbox'
import { Switch } from '../ui/Switch'
import { ScrollArea } from '../ui/ScrollArea'
import { Separator } from '../ui/Separator'
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ChevronDown,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react'
import { User, UserPermissions } from '../../types'
export function UsersSection() {
  const {
    users,
    teams,
    departments,
    projects,
    permissions,
    addUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    updatePermissions,
    isLoading,
  } = useAdmin()
  const { t } = useI18n()
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [localPerms, setLocalPerms] = useState<UserPermissions | null>(null)
  const [formData, setFormData] = useState<{
    firstName: string
    lastName: string
    email: string
    roles: string[]
    teamId: string
    projectIds: string[]
  }>({
    firstName: '',
    lastName: '',
    email: '',
    roles: ['ROLE_USER'],
    teamId: '',
    projectIds: [],
  })
  useEffect(() => {
    if (expandedUserId) {
      const userPerms = permissions.find((p) => p.userId === expandedUserId)
      if (userPerms) {
        setLocalPerms({
          ...userPerms,
        })
      }
    } else {
      setLocalPerms(null)
    }
  }, [expandedUserId, permissions])
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: [...user.roles],
        teamId: user.teamId || '',
        projectIds: [...user.projectIds],
      })
    } else {
      setEditingUser(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        roles: ['ROLE_USER'],
        teamId: '',
        projectIds: [],
      })
    }
    setIsDialogOpen(true)
  }
  const toggleProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter((id) => id !== projectId)
        : [...prev.projectIds, projectId],
    }))
  }
  const handleSubmit = () => {
    if (!formData.firstName.trim() || !formData.email.trim() || !formData.teamId)
      return
    const userPayload = {
      ...formData,
      isActive: editingUser ? editingUser.isActive : true,
      permissions: editingUser ? editingUser.permissions : [],
    }

    if (editingUser) {
      updateUser(editingUser.id, userPayload)
    } else {
      addUser(userPayload)
    }
    setIsDialogOpen(false)
  }
  const toggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId)
  }
  const togglePerm = (key: keyof UserPermissions) => {
    if (localPerms) {
      setLocalPerms({
        ...localPerms,
        [key]: !localPerms[key],
      })
    }
  }
  const handleSavePerms = async () => {
    if (expandedUserId && localPerms) {
      setIsSaving(true)
      try {
        await updatePermissions(expandedUserId, localPerms)
      } finally {
        setIsSaving(false)
      }
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t('admin.users.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('admin.users.description')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.users.createUser')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground italic">{t('admin.users.loadingUsers')}</p>
        </div>
      ) : (
        <div className="space-y-3">
        {users.map((user) => {
          const team = teams.find((t) => t.id === user.teamId)
          const dept = team
            ? departments.find((d) => d.id === team.departmentId)
            : null
          const isExpanded = expandedUserId === user.id
          return (
            <div
              key={user.id}
              className="border border-primary/20 rounded-lg bg-card overflow-hidden"
            >
              {/* User Row */}
              <div
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${isExpanded ? 'bg-muted/30 border-b' : ''}`}
                onClick={() => toggleExpand(user.id)}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {(user.firstName?.[0] || '')}{(user.lastName?.[0] || '')}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 items-center">
                  <div>
                    <p className={`font-medium text-sm truncate ${!user.isActive ? 'text-muted-foreground' : ''}`}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">Rôles</p>
                    <p className="text-sm truncate">{(user.roles || []).join(', ')}</p>
                  </div>
                  <div className="hidden md:block">
                    {team ? (
                      <Badge variant="secondary" className="text-xs">
                        {team.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1">
                    {(user.projectIds || []).slice(0, 2).map((pId) => {
                      const proj = projects.find((p) => p.id === pId)
                      return proj ? (
                        <Badge key={pId} variant="outline" className="text-xs">
                          {proj.name}
                        </Badge>
                      ) : null
                    })}
                    {(user.projectIds || []).length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{(user.projectIds || []).length - 2}
                      </Badge>
                    )}
                    {(user.projectIds || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div 
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      size="sm"
                      checked={user.isActive}
                      onCheckedChange={(checked) => toggleUserActive(user.id, checked)}
                    />
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenDialog(user)
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteUser(user.id)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  </div>
                </div>
              </div>

              {/* Permissions Panel */}
              <AnimatePresence>
                {isExpanded && localPerms && (
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      height: 'auto',
                      opacity: 1,
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.25,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 md:p-6 bg-muted/10 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">
                            {t('admin.users.permissionsOf')} {user.firstName} {user.lastName}
                          </h4>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>
                            Équipe:{' '}
                            <strong className="text-foreground">
                              {team?.name || 'N/A'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Département:{' '}
                            <strong className="text-foreground">
                              {dept?.name || 'N/A'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Upload */}
                        <Card className="border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                              {t('admin.users.uploadMeeting')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between space-x-2">
                              <Label
                                htmlFor={`upload-${user.id}`}
                                className="flex flex-col space-y-1 cursor-pointer text-xs"
                              >
                                <span>{t('admin.users.uploadMeeting')}</span>
                                <span className="font-normal text-muted-foreground">
                                  {t('admin.users.uploadMeetingDesc')}
                                </span>
                              </Label>
                              <Switch
                                id={`upload-${user.id}`}
                                size="sm"
                                checked={localPerms.canUploadMeeting}
                                onCheckedChange={() =>
                                  togglePerm('canUploadMeeting')
                                }
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Team Level */}
                        <Card className="border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">
                              {t('admin.users.teamLevel')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {team?.name || 'N/A'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`tt-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.viewTranscription')}
                              </Label>
                              <Switch
                                id={`tt-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewTeamTranscription}
                                onCheckedChange={() =>
                                  togglePerm('canViewTeamTranscription')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`tp-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.viewPV')} (Procès-Verbal)
                              </Label>
                              <Switch
                                id={`tp-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewTeamPV}
                                onCheckedChange={() =>
                                  togglePerm('canViewTeamPV')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`tba-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.personalAnalytics')}
                              </Label>
                              <Switch
                                id={`tba-${user.id}`}
                                size="sm"
                                checked={
                                  localPerms.canViewTeamBehaviorAnalytics
                                }
                                onCheckedChange={() =>
                                  togglePerm('canViewTeamBehaviorAnalytics')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`tob-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.othersAnalytics')}
                              </Label>
                              <Switch
                                id={`tob-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewTeamOthersBehavior}
                                onCheckedChange={() =>
                                  togglePerm('canViewTeamOthersBehavior')
                                }
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Dept Level */}
                        <Card className="border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">
                              {t('admin.users.deptLevel')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {dept?.name || 'N/A'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`dt-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.viewTranscription')}
                              </Label>
                              <Switch
                                id={`dt-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewDeptTranscription}
                                onCheckedChange={() =>
                                  togglePerm('canViewDeptTranscription')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`dp-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.viewPV')} (Procès-Verbal)
                              </Label>
                              <Switch
                                id={`dp-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewDeptPV}
                                onCheckedChange={() =>
                                  togglePerm('canViewDeptPV')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`dba-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.personalAnalytics')}
                              </Label>
                              <Switch
                                id={`dba-${user.id}`}
                                size="sm"
                                checked={
                                  localPerms.canViewDeptBehaviorAnalytics
                                }
                                onCheckedChange={() =>
                                  togglePerm('canViewDeptBehaviorAnalytics')
                                }
                              />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`dob-${user.id}`}
                                className="cursor-pointer text-xs"
                              >
                                {t('admin.users.othersAnalytics')}
                              </Label>
                              <Switch
                                id={`dob-${user.id}`}
                                size="sm"
                                checked={localPerms.canViewDeptOthersBehavior}
                                onCheckedChange={() =>
                                  togglePerm('canViewDeptOthersBehavior')
                                }
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={handleSavePerms}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Save className="w-3.5 h-3.5 mr-2" />
                          )}
                          {isSaving ? t('admin.users.saving') : t('admin.users.savePermissions')}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {users.length === 0 && (
          <div className="border rounded-lg bg-card p-8 text-center text-muted-foreground">
            {t('admin.users.noUsersFound')}
          </div>
        )}
      </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t('admin.users.editUser') : t('admin.users.createUser')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('admin.users.firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('admin.users.lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('admin.users.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.users.roles')}</Label>
              <Input
                id="role"
                value={formData.roles.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean),
                  })
                }
                placeholder={t('admin.users.rolesPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">{t('admin.users.mainTeam')}</Label>
              <select
                value={formData.teamId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    teamId: e.target.value,
                  })
                }
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">{t('upload.selectTeam')}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.users.projectParticipation')}</Label>
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div key={proj.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`proj-${proj.id}`}
                        checked={formData.projectIds.includes(proj.id)}
                        onCheckedChange={() => toggleProject(proj.id)}
                      />
                      <Label
                        htmlFor={`proj-${proj.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {proj.name}
                      </Label>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('admin.users.noProjectsAvailable')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.teamId}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
