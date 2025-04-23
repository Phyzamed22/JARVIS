import { TasksModule } from '@/components/dashboard/tasks-module';

export default function TasksPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Task Management</h1>
      <div className="grid gap-6">
        <TasksModule />
      </div>
    </div>
  );
}