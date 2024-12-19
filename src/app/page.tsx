import TaskBoard from '@/app/components/taskManager/TaskBoard'
import { getTasks } from '@/app/actions'
import { getOrCreateDBUser } from './actions'

export default async function Home() {
  const user = await getOrCreateDBUser()
  if (!user) return null
  
  const initialTasks = await getTasks(user.id)
  
  return (
    <main className="h-screen p-4">
      <TaskBoard initialTasks={initialTasks} userId={user.id} />
    </main>
  )
}