import { TaskGroup } from './task-group.model';
import { ITaskGroup } from './task-group.interface';

export class TaskGroupService {
  async getAll(): Promise<ITaskGroup[]> {
    // Populate both usedMaterials and producedMaterials
    return TaskGroup.find().populate('tasks.usedMaterials.material').populate('tasks.producedMaterials.material');
  }

  async getById(id: string): Promise<ITaskGroup | null> {
    return TaskGroup.findById(id).populate('tasks.usedMaterials.material').populate('tasks.producedMaterials.material');
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
