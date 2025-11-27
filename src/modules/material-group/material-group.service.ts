import MaterialGroup from './material-group.model';
import { IMaterialGroup } from './material-group.interface';
import Material from '../material/material.model';

class MaterialGroupService {
  async getAllGroups(): Promise<IMaterialGroup[]> {
    return MaterialGroup.find().lean();
  }

  async getGroupById(id: string): Promise<IMaterialGroup | null> {
    return MaterialGroup.findById(id).populate('materials').lean();
  }

  async createGroup(data: Partial<IMaterialGroup>): Promise<IMaterialGroup> {
    const group = new MaterialGroup(data as any);
    const saved = await group.save();

    // If materials were provided, add this group's id to those materials' `groups` array
    try {
      const matIds = (data.materials || []) as string[];
      if (matIds.length) {
        await Material.updateMany({ _id: { $in: matIds } }, { $addToSet: { groups: saved._id } });
      }
    } catch (e) {
      console.warn('Failed to sync materials for created group', e);
    }

    return saved;
  }

  async updateGroup(id: string, data: Partial<IMaterialGroup>): Promise<IMaterialGroup | null> {
    const existing = await MaterialGroup.findById(id);
    if (!existing) return null;

    const oldMaterials = (existing.materials || []).map(String);
    const newMaterials = (data.materials || []) as string[];

    // assign other fields
    if (typeof data.name === 'string') existing.name = data.name;
    if (typeof data.heName === 'string') existing.heName = data.heName;
    existing.materials = newMaterials as any;

    const updated = await existing.save();

    try {
      // compute toAdd and toRemove
      const toAdd = newMaterials.filter((m) => !oldMaterials.includes(String(m)));
      const toRemove = oldMaterials.filter((m) => !newMaterials.includes(String(m)));

      if (toAdd.length) {
        await Material.updateMany({ _id: { $in: toAdd } }, { $addToSet: { groups: updated._id } });
      }
      if (toRemove.length) {
        await Material.updateMany({ _id: { $in: toRemove } }, { $pull: { groups: updated._id } });
      }
    } catch (e) {
      console.warn('Failed to sync materials for updated group', e);
    }

    return updated;
  }

  // helper: remove group id from all materials (used on delete)
  async deleteGroup(id: string): Promise<void> {
    await MaterialGroup.findByIdAndDelete(id);
    // Remove this group id from any materials that referenced it
    try {
      await Material.updateMany({ groups: id }, { $pull: { groups: id } });
    } catch (e) {
      console.warn('Failed to remove group reference from materials', e);
    }
  }
}

export default new MaterialGroupService();
