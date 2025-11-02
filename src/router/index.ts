import { createRouter, createWebHistory } from 'vue-router'
import BookshelfView from '@/views/BookshelfView.vue'
import NewDiaryView from '@/views/NewDiaryView.vue'
import DiaryView from '@/views/DiaryView.vue'
import AddEntryView from '@/views/AddEntryView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'bookshelf',
      component: BookshelfView
    },
    {
      path: '/new-diary',
      name: 'new-diary',
      component: NewDiaryView
    },
    {
      path: '/diary/:id',
      name: 'diary',
      component: DiaryView
    },
    {
      path: '/diary/:id/add-entry',
      name: 'add-entry',
      component: AddEntryView
    },
    {
      path: '/diary/:id/entry/:date/edit',
      name: 'edit-entry',
      component: AddEntryView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ],
})

export default router
