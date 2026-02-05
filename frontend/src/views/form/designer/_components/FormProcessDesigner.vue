<template>
  <div class="process-designer" data-testid="process-designer-root">
    <div class="process-toolbar">
      <a-space>
        <a-button type="primary" :loading="saving" data-testid="btn-bpmn-save" @click="handleSave">保存草稿</a-button>
        <a-button :loading="publishing" data-testid="btn-bpmn-publish" @click="handlePublish">发布部署</a-button>
        <a-button @click="handleReload">重新加载</a-button>
      </a-space>
      <a-space class="process-meta" size="large">
        <span>表单Key: {{ formKey }}</span>
        <span>状态: {{ status || '-' }}</span>
        <span>流程Key: {{ procDefKey || processKey || '-' }}</span>
        <span>版本: {{ version ?? '-' }}</span>
      </a-space>
    </div>

    <a-alert v-if="errorMessage" type="error" show-icon class="mb-3" data-testid="process-load-error">
      <template #message>{{ errorMessage }}</template>
      <template #action>
        <a-button size="small" data-testid="btn-bpmn-retry" @click="handleReload">重试</a-button>
      </template>
    </a-alert>
    <a-alert
      v-if="draftMissing"
      type="info"
      show-icon
      message="未找到流程草稿，已加载默认模板，可继续编辑或插入审批节点。"
      class="mb-3"
    />

    <div class="process-body">
      <div ref="canvasRef" class="process-canvas" data-testid="form-bpmn-canvas"></div>
      <div class="process-side-panel" data-testid="task-rule-panel">
        <div class="task-rule-title">节点字段权限</div>
        <a-alert v-if="!userTasks.length" type="info" show-icon message="未发现用户任务节点" class="mb-3" />
        <a-button
          v-if="draftMissing || !userTasks.length"
          type="primary"
          size="small"
          data-testid="btn-insert-sample-usertask"
          @click="insertSampleUserTask"
        >
          插入示例审批节点
        </a-button>
        <div v-else class="task-rule-section">
          <div class="task-rule-section-title">选择用户任务</div>
          <div class="task-rule-task-list" data-testid="task-rule-task-list">
            <div
              v-for="(task, index) in userTasks"
              :key="task.id"
              class="task-rule-task-item"
              :data-testid="`task-rule-task-${index}`"
            >
              <a-button
                size="small"
                :type="task.id === selectedTaskId ? 'primary' : 'default'"
                @click="selectTask(task)"
              >
                {{ task.name || task.id }}
              </a-button>
            </div>
          </div>
        </div>

        <div v-if="selectedTaskId" class="task-rule-section">
          <div class="task-rule-section-title">字段权限配置</div>
          <div class="task-rule-selected">当前节点：{{ selectedTaskName || selectedTaskId }}</div>
          <a-button
            type="primary"
            size="small"
            :loading="savingRule"
            :disabled="!canSaveRule"
            data-testid="btn-task-rule-save"
            class="task-rule-save"
            @click="saveRule"
          >
            保存字段权限
          </a-button>

          <a-alert
            v-if="!fieldOptions.length"
            type="warning"
            show-icon
            message="未找到字段，请先保存表单设计"
            class="mb-3"
          />
          <div v-else class="task-rule-grid" data-testid="task-rule-field-grid">
            <div class="task-rule-row task-rule-header">
              <span>字段</span>
              <span>可见</span>
              <span>可编辑</span>
              <span>必填</span>
            </div>
            <div
              v-for="(field, index) in fieldOptions"
              :key="field.value"
              class="task-rule-row"
              :data-testid="`task-rule-row-${index}`"
            >
              <div class="task-rule-field">{{ field.label }}</div>
              <a-checkbox
                :checked="visibleFieldSet.has(field.value)"
                :data-testid="`task-rule-visible-${index}`"
                @change="toggleRule('visible', field.value, $event.target.checked)"
              />
              <a-checkbox
                :checked="editableFieldSet.has(field.value)"
                :data-testid="`task-rule-editable-${index}`"
                @change="toggleRule('editable', field.value, $event.target.checked)"
              />
              <a-checkbox
                :checked="requiredFieldSet.has(field.value)"
                :data-testid="`task-rule-required-${index}`"
                @change="toggleRule('required', field.value, $event.target.checked)"
              />
            </div>
          </div>
        </div>
        <a-alert
          v-else
          type="warning"
          show-icon
          message="请选择一个用户任务节点以配置字段权限"
          class="mb-3"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { message } from 'ant-design-vue';
  import BpmnModeler from 'bpmn-js/lib/Modeler';
  import { getFormBpmn, publishFormBpmn, saveFormBpmn } from '/@/api/form/bpmn';
  import { listTaskFieldRuleByProc, upsertTaskFieldRule } from '/@/api/bpm/flowable';
  import { getLatestSchema } from '/@/views/form/designer/designer.api';
  import 'bpmn-js/dist/assets/diagram-js.css';
  import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

  const props = defineProps<{ formKey: string }>();

  const canvasRef = ref<HTMLDivElement | null>(null);
  const modelerRef = ref<any>(null);
  const resizeObserver = ref<ResizeObserver | null>(null);
  const saving = ref(false);
  const publishing = ref(false);
  const status = ref('');
  const procDefKey = ref('');
  const version = ref<number | null>(null);
  const errorMessage = ref('');
  const draftMissing = ref(false);

  const processKey = ref('');
  const selectedTaskId = ref('');
  const selectedTaskName = ref('');
  const userTasks = ref<{ id: string; name: string; element: any }[]>([]);
  const fieldOptions = ref<{ label: string; value: string }[]>([]);
  const visibleFields = ref<string[]>([]);
  const editableFields = ref<string[]>([]);
  const requiredFields = ref<string[]>([]);
  const savingRule = ref(false);
  const ruleMap = ref<Record<string, any>>({});

  const visibleFieldSet = computed(() => new Set(visibleFields.value || []));
  const editableFieldSet = computed(() => new Set(editableFields.value || []));
  const requiredFieldSet = computed(() => new Set(requiredFields.value || []));

  const canSaveRule = computed(() => !!selectedTaskId.value && !!processKey.value && !!props.formKey && !savingRule.value);

  const buildDefaultXml = (key: string) => {
    const processId = `FORM_PROCESS_${key || 'DEFAULT'}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://tritium/flowable">
  <process id="${processId}" name="表单流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始" />
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <userTask id="UserTask_1" name="审批" />
    <sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" name="结束" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="260" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="412" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="120" />
        <di:waypoint x="412" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
  };

  let paletteRegistered = false;

  const registerUserTaskPalette = () => {
    if (!modelerRef.value || paletteRegistered) return;
    try {
      const palette = modelerRef.value.get('palette');
      const create = modelerRef.value.get('create');
      const elementFactory = modelerRef.value.get('elementFactory');
      if (!palette || !create || !elementFactory) return;
      palette.registerProvider({
        getPaletteEntries: () => {
          const createUserTask = (event: any) => {
            const shape = elementFactory.createShape({ type: 'bpmn:UserTask' });
            create.start(event, shape);
          };
          return {
            'create.user-task': {
              group: 'activity',
              className: 'bpmn-icon-user-task',
              title: '创建审批节点',
              action: {
                dragstart: createUserTask,
                click: createUserTask,
              },
            },
          };
        },
      });
      paletteRegistered = true;
    } catch (err) {}
  };

  const resizeCanvas = () => {
    const canvas = modelerRef.value?.get?.('canvas');
    if (canvas?.resized) {
      canvas.resized();
    }
  };

  const attachPaletteTestIds = (attempt = 0) => {
    if (!canvasRef.value) return;
    const palette = canvasRef.value.querySelector('.djs-palette');
    if (palette && !palette.getAttribute('data-testid')) {
      palette.setAttribute('data-testid', 'bpmn-palette');
    }
    const entries = Array.from(canvasRef.value.querySelectorAll('.djs-palette [data-action]'));
    const userTaskEntry = entries.find((entry) => {
      const action = entry.getAttribute('data-action') || '';
      return /user[-_]?task/i.test(action);
    });
    if (userTaskEntry && !userTaskEntry.getAttribute('data-testid')) {
      userTaskEntry.setAttribute('data-testid', 'bpmn-palette-userTask');
    }
    if (!userTaskEntry && attempt < 5) {
      setTimeout(() => attachPaletteTestIds(attempt + 1), 200);
    }
  };

  const ensureModeler = () => {
    if (modelerRef.value || !canvasRef.value) return;
    modelerRef.value = new BpmnModeler({
      container: canvasRef.value,
    });
    bindSelectionEvents();
    registerUserTaskPalette();
    setTimeout(() => {
      resizeCanvas();
      attachPaletteTestIds();
    }, 120);
  };

  const resolveProcessKey = () => {
    if (!modelerRef.value) return '';
    const definitions = modelerRef.value.getDefinitions?.();
    const rootElements = definitions?.rootElements || [];
    const process = rootElements.find((el: any) => el.$type === 'bpmn:Process');
    if (process?.id) return process.id;
    const registry = modelerRef.value.get('elementRegistry');
    const all = registry?.getAll?.() || [];
    const processEl = all.find((el: any) => el.type === 'bpmn:Process');
    return processEl?.businessObject?.id || processEl?.id || '';
  };

  const isUserTask = (element: any) => {
    if (!element) return false;
    if (element.type === 'bpmn:UserTask') return true;
    if (element.businessObject?.$type === 'bpmn:UserTask') return true;
    if (element.businessObject?.$type === 'UserTask') return true;
    return false;
  };

  const refreshUserTasks = () => {
    if (!modelerRef.value) return;
    const registry = modelerRef.value.get('elementRegistry');
    const all = registry?.getAll?.() || [];
    const tasks = all.filter((el: any) => isUserTask(el));
    userTasks.value = tasks.map((el: any) => ({
      id: el.businessObject?.id || el.id,
      name: el.businessObject?.name || el.id,
      element: el,
    }));
    if (selectedTaskId.value && !userTasks.value.find((t) => t.id === selectedTaskId.value)) {
      clearSelectedTask();
    }
  };

  const clearSelectedTask = () => {
    selectedTaskId.value = '';
    selectedTaskName.value = '';
    visibleFields.value = [];
    editableFields.value = [];
    requiredFields.value = [];
  };

  const applyRuleForTask = (taskId: string) => {
    if (!taskId) {
      clearSelectedTask();
      return;
    }
    const rule = ruleMap.value?.[taskId];
    visibleFields.value = rule?.visibleFields ? [...rule.visibleFields] : [];
    editableFields.value = rule?.editableFields ? [...rule.editableFields] : [];
    requiredFields.value = rule?.requiredFields ? [...rule.requiredFields] : [];
    normalizeRule();
  };

  const selectTask = (task: { id: string; name: string; element: any }) => {
    selectedTaskId.value = task.id;
    selectedTaskName.value = task.name;
    applyRuleForTask(task.id);
    if (modelerRef.value) {
      const selection = modelerRef.value.get('selection');
      if (selection?.select && task.element) {
        selection.select(task.element);
      }
    }
  };

  const bindSelectionEvents = () => {
    if (!modelerRef.value) return;
    const eventBus = modelerRef.value.get('eventBus');
    if (!eventBus) return;
    eventBus.on('selection.changed', (event: any) => {
      const selection = event?.newSelection || [];
      const element = selection[0];
      if (!element || !isUserTask(element)) {
        return;
      }
      const id = element.businessObject?.id || element.id || '';
      const name = element.businessObject?.name || id;
      selectedTaskId.value = id;
      selectedTaskName.value = name;
      applyRuleForTask(id);
    });
  };

  const extractFieldOptions = (schema: Record<string, any>) => {
    const options: { label: string; value: string }[] = [];
    const visited = new Set<string>();
    const walk = (widgets: any[]) => {
      if (!Array.isArray(widgets)) return;
      widgets.forEach((widget) => {
        if (!widget || typeof widget !== 'object') return;
        const fieldKey =
          widget?.options?.name || widget?.options?.field || widget?.options?.model || widget?.field || widget?.name;
        const isFieldWidget = widget?.formItemFlag === true || !!fieldKey;
        if (isFieldWidget && fieldKey && !visited.has(fieldKey)) {
          visited.add(fieldKey);
          options.push({ label: widget?.options?.label || widget?.label || fieldKey, value: fieldKey });
        }
        const lists: any[][] = [];
        if (Array.isArray(widget?.widgetList)) lists.push(widget.widgetList);
        if (Array.isArray(widget?.children)) lists.push(widget.children);
        if (Array.isArray(widget?.tabs)) {
          widget.tabs.forEach((tab: any) => Array.isArray(tab?.widgetList) && lists.push(tab.widgetList));
        }
        if (Array.isArray(widget?.rows)) {
          widget.rows.forEach((row: any) => {
            if (Array.isArray(row?.cols)) {
              row.cols.forEach((col: any) => Array.isArray(col?.widgetList) && lists.push(col.widgetList));
            }
            if (Array.isArray(row?.columns)) {
              row.columns.forEach((col: any) => Array.isArray(col?.widgetList) && lists.push(col.widgetList));
            }
          });
        }
        if (Array.isArray(widget?.cols)) {
          widget.cols.forEach((col: any) => Array.isArray(col?.widgetList) && lists.push(col.widgetList));
        }
        lists.forEach((list) => walk(list));
      });
    };
    walk(schema?.widgetList || []);
    return options;
  };

  const loadSchemaFields = async () => {
    fieldOptions.value = [];
    if (!props.formKey) return;
    try {
      const res = await getLatestSchema({ formKey: props.formKey });
      if (!res?.schemaJson) return;
      const parsed = JSON.parse(res.schemaJson);
      fieldOptions.value = extractFieldOptions(parsed);
      if (selectedTaskId.value) {
        normalizeRule();
      }
    } catch (err: any) {
      message.warning('字段列表加载失败');
    }
  };

  const normalizeRule = () => {
    if (!fieldOptions.value.length) {
      return;
    }
    const validKeys = new Set(fieldOptions.value.map((item) => item.value));
    const visible = new Set(visibleFields.value.filter((key) => validKeys.has(key)));
    const editable = new Set(editableFields.value.filter((key) => validKeys.has(key)));
    const required = new Set(requiredFields.value.filter((key) => validKeys.has(key)));

    editable.forEach((key) => visible.add(key));
    required.forEach((key) => {
      editable.add(key);
      visible.add(key);
    });

    visibleFields.value = Array.from(visible);
    editableFields.value = Array.from(editable);
    requiredFields.value = Array.from(required);
  };

  const toggleRule = (type: 'visible' | 'editable' | 'required', key: string, checked: boolean) => {
    const visible = new Set(visibleFields.value);
    const editable = new Set(editableFields.value);
    const required = new Set(requiredFields.value);

    if (type === 'visible') {
      if (checked) {
        visible.add(key);
      } else {
        visible.delete(key);
        editable.delete(key);
        required.delete(key);
      }
    }

    if (type === 'editable') {
      if (checked) {
        editable.add(key);
        visible.add(key);
      } else {
        editable.delete(key);
        required.delete(key);
      }
    }

    if (type === 'required') {
      if (checked) {
        required.add(key);
        editable.add(key);
        visible.add(key);
      } else {
        required.delete(key);
      }
    }

    visibleFields.value = Array.from(visible);
    editableFields.value = Array.from(editable);
    requiredFields.value = Array.from(required);
  };

  const loadRulesByProc = async () => {
    if (!processKey.value) {
      ruleMap.value = {};
      return;
    }
    try {
      const res = await listTaskFieldRuleByProc({ procDefKey: processKey.value });
      const map: Record<string, any> = {};
      (res || []).forEach((item: any) => {
        if (item?.taskDefKey) {
          map[item.taskDefKey] = item;
        }
      });
      ruleMap.value = map;
      if (selectedTaskId.value) {
        applyRuleForTask(selectedTaskId.value);
      }
    } catch (err: any) {
      message.warning('规则加载失败');
    }
  };

  const saveRule = async () => {
    if (!canSaveRule.value) {
      message.warning('请先选择用户任务节点');
      return;
    }
    savingRule.value = true;
    try {
      await upsertTaskFieldRule({
        procDefKey: processKey.value,
        taskDefKey: selectedTaskId.value,
        formKey: props.formKey,
        visibleFields: visibleFields.value,
        editableFields: editableFields.value,
        requiredFields: requiredFields.value,
      });
      ruleMap.value = {
        ...ruleMap.value,
        [selectedTaskId.value]: {
          procDefKey: processKey.value,
          taskDefKey: selectedTaskId.value,
          formKey: props.formKey,
          visibleFields: visibleFields.value,
          editableFields: editableFields.value,
          requiredFields: requiredFields.value,
        },
      };
      message.success('字段权限已保存');
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    } finally {
      savingRule.value = false;
    }
  };

  const refreshProcessMeta = () => {
    const resolvedKey = resolveProcessKey();
    processKey.value = resolvedKey || (props.formKey ? `FORM_PROCESS_${props.formKey}` : '');
    refreshUserTasks();
    loadRulesByProc();
  };

  const insertSampleUserTask = async () => {
    if (!modelerRef.value) {
      message.warning('流程设计器未就绪');
      return;
    }
    try {
      const modeling = modelerRef.value.get('modeling');
      const elementFactory = modelerRef.value.get('elementFactory');
      const canvas = modelerRef.value.get('canvas');
      const registry = modelerRef.value.get('elementRegistry');
      const rootElement = canvas?.getRootElement?.();
      if (!modeling || !elementFactory || !rootElement) {
        message.error('无法插入节点，请稍后重试');
        return;
      }
      const allElements = registry?.getAll?.() || [];
      const participant = allElements.find((el: any) => el.type === 'bpmn:Participant');
      const parent = participant || rootElement;
      const taskId = `TR_TASK_${Date.now()}`;
      const businessObject = elementFactory.create('bpmn:UserTask', {
        id: taskId,
        name: '审批节点',
      });
      const shape = elementFactory.createShape({
        type: 'bpmn:UserTask',
        businessObject,
      });
      modeling.createShape(shape, { x: 360, y: 200 }, parent);
      await new Promise((resolve) => setTimeout(resolve, 120));
      refreshProcessMeta();
      await nextTick();
      if (!userTasks.value.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        refreshProcessMeta();
        await nextTick();
      }
      const newTask = { id: taskId, name: '审批节点', element: shape };
      if (!userTasks.value.find((item) => item.id === taskId)) {
        userTasks.value = [newTask, ...userTasks.value];
      }
      if (!userTasks.value.length) {
        try {
          await importXml(buildDefaultXml(props.formKey));
          refreshProcessMeta();
          await nextTick();
        } catch (err) {}
      }
      const fallbackTask = userTasks.value[0] || newTask;
      selectTask(fallbackTask);
      await handleSave();
      message.success('已插入示例审批节点');
    } catch (err: any) {
      const fallbackTask = {
        id: `TR_TASK_${Date.now()}`,
        name: '审批节点',
        element: null,
      };
      if (!userTasks.value.length) {
        userTasks.value = [fallbackTask];
      }
      if (userTasks.value.length) {
        selectTask(userTasks.value[0]);
      }
      message.error(err?.message || '插入节点失败');
    }
  };

  const importXml = async (xml: string) => {
    if (!modelerRef.value) return;
    try {
      await modelerRef.value.importXML(xml);
      refreshProcessMeta();
      resizeCanvas();
      attachPaletteTestIds();
    } catch (err: any) {
      throw new Error(err?.message || 'BPMN XML 导入失败');
    }
  };

  const resolveErrorCode = (err: any) => {
    const status = err?.response?.status || err?.status || err?.code;
    if (status) return status;
    const msg = String(err?.message || '');
    const match = msg.match(/\b\d{3}\b/);
    return match ? match[0] : '';
  };

  const isNotFoundError = (err: any) => {
    const status = resolveErrorCode(err);
    if (status === 404 || status === '404') return true;
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('bpmn not found') || msg.includes('not found') || msg.includes('404');
  };

  const formatLoadError = (err: any) => {
    const code = resolveErrorCode(err);
    if (code) {
      return `流程草稿加载失败（错误码：${code}）`;
    }
    return err?.message || '流程草稿加载失败';
  };

  const isNoDiagramError = (err: any) => {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('no diagram to display');
  };

  const loadFromServer = async () => {
    if (!props.formKey) {
      throw new Error('formKey 缺失');
    }
    try {
      const res = await getFormBpmn({ formKey: props.formKey });
      if (res?.bpmnXml) {
        status.value = res.status || 'draft';
        procDefKey.value = res.procDefKey || '';
        version.value = res.version ?? null;
        return res.bpmnXml;
      }
      draftMissing.value = true;
      status.value = 'draft';
      procDefKey.value = '';
      version.value = null;
      return '';
    } catch (err: any) {
      if (isNotFoundError(err)) {
        draftMissing.value = true;
        status.value = 'draft';
        procDefKey.value = '';
        version.value = null;
        return '';
      }
      throw err;
    }
  };

  const handleReload = async () => {
    errorMessage.value = '';
    draftMissing.value = false;
    ensureModeler();
    try {
      const xml = await loadFromServer();
      await importXml(xml || buildDefaultXml(props.formKey));
      if (!xml && draftMissing.value) {
        message.info('未找到草稿，已加载默认模板');
      }
    } catch (err: any) {
      if (isNoDiagramError(err)) {
        errorMessage.value = '';
        draftMissing.value = true;
        await importXml(buildDefaultXml(props.formKey)).catch(() => {});
        message.warning('草稿缺少流程图，已加载默认模板');
        return;
      }
      errorMessage.value = formatLoadError(err);
      message.error(errorMessage.value);
      await importXml(buildDefaultXml(props.formKey)).catch(() => {});
    }
  };

  const fetchXml = async () => {
    if (!modelerRef.value) {
      throw new Error('流程设计器未就绪');
    }
    try {
      const { xml } = await modelerRef.value.saveXML({ format: true });
      return xml as string;
    } catch (err: any) {
      throw new Error(err?.message || '保存 XML 失败');
    }
  };

  const handleSave = async () => {
    saving.value = true;
    try {
      const xml = await fetchXml();
      const res = await saveFormBpmn({ formKey: props.formKey, bpmnXml: xml });
      status.value = res?.status || 'draft';
      message.success('流程草稿已保存');
    } catch (err: any) {
      message.error(err?.message || '保存失败');
    } finally {
      saving.value = false;
    }
  };

  const handlePublish = async () => {
    publishing.value = true;
    try {
      await handleSave();
      const res = await publishFormBpmn({ formKey: props.formKey });
      status.value = 'published';
      procDefKey.value = res?.procDefKey || procDefKey.value;
      version.value = res?.version ?? version.value;
      message.success(`发布成功：${res?.procDefKey || ''} v${res?.version ?? ''}`);
    } catch (err: any) {
      message.error(err?.message || '发布失败');
    } finally {
      publishing.value = false;
    }
  };

  onMounted(() => {
    ensureModeler();
    if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver.value = new ResizeObserver(() => resizeCanvas());
      resizeObserver.value.observe(canvasRef.value);
    }
    handleReload();
    loadSchemaFields();
  });

  onBeforeUnmount(() => {
    resizeObserver.value?.disconnect?.();
    resizeObserver.value = null;
    if (modelerRef.value?.destroy) {
      modelerRef.value.destroy();
    }
    modelerRef.value = null;
  });

  watch(
    () => props.formKey,
    () => {
      status.value = '';
      procDefKey.value = '';
      version.value = null;
      clearSelectedTask();
      loadSchemaFields();
      handleReload();
    }
  );
</script>

<style scoped>
  .process-designer {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  }

  .process-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .process-meta {
    color: #6b7280;
    font-size: 12px;
  }

  .process-body {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }

  .process-canvas {
    flex: 1;
    min-height: 520px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fff;
    position: relative;
  }

  .process-canvas :deep(.djs-container) {
    pointer-events: auto;
  }

  .process-canvas :deep(.djs-palette) {
    z-index: 2;
  }

  .process-side-panel {
    width: 320px;
    min-width: 280px;
    max-width: 360px;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .task-rule-title {
    font-weight: 600;
    font-size: 14px;
  }

  .task-rule-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-rule-section-title {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
  }

  .task-rule-task-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-rule-task-item {
    display: inline-flex;
  }

  .task-rule-selected {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
  }

  .task-rule-save {
    align-self: flex-start;
  }

  .task-rule-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .task-rule-row {
    display: grid;
    grid-template-columns: 1fr 60px 60px 60px;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
  }

  .task-rule-header {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
  }

  .task-rule-field {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.85);
    word-break: break-all;
  }
</style>
