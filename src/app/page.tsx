import TaskBoard from '@/app/components/taskManager/board/TaskBoard'
import { getTasks } from '@/app/actions'
import { getOrCreateDBUser } from './actions'
import { ErrorBoundaryWrapper } from '@/app/components/common/ErrorBoundaryWrapper'

export default async function Home() {
  const user = await getOrCreateDBUser()
  if (!user) return null
  
  const initialTasks = await getTasks(user.id)
  
  return (
    <ErrorBoundaryWrapper>
      <TaskBoard initialTasks={initialTasks} userId={user.id} />
    </ErrorBoundaryWrapper>
  )
}