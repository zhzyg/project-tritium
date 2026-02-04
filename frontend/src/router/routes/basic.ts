import type { AppRouteRecordRaw } from '/@/router/types';
import { t } from '/@/hooks/web/useI18n';
import { REDIRECT_NAME, LAYOUT, EXCEPTION_COMPONENT, PAGE_NOT_FOUND_NAME } from '/@/router/constant';

// 404 on a page
export const PAGE_NOT_FOUND_ROUTE: AppRouteRecordRaw = {
  path: '/:path(.*)*',
  name: PAGE_NOT_FOUND_NAME,
  component: LAYOUT,
  meta: {
    title: '异常页面',
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: '/:path(.*)*',
      name: PAGE_NOT_FOUND_NAME,
      component: EXCEPTION_COMPONENT,
      meta: {
        title: '异常页面',
        hideBreadcrumb: true,
        hideMenu: true,
      },
    },
  ],
};

export const REDIRECT_ROUTE: AppRouteRecordRaw = {
  path: '/redirect',
  component: LAYOUT,
  name: 'RedirectTo',
  meta: {
    title: REDIRECT_NAME,
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: '/redirect/:path(.*)',
      name: REDIRECT_NAME,
      component: () => import('/@/views/sys/redirect/index.vue'),
      meta: {
        title: REDIRECT_NAME,
        hideBreadcrumb: true,
      },
    },
  ],
};

export const ERROR_LOG_ROUTE: AppRouteRecordRaw = {
  path: '/error-log',
  name: 'ErrorLog',
  component: LAYOUT,
  redirect: '/error-log/list',
  meta: {
    title: '错误日志',
    hideBreadcrumb: true,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: 'list',
      name: 'ErrorLogList',
      component: () => import('/@/views/sys/error-log/index.vue'),
      meta: {
        title: t('routes.basic.errorLogList'),
        hideBreadcrumb: true,
        currentActiveMenu: '/error-log',
      },
    },
  ],
};

export const BPM_TASK_FORM_ROUTE: AppRouteRecordRaw = {
  path: '/bpm/task',
  name: 'BpmTaskFormRoot',
  component: LAYOUT,
  meta: {
    title: '任务表单',
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: ':taskId/form',
      name: 'BpmTaskForm',
      component: () => import('/@/views/bpm/task-form/index.vue'),
      meta: {
        title: '表单详情',
        hideBreadcrumb: true,
        hideMenu: true,
        currentActiveMenu: '/bpm/tasks',
      },
    },
  ],
};

export const BPM_INSTANCE_FORM_ROUTE: AppRouteRecordRaw = {
  path: '/bpm/instance',
  name: 'BpmInstanceFormRoot',
  component: LAYOUT,
  meta: {
    title: '流程表单',
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: ':procInsId/form',
      name: 'BpmInstanceForm',
      component: () => import('/@/views/bpm/task-form/index.vue'),
      meta: {
        title: '表单详情',
        hideBreadcrumb: true,
        hideMenu: true,
        currentActiveMenu: '/bpm/my',
      },
    },
  ],
};
