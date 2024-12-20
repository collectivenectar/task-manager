import { redirect } from 'next/navigation'
import TaskBoard from '@/app/components/taskManager/board/TaskBoard'
import { getTasks, getOrCreateDBUser } from './actions'
import { ErrorBoundaryWrapper } from '@/app/components/common/ErrorBoundaryWrapper'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getOrCreateDBUser()
  if (!user) {
    redirect('/sign-in')
  }
  
  const initialTasks = await getTasks(user.id)
  
  return (
    <ErrorBoundaryWrapper>
      <TaskBoard initialTasks={initialTasks} userId={user.id} />
    </ErrorBoundaryWrapper>
  )
}