import { closestCorners, DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, isBefore, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import {
  AlertCircle, ArrowDownUp, ArrowRight, CalendarDays, Check, CheckCheck, Circle, CircleDashed,
  ClipboardList, Columns3, LayoutDashboard, ListFilter, LogOut, Moon, MoreHorizontal, Plus,
  Search, Settings2, Sun, Trash2, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { useForm } from 'react-hook-form'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../lib/api'
import { useAuth } from '../lib/auth-context'

const statusNames = { todo: 'To do', in_progress: 'In progress', done: 'Done' }
const priorityNames = { high: 'High', medium: 'Medium', low: 'Low' }
const statusOrder = ['todo', 'in_progress', 'done']
const taskSchema = z.object({
  title: z.string().trim().min(3, 'Add a more descriptive title').max(180),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().optional(),
  category: z.string().optional(),
})

function useTasks(params = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => (await api.get('/tasks/', { params })).data,
  })
}

function useTaskActions() {
  const client = useQueryClient()
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['tasks'] })
    client.invalidateQueries({ queryKey: ['stats'] })
  }
  const create = useMutation({ mutationFn: (task) => api.post('/tasks/', task), onSuccess: refresh })
  const update = useMutation({ mutationFn: ({ id, ...task }) => api.patch(`/tasks/${id}/`, task), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id) => api.delete(`/tasks/${id}/`), onSuccess: refresh })
  return { create, update, remove }
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const heading = location.pathname === '/tasks' ? 'My tasks' : location.pathname === '/board' ? 'Board' : location.pathname === '/profile' ? 'Profile' : 'Overview'

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand-lockup" to="/"><span className="brand-mark"><Check size={17} strokeWidth={3} /></span><span>momentum</span></Link>
        <div className="workspace-label">WORKSPACE <button className="icon-button tiny" aria-label="Workspace options"><MoreHorizontal size={17} /></button></div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavLink end to="/"><LayoutDashboard size={18} /> Overview</NavLink>
          <NavLink to="/tasks"><ClipboardList size={18} /> My tasks</NavLink>
          <NavLink to="/board"><Columns3 size={18} /> Board</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/profile"><Settings2 size={18} /> Profile & settings</NavLink>
          <div className="sidebar-user">
            <span className="avatar">{user?.username?.slice(0, 1).toUpperCase()}</span>
            <div className="user-ident"><strong>{user?.username}</strong><span>Personal workspace</span></div>
            <button className="icon-button" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-separator">/</span><strong>{heading}</strong></div>
          <div className="top-actions"><button className="icon-button" onClick={() => setDark(!dark)} title={`Switch to ${dark ? 'light' : 'dark'} mode`} aria-label="Toggle color theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><span className="top-avatar">{user?.username?.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <div className="content-area"><Outlet /></div>
      </main>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>
}

function QueryError({ message = 'Could not load your tasks.' }) {
  return <div className="error-state"><AlertCircle size={20} /><span>{message} Check that the API is running and try again.</span></div>
}

function LoadingRows() {
  return <div className="loading-list" aria-label="Loading"><i /><i /><i /></div>
}

function TaskDialog({ task, onClose, onSave, busy }) {
  const [selectedDate, setSelectedDate] = useState(task?.due_date ? parseISO(task.due_date) : undefined)
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const queryClient = useQueryClient()
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories/')).data,
  })
  const categoryMutation = useMutation({
    mutationFn: (name) => api.post('/categories/', { name }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setValue('category', String(data.id), { shouldDirty: true })
      setCategoryName('')
      setAddingCategory(false)
      toast.success('Category created')
    },
    onError: () => toast.error('Could not create the category'),
  })
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: task?.title || '', description: task?.description || '', status: task?.status || 'todo', priority: task?.priority || 'medium', due_date: task?.due_date || '', category: task?.category ? String(task.category) : '' },
  })

  function chooseDate(date) {
    setSelectedDate(date)
    setValue('due_date', date ? format(date, 'yyyy-MM-dd') : '', { shouldDirty: true })
  }

  async function createCategory() {
    const name = categoryName.trim()
    if (name) await categoryMutation.mutateAsync(name)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.form className="task-dialog" onSubmit={handleSubmit(onSave)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="dialog-heading"><div><p className="eyebrow">Task details</p><h2>{task ? 'Edit task' : 'Create a task'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <label className="field"><span>Title</span><input autoFocus placeholder="What needs to get done?" {...register('title')} />{errors.title && <small>{errors.title.message}</small>}</label>
        <label className="field"><span>Description <em>Optional</em></span><textarea rows="3" placeholder="Add a few details…" {...register('description')} /></label>
        <div className="field-pair">
          <label className="field"><span>Status</span><select {...register('status')}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
          <label className="field"><span>Priority</span><select {...register('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </div>
        <div className="field"><div className="field-label"><label htmlFor="task-category">Category <em>Optional</em></label><button className="category-add" type="button" onClick={() => setAddingCategory(!addingCategory)}>{addingCategory ? 'Cancel' : '+ New category'}</button></div><select id="task-category" {...register('category')}><option value="">No category</option>{(categoriesQuery.data || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        {addingCategory && <div className="category-create"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={60} placeholder="Category name" aria-label="New category name" /><button className="button button-secondary" type="button" disabled={!categoryName.trim() || categoryMutation.isPending} onClick={createCategory}>{categoryMutation.isPending ? 'Adding…' : 'Add'}</button></div>}
        <div className="field date-field"><span>Due date <em>Optional</em></span><input type="hidden" {...register('due_date')} /><DayPicker mode="single" selected={selectedDate} onSelect={chooseDate} /></div>
        <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button></div>
      </motion.form>
    </div>
  )
}

function PriorityTag({ priority }) {
  return <span className={`priority-tag priority-${priority}`}><i />{priorityNames[priority]}</span>
}

function DueDate({ value, status }) {
  const [today] = useState(() => new Date().setHours(0, 0, 0, 0))
  if (!value) return null
  const date = parseISO(value)
  const late = status !== 'done' && isBefore(date, today)
  return <span className={`due-date${late ? ' due-late' : ''}`}><CalendarDays size={14} />{format(date, 'MMM d')}{late && <b>Overdue</b>}</span>
}

function TaskRow({ task, onEdit, onDelete, onToggle }) {
  return (
    <article className={`task-row${task.status === 'done' ? ' task-complete' : ''}`}>
      <button className="complete-button" onClick={() => onToggle(task)} aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark complete'}>{task.status === 'done' ? <CheckCheck size={19} /> : <Circle size={19} />}</button>
      <div className="task-main"><button className="task-title" onClick={() => onEdit(task)}>{task.title}</button>{task.description && <p>{task.description}</p>}{task.category_name && <span className="category-chip">{task.category_name}</span>}</div>
      <span className={`status-label status-${task.status}`}>{statusNames[task.status]}</span>
      <PriorityTag priority={task.priority} />
      <DueDate value={task.due_date} status={task.status} />
      <button className="icon-button row-delete" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={16} /></button>
    </article>
  )
}

export function TasksPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [due, setDue] = useState('')
  const [ordering, setOrdering] = useState('due_date')
  const [dialog, setDialog] = useState(null)
  const tasksQuery = useTasks({ ...(search && { search }), ...(status && { status }), ...(priority && { priority }), ...(due && { due }), ordering })
  const { create, update, remove } = useTaskActions()
  const busy = create.isPending || update.isPending

  async function save(values) {
    try {
      const data = { ...values, due_date: values.due_date || null, category: values.category || null }
      if (dialog?.id) await update.mutateAsync({ id: dialog.id, ...data })
      else await create.mutateAsync(data)
      toast.success(dialog?.id ? 'Task updated' : 'Task created')
      setDialog(null)
    } catch { toast.error('Could not save the task') }
  }

  function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return
    remove.mutate(task.id, { onSuccess: () => toast.success('Task deleted'), onError: () => toast.error('Could not delete the task') })
  }

  function toggleTask(task) {
    update.mutate({ id: task.id, status: task.status === 'done' ? 'todo' : 'done' }, { onError: () => toast.error('Could not update the task') })
  }

  return (
    <motion.section className="page-stack" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeading eyebrow="YOUR WORK, AT A GLANCE" title="My tasks" description="A focused list of everything on your plate." action={<button className="button button-primary" onClick={() => setDialog({})}><Plus size={17} /> New task</button>} />
      <div className="task-toolbar">
        <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></label>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All status</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select>
        <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select aria-label="Filter by due date" value={due} onChange={(event) => setDue(event.target.value)}><option value="">Any due date</option><option value="today">Due today</option><option value="overdue">Overdue</option><option value="this_week">This week</option></select>
        <button className="icon-button sort-button" onClick={() => setOrdering(ordering === 'due_date' ? '-created_at' : 'due_date')} title="Change sort order" aria-label="Change sort order"><ArrowDownUp size={17} /></button>
      </div>
      <div className="task-list">
        <div className="list-heading"><span>TASK</span><span>STATUS</span><span>PRIORITY</span><span>DUE DATE</span><span /></div>
        {tasksQuery.isPending ? <LoadingRows /> : tasksQuery.isError ? <QueryError /> : tasksQuery.data.length ? tasksQuery.data.map((task) => <TaskRow key={task.id} task={task} onEdit={setDialog} onDelete={deleteTask} onToggle={toggleTask} />) : <div className="empty-state"><span className="empty-icon"><ListFilter size={21} /></span><h3>{search || status || priority || due ? 'No matching tasks' : 'A clean slate'}</h3><p>{search || status || priority || due ? 'Adjust a filter or try a different search.' : 'Create your first task and give it a place to land.'}</p>{!search && !status && !priority && !due && <button className="button button-secondary" onClick={() => setDialog({})}><Plus size={16} /> Create task</button>}</div>}
      </div>
      {dialog && <TaskDialog key={dialog.id || 'new'} task={dialog.id ? dialog : null} onClose={() => setDialog(null)} onSave={save} busy={busy} />}
    </motion.section>
  )
}

function BoardCard({ task, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } })
  return <article ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }} className={`board-card${isDragging ? ' dragging' : ''}`} {...listeners} {...attributes} onDoubleClick={() => onEdit(task)}>
    <div className="board-card-top"><PriorityTag priority={task.priority} /><button className="icon-button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><MoreHorizontal size={17} /></button></div>
    <h3>{task.title}</h3>{task.description && <p>{task.description}</p>}
    <div className="board-card-bottom"><DueDate value={task.due_date} status={task.status} /><span className="drag-hint">Open to edit</span></div>
  </article>
}

function BoardLane({ status, tasks, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const LaneIcon = status === 'todo' ? CircleDashed : status === 'in_progress' ? Circle : CheckCheck
  return <section className={`board-lane${isOver ? ' lane-over' : ''}`} ref={setNodeRef}>
    <header className="lane-heading"><div><LaneIcon size={17} className={`lane-icon lane-${status}`} /><h2>{statusNames[status]}</h2><span className="lane-count">{tasks.length}</span></div><button className="icon-button" title={`Add ${statusNames[status].toLowerCase()} task`} aria-label="Add task" onClick={() => onEdit({ status })}><Plus size={17} /></button></header>
    <div className="lane-cards">{tasks.length ? tasks.map((task) => <BoardCard key={task.id} task={task} onEdit={onEdit} />) : <div className="lane-empty">Drop tasks here</div>}</div>
  </section>
}

export function BoardPage() {
  const query = useTasks()
  const { create, update } = useTaskActions()
  const [dialog, setDialog] = useState(null)
  const [activeTask, setActiveTask] = useState(null)

  async function save(values) {
    const data = { ...values, due_date: values.due_date || null, category: values.category || null }
    try {
      if (dialog?.id) await update.mutateAsync({ id: dialog.id, ...data })
      else await create.mutateAsync(data)
      toast.success('Task saved')
      setDialog(null)
    } catch { toast.error('Could not save the task') }
  }

  function dragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return
    const task = active.data.current?.task
    if (task && statusOrder.includes(over.id) && task.status !== over.id) {
      update.mutate({ id: task.id, status: over.id }, { onError: () => toast.error('Could not move the task') })
    }
  }

  return <motion.section className="page-stack" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow="MOVE WORK FORWARD" title="Board" description="Drag a task into the next stage as work progresses." action={<button className="button button-primary" onClick={() => setDialog({})}><Plus size={17} /> New task</button>} />
    {query.isPending ? <LoadingRows /> : query.isError ? <QueryError /> : <DndContext collisionDetection={closestCorners} onDragStart={({ active }) => setActiveTask(active.data.current?.task)} onDragEnd={dragEnd}>
      <div className="board-grid">{statusOrder.map((status) => <BoardLane key={status} status={status} tasks={query.data.filter((task) => task.status === status)} onEdit={setDialog} />)}</div>
      {activeTask && <div className="drag-overlay"><BoardCard task={activeTask} onEdit={() => {}} /></div>}
    </DndContext>}
    {dialog && <TaskDialog key={dialog.id || `new-${dialog.status || 'todo'}`} task={dialog.id ? dialog : null} onClose={() => setDialog(null)} onSave={save} busy={create.isPending || update.isPending} />}
  </motion.section>
}

export function DashboardPage() {
  const [today] = useState(() => new Date())
  const tasksQuery = useTasks({ ordering: 'due_date' })
  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get('/tasks/stats/')).data })
  const [dialog, setDialog] = useState(false)
  const { create } = useTaskActions()
  const stats = statsQuery.data || { total: 0, completed: 0, pending: 0, by_priority: {}, by_status: {} }
  const priorityData = ['high', 'medium', 'low'].map((key) => ({ name: priorityNames[key], count: stats.by_priority?.[key] || 0, key }))
  const completionData = [{ name: 'Completed', value: stats.completed }, { name: 'In progress', value: stats.pending }]
  const dueSoon = (tasksQuery.data || []).filter((task) => task.status !== 'done').slice(0, 5)

  async function save(values) {
    try {
      await create.mutateAsync({ ...values, due_date: values.due_date || null, category: values.category || null })
      toast.success('Task created')
      setDialog(false)
    } catch { toast.error('Could not save the task') }
  }

  return <motion.section className="page-stack" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow={format(today, 'EEEE, MMMM d').toUpperCase()} title="Overview" description="Small steps add up. Here’s where things stand." action={<button className="button button-primary" onClick={() => setDialog(true)}><Plus size={17} /> New task</button>} />
    {(tasksQuery.isError || statsQuery.isError) ? <QueryError /> : <>
      <div className="metric-grid">
        <article className="metric"><span className="metric-label">Total tasks</span><strong>{stats.total}</strong><span className="metric-note"><ClipboardList size={15} /> Across your workspace</span></article>
        <article className="metric"><span className="metric-label">Completed</span><strong>{stats.completed}</strong><span className="metric-note positive"><Check size={15} /> {stats.total ? Math.round(stats.completed / stats.total * 100) : 0}% of all tasks</span></article>
        <article className="metric"><span className="metric-label">Still in motion</span><strong>{stats.pending}</strong><span className="metric-note"><CircleDashed size={15} /> Ready for your focus</span></article>
        <article className="metric metric-accent"><span className="metric-label">High priority</span><strong>{stats.by_priority?.high || 0}</strong><span className="metric-note"><ArrowRight size={15} /> Keep these in view</span></article>
      </div>
      <div className="chart-grid">
        <section className="surface chart-panel"><div className="panel-heading"><div><h2>Completion</h2><p>Completed vs. pending work</p></div><span className="chart-total">{stats.total} total</span></div>
          <div className="completion-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={completionData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={91} paddingAngle={3} stroke="none"><Cell fill="#4f46e5" /><Cell fill="#22d3ee" /></Pie><Tooltip /></PieChart></ResponsiveContainer><div className="chart-center"><strong>{stats.total ? Math.round(stats.completed / stats.total * 100) : 0}%</strong><span>complete</span></div></div>
          <div className="chart-legend"><span><i className="legend-indigo" />Completed <b>{stats.completed}</b></span><span><i className="legend-cyan" />Pending <b>{stats.pending}</b></span></div>
        </section>
        <section className="surface chart-panel priority-panel"><div className="panel-heading"><div><h2>By priority</h2><p>Where your attention is going</p></div></div>
          <div className="priority-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} /><Tooltip cursor={{ fill: 'var(--surface-hover)' }} /><Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={38}>{priorityData.map((entry) => <Cell key={entry.key} fill={entry.key === 'high' ? '#ef4444' : entry.key === 'medium' ? '#f59e0b' : '#10b981'} />)}</Bar></BarChart></ResponsiveContainer></div>
        </section>
      </div>
      <section className="surface upcoming-panel"><div className="panel-heading"><div><h2>Up next</h2><p>Open tasks in due-date order</p></div><Link to="/tasks" className="text-link">All tasks <ArrowRight size={15} /></Link></div>
        {tasksQuery.isPending ? <LoadingRows /> : dueSoon.length ? <div className="upcoming-list">{dueSoon.map((task) => <div className="upcoming-row" key={task.id}><span className="upcoming-dot" /><div className="upcoming-title"><strong>{task.title}</strong><span>{task.due_date ? `Due ${format(parseISO(task.due_date), 'MMM d')}` : 'No due date'}</span></div><PriorityTag priority={task.priority} /><span className={`status-label status-${task.status}`}>{statusNames[task.status]}</span></div>)}</div> : <div className="empty-inline">{tasksQuery.data?.length ? 'You’re all caught up.' : 'Create your first task to get started.'}</div>}
      </section>
    </>}
    {dialog && <TaskDialog onClose={() => setDialog(false)} onSave={save} busy={create.isPending} />}
  </motion.section>
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  return <motion.section className="page-stack" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Manage your personal workspace preferences." />
    <section className="surface profile-panel"><div className="profile-avatar">{user?.username?.slice(0, 1).toUpperCase()}</div><div className="profile-details"><h2>{user?.username}</h2><p>{user?.email || 'No email added'}</p><span className="profile-badge">Personal workspace</span></div></section>
    <section className="surface settings-row"><div><h2>Appearance</h2><p>Switch between light and dark themes using the control in the top bar.</p></div><span className="settings-indicator"><Sun size={16} /> Theme follows your choice</span></section>
    <button className="button button-danger logout-button" onClick={logout}><LogOut size={16} /> Sign out</button>
  </motion.section>
}