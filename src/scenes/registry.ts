import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { CameraPath } from '@/camera/types'
import { awakeningPath } from './awakening/path'
import { creationPath } from './creation/path'
import { nafsPath } from './nafs/path'
import { timePath } from './time/path'
import { stillnessPath } from './stillness/path'
import { returnPath } from './return/path'

export interface SceneProps {
  /** false while pre-mounted behind a threshold: hidden, drivers paused */
  active: boolean
}

export interface SceneEntry {
  Component: LazyExoticComponent<ComponentType<SceneProps>>
  path: CameraPath
}

/**
 * Chapter id → scene implementation + camera data.
 * Adding a chapter = adding a folder in /scenes and one entry here.
 */
export const SCENES: Record<string, SceneEntry> = {
  awakening: {
    Component: lazy(() => import('./awakening/AwakeningScene')),
    path: awakeningPath,
  },
  creation: {
    Component: lazy(() => import('./creation/CreationScene')),
    path: creationPath,
  },
  nafs: {
    Component: lazy(() => import('./nafs/NafsScene')),
    path: nafsPath,
  },
  time: {
    Component: lazy(() => import('./time/TimeScene')),
    path: timePath,
  },
  stillness: {
    Component: lazy(() => import('./stillness/StillnessScene')),
    path: stillnessPath,
  },
  return: {
    Component: lazy(() => import('./return/ReturnScene')),
    path: returnPath,
  },
}
