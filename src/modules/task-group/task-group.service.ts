import { TaskGroup } from './task-group.model';
import { ITaskGroup } from './task-group.interface';

export class TaskGroupService {
  async getAll(limit = 100, page = 1): Promise<ITaskGroup[]> {
    const capped = Math.max(1, Math.min(1000, Number(limit)));
    const p = Math.max(1, Number(page));
    const skip = (p - 1) * capped;
    // Populate both usedMaterials and producedMaterials but use lean and pagination
    return TaskGroup.find()
      .skip(skip)
      .limit(capped)
      .populate('tasks.usedMaterials.material')
      .populate('tasks.producedMaterials.material')
      .lean();
  }

  async getById(id: string): Promise<ITaskGroup | null> {
    return TaskGroup.findById(id)
      .populate('tasks.usedMaterials.material')
      .populate('tasks.producedMaterials.material')
      .lean();
  }

  async create(data: ITaskGroup): Promise<ITaskGroup> {
    const taskGroup = new TaskGroup(data);
    return taskGroup.save();
  }

  async update(id: string, data: Partial<ITaskGroup>): Promise<ITaskGroup | null> {
    return TaskGroup.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<void> {
    await TaskGroup.findByIdAndDelete(id);
  }
}
