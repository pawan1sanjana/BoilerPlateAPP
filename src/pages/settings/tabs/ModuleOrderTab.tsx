import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  GripVertical, LayoutDashboard, Settings as SettingsIcon, UserCog, Loader2, RefreshCw, Save, Info, HelpCircle,
  User, Shield, Palette, DollarSign, Monitor, ImageIcon, FileText, Wrench, Lock, ShieldCheck, Mail, Globe2, ClipboardList, Database
} from 'lucide-react'
import { useModuleOrderStore } from '@/store/useModuleOrderStore'

// A static registry just for display names/icons in the settings UI
const MODULE_DISPLAY_INFO: Record<string, { name: string; icon: React.ReactNode }> = {
  'dashboard': { name: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  'administration': { name: 'Administration', icon: <SettingsIcon size={16} /> },
  'admin/accounts': { name: 'Accounts', icon: <UserCog size={16} /> },
  'admin/settings': { name: 'System Settings', icon: <SettingsIcon size={16} /> },
  'profile': { name: 'Profile Information', icon: <User size={16} /> },
  'security': { name: 'Security & Auth', icon: <Shield size={16} /> },
  'preferences': { name: 'Preferences', icon: <Palette size={16} /> },
  'currency': { name: 'Currency & SI Units', icon: <DollarSign size={16} /> },
  'sessions': { name: 'Active Sessions', icon: <Monitor size={16} /> },
  'branding': { name: 'App Branding', icon: <ImageIcon size={16} /> },
  'report_export': { name: 'Report Settings', icon: <FileText size={16} /> },
  'maintenance_mode': { name: 'Maintenance Mode', icon: <Wrench size={16} /> },
  'module_access': { name: 'Module Access', icon: <Lock size={16} /> },
  'security_policy': { name: 'Security Policy', icon: <ShieldCheck size={16} /> },
  'smtp': { name: 'Email / SMTP', icon: <Mail size={16} /> },
  'system_prefs': { name: 'Regional & Time', icon: <Globe2 size={16} /> },
  'audit_log': { name: 'Audit Log', icon: <ClipboardList size={16} /> },
  'backup': { name: 'Backup & Export', icon: <Database size={16} /> },
  'system_info': { name: 'System Info', icon: <Info size={16} /> },
  'module_order': { name: 'Module Order', icon: <RefreshCw size={16} /> }
}

interface SortableItemProps {
  id: string
  name: string
  icon: React.ReactNode
}

function SortableItem(props: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-lg mb-1.5 opacity-40"
      >
        <div className="w-4 h-4" />
        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800" />
        <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm mb-1.5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 cursor-grab active:cursor-grabbing focus:outline-none transition-colors p-1 -ml-1 rounded"
        type="button"
        aria-label={`Drag ${props.name}`}
      >
        <GripVertical size={16} />
      </button>
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors border border-slate-100 dark:border-slate-700">
        {props.icon}
      </div>
      <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{props.name}</span>
    </div>
  )
}

function OverlayItem(props: SortableItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg shadow-2xl mb-1.5 scale-[1.02] cursor-grabbing">
      <div className="text-blue-500 p-1 -ml-1">
        <GripVertical size={16} />
      </div>
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30">
        {props.icon}
      </div>
      <span className="font-bold text-sm text-slate-900 dark:text-white">{props.name}</span>
    </div>
  )
}

export default function ModuleOrderTab() {
  const { mainOrder, subOrders, settingsOrder, saveOrder, resetToDefault } = useModuleOrderStore()

  const [draftMainOrder, setDraftMainOrder] = useState<string[]>([])
  const [draftSubOrders, setDraftSubOrders] = useState<Record<string, string[]>>({})
  const [draftSettingsOrder, setDraftSettingsOrder] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Track active drag item across the different dnd contexts
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeContext, setActiveContext] = useState<string | null>(null)

  useEffect(() => {
    setDraftMainOrder(mainOrder)
    setDraftSubOrders(subOrders)
    setDraftSettingsOrder(settingsOrder || [])
  }, [mainOrder, subOrders, settingsOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (contextId: string, event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setActiveContext(contextId)
  }

  const handleDragEndMain = (event: DragEndEvent) => {
    setActiveId(null)
    setActiveContext(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      setDraftMainOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleDragEndSub = (mainKey: string, event: DragEndEvent) => {
    setActiveId(null)
    setActiveContext(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      setDraftSubOrders((prev) => {
        const items = prev[mainKey] || []
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return {
          ...prev,
          [mainKey]: arrayMove(items, oldIndex, newIndex)
        }
      })
    }
  }

  const handleDragEndSettings = (event: DragEndEvent) => {
    setActiveId(null)
    setActiveContext(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      setDraftSettingsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const success = await saveOrder(draftMainOrder, draftSubOrders, draftSettingsOrder)
    if (success) {
      toast.success('Module order saved successfully')
    } else {
      toast.error('Failed to save module order')
    }
    setIsSaving(false)
  }

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the module order to defaults?')) {
      setIsResetting(true)
      const success = await resetToDefault()
      if (success) {
        toast.success('Module order reset to defaults')
      } else {
        toast.error('Failed to reset module order')
      }
      setIsResetting(false)
    }
  }

  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  }

  const activeItemInfo = activeId ? (MODULE_DISPLAY_INFO[activeId] || { name: activeId, icon: null }) : null

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Help Guide */}
      <div className="mb-4">
        <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10 text-slate-700 dark:text-slate-300 text-xs shadow-sm">
          <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-sm flex items-center gap-2">
            <HelpCircle size={16} className="text-blue-500" /> How to configure Module Order
          </h4>
          <ol className="list-decimal list-inside space-y-2 mb-3 text-sm">
            <li className="pl-1 leading-relaxed">Grab the vertical grip icon on the left of any module.</li>
            <li className="pl-1 leading-relaxed">Drag and drop the module up or down to change its position.</li>
            <li className="pl-1 leading-relaxed">Click "Save Module Order" to instantly apply changes to the sidebar.</li>
          </ol>
          <div className="bg-blue-100/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 rounded-xl p-3 flex gap-2.5">
            <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
              <span className="font-bold">Pro Tip: </span> Sub-modules can only be reordered within their parent main module section.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
          <LayoutDashboard size={14} /> Main Navigation Level
        </h4>
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={(e) => handleDragStart('main', e)}
          onDragEnd={handleDragEndMain}
        >
          <SortableContext items={draftMainOrder} strategy={verticalListSortingStrategy}>
            {draftMainOrder.map((key) => {
              const info = MODULE_DISPLAY_INFO[key] || { name: key, icon: null }
              return <SortableItem key={key} id={key} name={info.name} icon={info.icon} />
            })}
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeContext === 'main' && activeItemInfo ? (
              <OverlayItem id={activeId!} name={activeItemInfo.name} icon={activeItemInfo.icon} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {draftMainOrder.map((mainKey) => {
        const subs = draftSubOrders[mainKey]
        if (!subs || subs.length === 0) return null

        const mainInfo = MODULE_DISPLAY_INFO[mainKey] || { name: mainKey }

        return (
          <div key={`sub-${mainKey}`} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 pl-10 border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50" />
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2 relative z-10">
              <SettingsIcon size={14} /> Nested Items: {mainInfo.name}
            </h4>
            <div className="relative z-10">
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={(e) => handleDragStart(`sub-${mainKey}`, e)}
                onDragEnd={(e) => handleDragEndSub(mainKey, e)}
              >
                <SortableContext items={subs} strategy={verticalListSortingStrategy}>
                  {subs.map((subKey) => {
                    const info = MODULE_DISPLAY_INFO[subKey] || { name: subKey, icon: null }
                    return <SortableItem key={subKey} id={subKey} name={info.name} icon={info.icon} />
                  })}
                </SortableContext>
                <DragOverlay dropAnimation={dropAnimationConfig}>
                  {activeContext === `sub-${mainKey}` && activeItemInfo ? (
                    <OverlayItem id={activeId!} name={activeItemInfo.name} icon={activeItemInfo.icon} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )
      })}

      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mt-8">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
          <SettingsIcon size={14} /> Settings Page Tabs
        </h4>
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={(e) => handleDragStart('settings', e)}
          onDragEnd={handleDragEndSettings}
        >
          <SortableContext items={draftSettingsOrder} strategy={verticalListSortingStrategy}>
            {draftSettingsOrder.map((key) => {
              const info = MODULE_DISPLAY_INFO[key] || { name: key, icon: null }
              return <SortableItem key={key} id={key} name={info.name} icon={info.icon} />
            })}
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeContext === 'settings' && activeItemInfo ? (
              <OverlayItem id={activeId!} name={activeItemInfo.name} icon={activeItemInfo.icon} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleReset}
          disabled={isResetting || isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 active:scale-95"
        >
          {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || isResetting}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 active:scale-95"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Module Order
        </button>
      </div>
    </div>
  )
}
