# Data Model: Gestion des Permissions Utilisateurs Standards

**Feature**: 007-user-permissions-backend  
**Date**: 2026-05-01

## Entités existantes (inchangées)

### User
| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK, unique |
| email | string(180) | unique, non-null |
| password | string | non-null |
| firstName | string(100) | non-null |
| lastName | string(100) | non-null |
| roles | JSON array | non-null, défaut `[]` |
| isActive | boolean | non-null, défaut `true` |
| deletedAt | DateTimeImmutable | nullable (soft-delete) |
| createdAt | DateTimeImmutable | non-null |
| updatedAt | DateTimeImmutable | non-null |
| permissions | ManyToMany → Permission | via table `user_permission` |

> ✅ Aucune migration de schéma requise. La relation `User ↔ Permission` et la table `user_permission` existent déjà.

---

### Permission
| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK, unique |
| key | string(100) | unique, non-null |
| description | string(255) | nullable |

**Entrées attendues en base** (à insérer via `app:seed:permissions`) :

| key | description |
|-----|-------------|
| `meeting.upload` | Uploader un meeting (génère transcription, PV et analytics) |
| `team.transcript.read` | Voir les transcriptions de son équipe |
| `team.pv.read` | Voir les PV (Procès-Verbal) de son équipe |
| `team.analytics.self` | Voir ses propres analytics comportementales (équipe) |
| `team.analytics.others` | Voir les analytics des autres membres de son équipe |
| `dept.transcript.read` | Voir les transcriptions de son département |
| `dept.pv.read` | Voir les PV de son département |
| `dept.analytics.self` | Voir ses propres analytics (département) |
| `dept.analytics.others` | Voir les analytics des autres membres de son département |

---

## Vue frontend : `UserPermissions`

Mapping booléen utilisé par `UsersSection.tsx` → `useAdminStore` :

| Clé frontend | Clé backend |
|---|---|
| `canUploadMeeting` | `meeting.upload` |
| `canViewTeamTranscription` | `team.transcript.read` |
| `canViewTeamPV` | `team.pv.read` |
| `canViewTeamBehaviorAnalytics` | `team.analytics.self` |
| `canViewTeamOthersBehavior` | `team.analytics.others` |
| `canViewDeptTranscription` | `dept.transcript.read` |
| `canViewDeptPV` | `dept.pv.read` |
| `canViewDeptBehaviorAnalytics` | `dept.analytics.self` |
| `canViewDeptOthersBehavior` | `dept.analytics.others` |

---

## Transitions d'état

### isActive
```
INACTIVE (false) ──[admin active]──→ ACTIVE (true)
ACTIVE (true)    ──[admin désactive]──→ INACTIVE (false)
```
- Un utilisateur INACTIVE est bloqué à chaque requête API authentifiée (HTTP 401).
- Un utilisateur INACTIVE ne peut pas se connecter (HTTP 401 à la connexion).

### Permissions
```
[] (vide) ──[admin ajoute]──→ [clés activées]
[clés activées] ──[admin modifie]──→ [nouvelles clés] (replace all)
```
- Un nouvel utilisateur commence toujours avec `permissions = []`.
- La mise à jour remplace l'ensemble des permissions (pas de diff incrémental).
