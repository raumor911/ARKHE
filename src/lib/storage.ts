import localforage from 'localforage';
import { Project } from '../types';

// ARKHÉ Storage Configuration
localforage.config({
  name: 'ARKHE_DB',
  storeName: 'projects',
  description: 'Persistence layer for ARKHÉ architectural technical files'
});

const ACTIVE_PROJECT_KEY = 'arkhe_active_id';

export const storageService = {
  /**
   * Saves or updates a project in the persistence layer.
   */
  async saveProject(project: Project): Promise<Project> {
    return await localforage.setItem(project.id, project);
  },

  /**
   * Retrieves a specific project by ID.
   */
  async getProject(id: string): Promise<Project | null> {
    return await localforage.getItem<Project>(id);
  },

  /**
   * Deletes a project from the storage.
   */
  async deleteProject(id: string): Promise<void> {
    await localforage.removeItem(id);
  },

  /**
   * Returns all stored projects, sorted by creation date.
   */
  async getAllProjects(): Promise<Project[]> {
    const projects: Project[] = [];
    await localforage.iterate<Project, void>((value) => {
      projects.push(value);
    });
    return projects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Persists the ID of the currently active project.
   */
  async saveActiveId(id: string | null): Promise<void> {
    if (id) {
      await localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      await localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  },

  /**
   * Retrieves the last active project ID.
   */
  getActiveId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  },

  /**
   * Exports the entire database as a downloadable JSON file.
   */
  async exportBackup(): Promise<string> {
    const data = await this.getAllProjects();
    return JSON.stringify(data, null, 2);
  },

  /**
   * Wipes all local data.
   */
  async clearAll(): Promise<void> {
    await localforage.clear();
    await localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
};
