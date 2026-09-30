import { useMemo } from 'react';
import api from '../../../services/api';
import { User, UserPermissions } from '../types';

export const useAdminApi = () => {
    return useMemo(() => ({
        fetchUsers: async (): Promise<User[]> => {
            const response = await api.get('/users');
            return response.data;
        },

        addUser: async (userData: any): Promise<any> => {
            const response = await api.post('/users', userData);
            return response.data;
        },

        updateUser: async (id: string, userData: any): Promise<any> => {
            const response = await api.put(`/users/${id}`, userData);
            return response.data;
        },

        deleteUser: async (id: string): Promise<void> => {
            await api.delete(`/users/${id}`);
        },

        savePermissions: async (userId: string, permissions: string[]): Promise<void> => {
            await api.patch(`/users/${userId}/permissions`, { permissions });
        },

        toggleActiveStatus: async (userId: string, isActive: boolean): Promise<void> => {
            await api.patch(`/users/${userId}/status`, { isActive });
        },

        // --- Organisation ---

        fetchDepartments: async (): Promise<any[]> => {
            const response = await api.get('/admin/organisation/departments');
            return response.data;
        },

        addDepartment: async (data: any): Promise<any> => {
            const response = await api.post('/admin/organisation/departments', data);
            return response.data;
        },

        updateDepartment: async (id: string, data: any): Promise<void> => {
            await api.put(`/admin/organisation/departments/${id}`, data);
        },

        deleteDepartment: async (id: string): Promise<void> => {
            await api.delete(`/admin/organisation/departments/${id}`);
        },

        fetchTeams: async (): Promise<any[]> => {
            const response = await api.get('/admin/organisation/teams');
            return response.data;
        },

        addTeam: async (data: any): Promise<any> => {
            const response = await api.post('/admin/organisation/teams', data);
            return response.data;
        },

        updateTeam: async (id: string, data: any): Promise<void> => {
            await api.put(`/admin/organisation/teams/${id}`, data);
        },

        deleteTeam: async (id: string): Promise<void> => {
            await api.delete(`/admin/organisation/teams/${id}`);
        },

        fetchProjects: async (): Promise<any[]> => {
            const response = await api.get('/admin/organisation/projects');
            return response.data;
        },

        addProject: async (data: any): Promise<any> => {
            const response = await api.post('/admin/organisation/projects', data);
            return response.data;
        },

        updateProject: async (id: string, data: any): Promise<void> => {
            await api.put(`/admin/organisation/projects/${id}`, data);
        },

        deleteProject: async (id: string): Promise<void> => {
            await api.delete(`/admin/organisation/projects/${id}`);
        },
    }), []);
};
